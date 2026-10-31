// Pruebas unitarias de comentarios, favoritos y seguimiento (módulos críticos).
// Dobles de prueba: stubs de Article, Comment y User, y fakes con métodos de asociación simulados.
const { Article, Comment, User } = require("../../models");
const { createComment, deleteComment } = require("../../controllers/comments");
const { favoriteToggler } = require("../../controllers/favorites");
const { followToggler } = require("../../controllers/profiles");
const { fakeRes, fakeUser, fakeArticle } = require("../fakes");

afterEach(() => vi.restoreAllMocks());

describe("Comentarios", () => {
  it("rechaza un comentario con solo espacios (RF-09)", async () => {
    const next = vi.fn();
    await createComment(
      { loggedUser: fakeUser(), params: { slug: "a" }, body: { comment: { body: "   " } } },
      fakeRes(),
      next,
    );
    expect(next.mock.calls[0][0].name).toBe("FieldRequiredError");
  });

  it("acepta 1000 caracteres y rechaza 1001 (RF-09, valores límite)", async () => {
    vi.spyOn(Article, "findOne").mockResolvedValue(fakeArticle());
    vi.spyOn(Comment, "create").mockResolvedValue({ dataValues: {} });
    const ok = fakeRes();
    const nextOk = vi.fn();
    await createComment(
      { loggedUser: fakeUser(), params: { slug: "a" }, body: { comment: { body: "x".repeat(1000) } } },
      ok,
      nextOk,
    );
    const nextFail = vi.fn();
    await createComment(
      { loggedUser: fakeUser(), params: { slug: "a" }, body: { comment: { body: "x".repeat(1001) } } },
      fakeRes(),
      nextFail,
    );
    expect(ok.status).toHaveBeenCalledWith(201);
    expect(nextFail.mock.calls[0][0].name).toBe("ValidationError");
  });

  it("responde 404 al comentar un artículo inexistente", async () => {
    vi.spyOn(Article, "findOne").mockResolvedValue(null);
    const next = vi.fn();
    await createComment(
      { loggedUser: fakeUser(), params: { slug: "no" }, body: { comment: { body: "hola" } } },
      fakeRes(),
      next,
    );
    expect(next.mock.calls[0][0].name).toBe("NotFoundError");
  });

  it("otro usuario no puede borrar el comentario (RF-10)", async () => {
    const comment = { userId: 1, destroy: vi.fn() };
    vi.spyOn(Comment, "findByPk").mockResolvedValue(comment);
    const next = vi.fn();
    await deleteComment({ loggedUser: fakeUser({ id: 2 }), params: { commentId: 5 } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("ForbiddenError");
    expect(comment.destroy).not.toHaveBeenCalled();
  });

  it("el autor borra su comentario (RF-10)", async () => {
    const comment = { userId: 1, destroy: vi.fn() };
    vi.spyOn(Comment, "findByPk").mockResolvedValue(comment);
    await deleteComment({ loggedUser: fakeUser({ id: 1 }), params: { commentId: 5 } }, fakeRes(), vi.fn());
    expect(comment.destroy).toHaveBeenCalledOnce();
  });
});

describe("Favoritos (transición de estados RF-11)", () => {
  it("POST: No favorito → Favorito y el contador sube a 1", async () => {
    const article = fakeArticle();
    article.addUser.mockImplementation(async () => {
      article.hasUser.mockResolvedValue(true);
      article.countUsers.mockResolvedValue(1);
    });
    vi.spyOn(Article, "findOne").mockResolvedValue(article);

    await favoriteToggler({ method: "POST", loggedUser: fakeUser(), params: { slug: "a" } }, fakeRes(), vi.fn());

    expect(article.dataValues.favorited).toBe(true);
    expect(article.dataValues.favoritesCount).toBe(1);
  });

  it("DELETE: Favorito → No favorito usando removeUser", async () => {
    const article = fakeArticle();
    vi.spyOn(Article, "findOne").mockResolvedValue(article);
    await favoriteToggler({ method: "DELETE", loggedUser: fakeUser(), params: { slug: "a" } }, fakeRes(), vi.fn());
    expect(article.removeUser).toHaveBeenCalledOnce();
    expect(article.addUser).not.toHaveBeenCalled();
  });

  it("responde 401 si un visitante intenta marcar favorito (RF-16)", async () => {
    const next = vi.fn();
    await favoriteToggler({ method: "POST", params: { slug: "a" } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("UnauthorizedError");
  });
});

describe("Seguir autores (RF-12)", () => {
  it("un usuario no puede seguirse a sí mismo", async () => {
    const me = fakeUser({ id: 1 });
    vi.spyOn(User, "findOne").mockResolvedValue(fakeUser({ id: 1 }));
    const next = vi.fn();
    await followToggler({ method: "POST", loggedUser: me, params: { username: "fer" } }, fakeRes(), next);
    expect(next.mock.calls[0][0].message).toBe("You cannot follow yourself");
  });

  it("seguir a otro autor llama a addFollower y marca following", async () => {
    const profile = fakeUser({ id: 2 });
    profile.addFollower.mockImplementation(async () => profile.hasFollower.mockResolvedValue(true));
    vi.spyOn(User, "findOne").mockResolvedValue(profile);
    await followToggler({ method: "POST", loggedUser: fakeUser({ id: 1 }), params: { username: "otro" } }, fakeRes(), vi.fn());
    expect(profile.dataValues.following).toBe(true);
  });

  it("dejar de seguir llama a removeFollower", async () => {
    const profile = fakeUser({ id: 2 });
    vi.spyOn(User, "findOne").mockResolvedValue(profile);
    await followToggler({ method: "DELETE", loggedUser: fakeUser({ id: 1 }), params: { username: "otro" } }, fakeRes(), vi.fn());
    expect(profile.removeFollower).toHaveBeenCalledOnce();
  });
});
