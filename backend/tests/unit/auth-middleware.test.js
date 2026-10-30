// Pruebas unitarias del middleware de autenticación, manejo de errores y helpers de seguridad.
// Doble de prueba: stub de User.findOne para no consultar la base al validar el token.
const jwt = require("jsonwebtoken");
const { User } = require("../../models");
const verifyToken = require("../../middleware/authentication");
const errorHandler = require("../../middleware/errorHandler");
const { jwtSign, jwtVerify } = require("../../helper/jwt");
const { bcryptHash, bcryptCompare } = require("../../helper/bcrypt");
const errors = require("../../helper/customErrors");
const { fakeRes, fakeUser } = require("../fakes");

afterEach(() => vi.restoreAllMocks());

describe("Middleware de autenticación", () => {
  it("deja pasar como visitante si no hay encabezado Authorization", async () => {
    const req = { headers: {} };
    const next = vi.fn();
    await verifyToken(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.loggedUser).toBeUndefined();
  });

  it("rechaza un encabezado sin token", async () => {
    const next = vi.fn();
    await verifyToken({ headers: { authorization: "Token" } }, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(SyntaxError);
  });

  it("carga el usuario cuando el token es válido", async () => {
    const token = await jwtSign({ username: "fer", email: "fer@test.com" });
    vi.spyOn(User, "findOne").mockResolvedValue(fakeUser());
    const req = { headers: { authorization: `Token ${token}` } };
    const next = vi.fn();
    await verifyToken(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.loggedUser.dataValues.token).toBe(token);
  });

  it("llama a next una sola vez si el usuario del token ya no existe (defecto corregido)", async () => {
    const token = await jwtSign({ username: "x", email: "borrado@test.com" });
    vi.spyOn(User, "findOne").mockResolvedValue(null);
    const next = vi.fn();
    await verifyToken({ headers: { authorization: `Token ${token}` } }, {}, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0].name).toBe("NotFoundError");
  });
});

describe("Token JWT (RNF-05)", () => {
  it("incluye expiración de 24 horas como máximo", async () => {
    const token = await jwtSign({ username: "fer", email: "fer@test.com" });
    const { iat, exp } = jwt.decode(token);
    expect(exp - iat).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it("rechaza un token expirado", async () => {
    const expired = jwt.sign({ email: "fer@test.com", exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_KEY);
    await expect(jwtVerify(expired)).rejects.toThrow("jwt expired");
  });
});

describe("Cifrado de contraseñas (RNF-04)", () => {
  it("genera un hash bcrypt con costo 10 que valida la contraseña original", async () => {
    const hash = await bcryptHash("Clave1234");
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(await bcryptCompare("Clave1234", hash)).toBe(true);
    expect(await bcryptCompare("otra", hash)).toBe(false);
  });
});

describe("Manejador de errores", () => {
  const cases = [
    [new errors.UnauthorizedError(), 401],
    [new errors.ForbiddenError("article"), 403],
    [new errors.NotFoundError("Article"), 404],
    [new errors.FieldRequiredError("A title"), 422],
    [Object.assign(new Error("jwt expired"), { name: "TokenExpiredError" }), 401],
    [new Error("inesperado"), 500],
  ];

  test.each(cases)("%s se traduce a HTTP %i", (error, status) => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = fakeRes();
    errorHandler(error, {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json.mock.calls[0][0].errors.body[0]).toBe(error.message);
  });
});
