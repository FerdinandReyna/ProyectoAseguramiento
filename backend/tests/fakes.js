// Fábricas de objetos falsos (fakes) reutilizables para las pruebas unitarias del backend.
// "vi" es global (globals: true en vitest.config.js).

const fakeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const fakeUser = (overrides = {}) => ({
  id: 1,
  username: "fer",
  email: "fer@test.com",
  password: "hash-original",
  dataValues: {},
  save: vi.fn().mockResolvedValue(undefined),
  getFollowing: vi.fn().mockResolvedValue([]),
  hasFollower: vi.fn().mockResolvedValue(false),
  countFollowers: vi.fn().mockResolvedValue(0),
  addFollower: vi.fn().mockResolvedValue(undefined),
  removeFollower: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const fakeArticle = (authorId = 1, overrides = {}) => {
  const author = fakeUser({ id: authorId, username: `autor${authorId}` });
  return {
    id: 10,
    slug: "mi-articulo",
    title: "Mi articulo",
    author,
    tagList: [{ name: "qa" }],
    dataValues: {},
    save: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    getAuthor: vi.fn().mockResolvedValue(author),
    getTagList: vi.fn().mockResolvedValue([{ name: "qa" }]),
    hasUser: vi.fn().mockResolvedValue(false),
    countUsers: vi.fn().mockResolvedValue(0),
    addUser: vi.fn().mockResolvedValue(undefined),
    removeUser: vi.fn().mockResolvedValue(undefined),
    addTagList: vi.fn().mockResolvedValue(undefined),
    setAuthor: vi.fn(),
    getComments: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
};

module.exports = { fakeRes, fakeUser, fakeArticle };
