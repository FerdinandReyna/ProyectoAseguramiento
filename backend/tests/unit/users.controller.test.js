// Pruebas unitarias del controlador de registro e inicio de sesión (módulo crítico: Autenticación).
// Doble de prueba: stub de User.findOne / User.create para aislar la base de datos.
const { User } = require("../../models");
const { signUp, signIn } = require("../../controllers/users");
const { bcryptHash } = require("../../helper/bcrypt");
const { fakeRes } = require("../fakes");

const validUser = { username: "fer", email: "fer@test.com", password: "Clave1234" };

describe("Registro de usuario (signUp)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rechaza el registro sin nombre de usuario (RF-01)", async () => {
    const next = vi.fn();
    await signUp({ body: { user: { ...validUser, username: "" } } }, fakeRes(), next);
    expect(next.mock.calls[0][0].message).toBe("A username is required");
  });

  it("rechaza el registro sin correo (RF-01)", async () => {
    const next = vi.fn();
    await signUp({ body: { user: { ...validUser, email: "" } } }, fakeRes(), next);
    expect(next.mock.calls[0][0].message).toBe("An email is required");
  });

  it("rechaza una contraseña de 7 caracteres (RF-03, valor límite)", async () => {
    const next = vi.fn();
    await signUp({ body: { user: { ...validUser, password: "1234567" } } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("ValidationError");
  });

  it("rechaza una contraseña de 65 caracteres (RF-03, valor límite)", async () => {
    const next = vi.fn();
    await signUp({ body: { user: { ...validUser, password: "a".repeat(65) } } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("ValidationError");
  });

  it("rechaza un correo ya registrado (RF-02)", async () => {
    vi.spyOn(User, "findOne").mockResolvedValueOnce({ id: 99 });
    const next = vi.fn();
    await signUp({ body: { user: validUser } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("AlreadyTakenError");
  });

  it("rechaza un nombre de usuario ya registrado (RF-02)", async () => {
    vi.spyOn(User, "findOne")
      .mockResolvedValueOnce(null) // correo libre
      .mockResolvedValueOnce({ id: 99 }); // usuario ocupado
    const next = vi.fn();
    await signUp({ body: { user: validUser } }, fakeRes(), next);
    expect(next.mock.calls[0][0].message).toMatch(/Username already exists/);
  });

  it("crea la cuenta con contraseña cifrada y responde 201 con token (RF-01, RNF-04)", async () => {
    vi.spyOn(User, "findOne").mockResolvedValue(null);
    const create = vi
      .spyOn(User, "create")
      .mockImplementation(async (data) => ({ ...data, dataValues: {} }));
    const res = fakeRes();

    await signUp({ body: { user: { ...validUser, password: "a".repeat(8) } } }, res, vi.fn());

    expect(create.mock.calls[0][0].password).not.toBe("a".repeat(8));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].user.dataValues.token).toEqual(expect.any(String));
  });
});

describe("Inicio de sesión (signIn)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("responde 'no encontrado' si el correo no existe (RF-04)", async () => {
    vi.spyOn(User, "findOne").mockResolvedValue(null);
    const next = vi.fn();
    await signIn({ body: { user: { email: "x@test.com", password: "Clave1234" } } }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("NotFoundError");
  });

  it("rechaza una contraseña incorrecta (RF-04)", async () => {
    const password = await bcryptHash("Clave1234");
    vi.spyOn(User, "findOne").mockResolvedValue({ password, dataValues: {} });
    const next = vi.fn();
    await signIn({ body: { user: { email: "fer@test.com", password: "otra" } } }, fakeRes(), next);
    expect(next.mock.calls[0][0].message).toBe("Wrong email/password combination");
  });

  it("emite un token con credenciales válidas (RF-04)", async () => {
    const password = await bcryptHash("Clave1234");
    const existing = { username: "fer", email: "fer@test.com", password, dataValues: {} };
    vi.spyOn(User, "findOne").mockResolvedValue(existing);
    const res = fakeRes();
    await signIn({ body: { user: { email: "fer@test.com", password: "Clave1234" } } }, res, vi.fn());
    expect(res.json.mock.calls[0][0].user.dataValues.token).toEqual(expect.any(String));
  });

  it("rechaza la solicitud sin contraseña sin consultar la base de datos", async () => {
    const findOne = vi.spyOn(User, "findOne");
    const next = vi.fn();
    await signIn({ body: { user: { email: "fer@test.com" } } }, fakeRes(), next);
    expect(next.mock.calls[0][0].message).toBe("A password is required");
    expect(findOne).not.toHaveBeenCalled();
  });
});
