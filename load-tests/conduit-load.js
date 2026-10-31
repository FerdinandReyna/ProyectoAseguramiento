// Prueba de carga (E14) con k6 sobre el ambiente desplegado en cloud.
// Endpoints críticos: GET /api/articles (lectura pública) y POST /api/users/login (autenticación).
// Escenario: rampa de 0 a 50 usuarios virtuales en 1 minuto, 5 minutos sostenidos en 50 y bajada de 30 s.
// Uso: k6 run -e BASE_URL=https://tu-app.onrender.com load-tests/conduit-load.js
import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const SMOKE = __ENV.SMOKE === "1"; // corrida corta solo para validar el script

export const options = {
  stages: SMOKE
    ? [
        { duration: "10s", target: 10 },
        { duration: "20s", target: 10 },
      ]
    : [
        { duration: "1m", target: 50 },
        { duration: "5m", target: 50 },
        { duration: "30s", target: 0 },
      ],
  // Umbrales tomados de los requerimientos no funcionales del E1
  thresholds: {
    "http_req_duration{endpoint:articles}": ["p(95)<800"], // RNF-01
    "http_req_duration{endpoint:login}": ["p(95)<800"], // RNF-01
    http_req_failed: ["rate<0.01"], // RNF-02
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)"],
};

const headers = { "Content-Type": "application/json" };

export function setup() {
  // Crea un usuario propio de la prueba para no depender de datos existentes
  const id = Date.now().toString(36);
  const user = { username: `k6_${id}`, email: `k6_${id}@test.com`, password: "Clave1234" };
  const res = http.post(`${BASE_URL}/api/users`, JSON.stringify({ user }), { headers });
  check(res, { "usuario de prueba creado": (r) => r.status === 201 });
  return { email: user.email, password: user.password };
}

export default function (data) {
  group("Listado de artículos", () => {
    const res = http.get(`${BASE_URL}/api/articles?limit=20&offset=0`, {
      tags: { endpoint: "articles" },
    });
    check(res, {
      "articles: status 200": (r) => r.status === 200,
      "articles: trae arreglo": (r) => Array.isArray(r.json("articles")),
    });
  });

  sleep(1);

  group("Inicio de sesión", () => {
    const res = http.post(
      `${BASE_URL}/api/users/login`,
      JSON.stringify({ user: { email: data.email, password: data.password } }),
      { headers, tags: { endpoint: "login" } },
    );
    check(res, {
      "login: status 200": (r) => r.status === 200,
      "login: devuelve token": (r) => typeof r.json("user.token") === "string",
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  const fmt = (v) => (v === undefined ? "n/d" : v.toFixed(2));
  const line = (name, key) => {
    const t = m[key]?.values || {};
    return `${name}: promedio ${fmt(t.avg)} ms | p95 ${fmt(t["p(95)"])} ms | máx ${fmt(t.max)} ms`;
  };
  const text = [
    "Resumen de prueba de carga - Conduit",
    `URL: ${BASE_URL}`,
    line("GET /api/articles", "http_req_duration{endpoint:articles}"),
    line("POST /api/users/login", "http_req_duration{endpoint:login}"),
    line("Global", "http_req_duration"),
    `Throughput: ${fmt(m.http_reqs.values.rate)} solicitudes/s (total ${m.http_reqs.values.count})`,
    `Tasa de error: ${(m.http_req_failed.values.rate * 100).toFixed(2)} %`,
    `Usuarios virtuales máximos: ${m.vus_max.values.max}`,
  ].join("\n");
  return {
    stdout: text + "\n",
    "load-tests/results/summary.json": JSON.stringify(data, null, 2),
    "load-tests/results/summary.txt": text + "\n",
  };
}
