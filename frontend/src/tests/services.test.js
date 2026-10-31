// Pruebas unitarias de los servicios del frontend (autenticación, artículos, favoritos y seguimiento).
// Doble de prueba: mock de axios. Se aísla la red para verificar solo la lógica de cada servicio
// (método HTTP, URL, armado de encabezados y uso de localStorage) sin depender del backend.
import axios from "axios";
import userLogin from "../services/userLogin";
import userSignUp from "../services/userSignUp";
import userLogout from "../services/userLogout";
import toggleFav from "../services/toggleFav";
import toggleFollow from "../services/toggleFollow";
import setArticle from "../services/setArticle";
import getArticles from "../services/getArticles";
import deleteArticle from "../services/deleteArticle";

vi.mock("axios");

const headers = { Authorization: "Token abc" };
const apiError = (status, message) => ({ response: { status, data: { errors: { body: [message] } } } });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("Autenticación en el frontend", () => {
  it("userLogin arma el encabezado Token y guarda la sesión", async () => {
    axios.mockResolvedValue({ data: { user: { username: "fer", token: "t1" } } });

    const session = await userLogin({ email: "fer@test.com", password: "Clave1234" });

    expect(axios.mock.calls[0][0]).toMatchObject({ method: "POST", url: "api/users/login" });
    expect(session.headers).toEqual({ Authorization: "Token t1" });
    expect(JSON.parse(localStorage.getItem("loggedUser")).isAuth).toBe(true);
  });

  it("userLogin propaga el mensaje del backend ante credenciales inválidas", async () => {
    axios.mockRejectedValue(apiError(422, "Wrong email/password combination"));
    await expect(userLogin({ email: "a", password: "b" })).rejects.toBe("Wrong email/password combination");
    expect(localStorage.getItem("loggedUser")).toBeNull();
  });

  it("userSignUp envía usuario, correo y contraseña a api/users", async () => {
    axios.mockResolvedValue({ data: { user: { username: "fer", token: "t2" } } });
    await userSignUp({ username: "fer", email: "fer@test.com", password: "Clave1234" });
    expect(axios.mock.calls[0][0].data).toEqual({
      user: { username: "fer", email: "fer@test.com", password: "Clave1234" },
    });
  });

  it("userLogout borra la sesión guardada y devuelve el estado anónimo", () => {
    localStorage.setItem("loggedUser", "{}");
    const state = userLogout();
    expect(localStorage.getItem("loggedUser")).toBeNull();
    expect(state.isAuth).toBe(false);
  });
});

describe("Favoritos y seguimiento", () => {
  it("toggleFav usa POST cuando el artículo no es favorito", async () => {
    axios.mockResolvedValue({ data: { article: { favorited: true } } });
    await toggleFav({ slug: "mi-articulo", favorited: false, headers });
    expect(axios.mock.calls[0][0]).toMatchObject({ method: "POST", url: "api/articles/mi-articulo/favorite" });
  });

  it("toggleFav usa DELETE cuando el artículo ya es favorito", async () => {
    axios.mockResolvedValue({ data: { article: { favorited: false } } });
    const article = await toggleFav({ slug: "mi-articulo", favorited: true, headers });
    expect(axios.mock.calls[0][0].method).toBe("DELETE");
    expect(article.favorited).toBe(false);
  });

  it("toggleFollow alterna entre POST y DELETE según el estado", async () => {
    axios.mockResolvedValue({ data: { profile: {} } });
    await toggleFollow({ following: false, headers, username: "otro" });
    await toggleFollow({ following: true, headers, username: "otro" });
    expect(axios.mock.calls.map((c) => c[0].method)).toEqual(["POST", "DELETE"]);
  });
});

describe("Artículos", () => {
  it("setArticle crea con POST cuando no hay slug", async () => {
    axios.mockResolvedValue({ data: { article: { slug: "nuevo" } } });
    const slug = await setArticle({ title: "Nuevo", description: "d", body: "b", tagList: [], headers });
    expect(axios.mock.calls[0][0]).toMatchObject({ method: "POST", url: "api/articles" });
    expect(slug).toBe("nuevo");
  });

  it("setArticle edita con PUT cuando recibe slug", async () => {
    axios.mockResolvedValue({ data: { article: { slug: "editado" } } });
    await setArticle({ slug: "viejo", title: "Editado", headers });
    expect(axios.mock.calls[0][0]).toMatchObject({ method: "PUT", url: "api/articles/viejo" });
  });

  it.each([
    ["global", "api/articles?limit=3&&offset=0"],
    ["feed", "api/articles/feed?limit=3&&offset=0"],
    ["tag", "api/articles?tag=qa&&limit=3&&offset=0"],
    ["profile", "api/articles?author=fer&&limit=3&&offset=0"],
  ])("getArticles arma la URL correcta para el listado %s", async (location, url) => {
    axios.mockResolvedValue({ data: { articles: [] } });
    await getArticles({ location, tagName: "qa", username: "fer" });
    expect(axios.mock.calls[0][0].url).toBe(url);
  });

  it("deleteArticle propaga el 403 cuando el usuario no es el autor", async () => {
    axios.mockRejectedValue(apiError(403, "You are not the author of this article"));
    await expect(deleteArticle({ slug: "ajeno", headers })).rejects.toBe("You are not the author of this article");
  });
});
