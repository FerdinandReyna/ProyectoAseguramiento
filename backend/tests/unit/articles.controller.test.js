// Pruebas unitarias del servicio de artículos y de su autorización (módulos críticos).
// Dobles de prueba: stubs de Article/User/Tag (Sequelize) y fakes de artículo y usuario.
const { Article, Tag, User } = require("../../models");
const {
  allArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  articlesFeed,
} = require("../../controllers/articles");
const { fakeRes, fakeUser, fakeArticle } = require("../fakes");

const articleBody = { title: "Prueba QA", description: "desc", body: "cuerpo", tagList: [] };

describe("Crear artículo", () => {
  afterEach(() => vi.restoreAllMocks());

  it("responde 401 sin sesión (RF-16)", async () => {
    const next = vi.fn();
    await createArticle({ body: { article: articleBody } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("UnauthorizedError");
  });

  it("rechaza un artículo sin título (RF-06)", async () => {
    const next = vi.fn();
    await createArticle(
      { loggedUser: fakeUser(), body: { article: { ...articleBody, title: "" } } },
      fakeRes(),
      next,
    );
    expect(next.mock.calls[0][0].message).toBe("A title is required");
  });

  it("rechaza 11 etiquetas (RF-06, valor límite)", async () => {
    const tagList = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    const next = vi.fn();
    await createArticle(
      { loggedUser: fakeUser(), body: { article: { ...articleBody, tagList } } },
      fakeRes(),
      next,
    );
    expect(next.mock.calls[0][0].name).toBe("ValidationError");
  });

  it("rechaza un título cuyo slug ya existe (RF-07)", async () => {
    vi.spyOn(Article, "findOne").mockResolvedValue({ id: 1 });
    const next = vi.fn();
    await createArticle({ loggedUser: fakeUser(), body: { article: articleBody } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("AlreadyTakenError");
  });

  it("crea el artículo con slug generado aunque no se envíen etiquetas (RF-06, RF-07)", async () => {
    vi.spyOn(Article, "findOne").mockResolvedValue(null);
    const create = vi.spyOn(Article, "create").mockResolvedValue(fakeArticle());
    const { tagList, ...sinEtiquetas } = articleBody;
    const res = fakeRes();
    const next = vi.fn();

    await createArticle({ loggedUser: fakeUser(), body: { article: sinEtiquetas } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(create.mock.calls[0][0].slug).toBe("prueba-qa");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("reutiliza una etiqueta existente en lugar de crear otra", async () => {
    const article = fakeArticle();
    vi.spyOn(Article, "findOne").mockResolvedValue(null);
    vi.spyOn(Article, "create").mockResolvedValue(article);
    vi.spyOn(Tag, "findByPk").mockResolvedValue({ name: "qa" });
    const createTag = vi.spyOn(Tag, "create");

    await createArticle(
      { loggedUser: fakeUser(), body: { article: { ...articleBody, tagList: ["qa"] } } },
      fakeRes(),
      vi.fn(),
    );

    expect(createTag).not.toHaveBeenCalled();
    expect(article.addTagList).toHaveBeenCalledOnce();
  });
});

describe("Editar y eliminar artículo (tabla de decisión RF-08)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("R2: responde 404 si el artículo no existe", async () => {
    vi.spyOn(Article, "findOne").mockResolvedValue(null);
    const next = vi.fn();
    await updateArticle(
      { loggedUser: fakeUser(), params: { slug: "no-existe" }, body: { article: {} } },
      fakeRes(),
      next,
    );
    expect(next.mock.calls[0][0].name).toBe("NotFoundError");
  });

  it("R3: responde 403 si quien edita no es el autor", async () => {
    vi.spyOn(Article, "findOne").mockResolvedValue(fakeArticle(1));
    const next = vi.fn();
    await updateArticle(
      { loggedUser: fakeUser({ id: 2 }), params: { slug: "mi-articulo" }, body: { article: { title: "x" } } },
      fakeRes(),
      next,
    );
    expect(next.mock.calls[0][0].name).toBe("ForbiddenError");
  });

  it("R4: el autor actualiza el título y se regenera el slug", async () => {
    const article = fakeArticle(1);
    vi.spyOn(Article, "findOne").mockResolvedValue(article);
    await updateArticle(
      { loggedUser: fakeUser({ id: 1 }), params: { slug: "mi-articulo" }, body: { article: { title: "Nuevo Titulo" } } },
      fakeRes(),
      vi.fn(),
    );
    expect(article.slug).toBe("nuevo-titulo");
    expect(article.save).toHaveBeenCalledOnce();
  });

  it("R3: otro usuario no puede eliminar el artículo y no se borra nada", async () => {
    const article = fakeArticle(1);
    vi.spyOn(Article, "findOne").mockResolvedValue(article);
    const next = vi.fn();
    await deleteArticle({ loggedUser: fakeUser({ id: 2 }), params: { slug: "mi-articulo" } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("ForbiddenError");
    expect(article.destroy).not.toHaveBeenCalled();
  });

  it("R4: el autor elimina su artículo", async () => {
    const article = fakeArticle(1);
    vi.spyOn(Article, "findOne").mockResolvedValue(article);
    const res = fakeRes();
    await deleteArticle({ loggedUser: fakeUser({ id: 1 }), params: { slug: "mi-articulo" } }, res, vi.fn());
    expect(article.destroy).toHaveBeenCalledOnce();
    expect(res.json.mock.calls[0][0].message.body[0]).toMatch(/deleted/);
  });
});

describe("Listado y feed de artículos", () => {
  afterEach(() => vi.restoreAllMocks());

  it("aplica el máximo de 100 artículos por página (RF-14, valor límite)", async () => {
    const find = vi.spyOn(Article, "findAndCountAll").mockResolvedValue({ rows: [], count: 0 });
    await allArticles({ query: { limit: "101" } }, fakeRes(), vi.fn());
    expect(find.mock.calls[0][0].limit).toBe(100);
  });

  it("usa 20 por defecto cuando el límite es 0 o inválido (RF-14)", async () => {
    const find = vi.spyOn(Article, "findAndCountAll").mockResolvedValue({ rows: [], count: 0 });
    await allArticles({ query: { limit: "0" } }, fakeRes(), vi.fn());
    expect(find.mock.calls[0][0].limit).toBe(20);
  });

  it("filtra por etiqueta y agrega tagList y favoritos a cada artículo (RF-15)", async () => {
    const article = fakeArticle();
    const find = vi.spyOn(Article, "findAndCountAll").mockResolvedValue({ rows: [article], count: 1 });
    const res = fakeRes();
    await allArticles({ query: { tag: "qa" } }, res, vi.fn());
    expect(find.mock.calls[0][0].include[0].where).toEqual({ name: "qa" });
    expect(article.dataValues.tagList).toEqual(["qa"]);
    expect(article.dataValues.favorited).toBe(false);
    expect(res.json.mock.calls[0][0].articlesCount).toBe(1);
  });

  it("responde 404 al filtrar favoritos de un usuario inexistente (antes error 500)", async () => {
    vi.spyOn(User, "findOne").mockResolvedValue(null);
    const next = vi.fn();
    await allArticles({ query: { favorited: "fantasma" } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("NotFoundError");
  });

  it("el feed solo consulta artículos de autores seguidos (RF-13)", async () => {
    const loggedUser = fakeUser({ getFollowing: vi.fn().mockResolvedValue([{ id: 7 }, { id: 8 }]) });
    const find = vi.spyOn(Article, "findAndCountAll").mockResolvedValue({ rows: [], count: 0 });
    await articlesFeed({ loggedUser, query: {} }, fakeRes(), vi.fn());
    expect(find.mock.calls[0][0].where).toEqual({ userId: [7, 8] });
    expect(find.mock.calls[0][0].order).toEqual([["createdAt", "DESC"]]);
  });
});
