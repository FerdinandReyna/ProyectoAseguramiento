// Pruebas unitarias del usuario actual y actualización de perfil (módulo crítico: Autenticación).
// Doble de prueba: el usuario autenticado es un fake con save() simulado, sin base de datos.
const { currentUser, updateUser } = require("../../controllers/user");
const { fakeRes, fakeUser } = require("../fakes");

describe("Perfil del usuario autenticado", () => {
  it("responde 401 si no hay sesión (RF-16)", async () => {
    const next = vi.fn();
    await currentUser({ headers: {} }, fakeRes(), next);
    expect(next.mock.calls[0][0].name).toBe("UnauthorizedError");
  });

  it("actualiza la biografía sin tocar la contraseña (RF-05, defecto corregido)", async () => {
    const loggedUser = fakeUser();
    const res = fakeRes();
    const next = vi.fn();

    await updateUser({ loggedUser, body: { user: { bio: "QA tester" } } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(loggedUser.bio).toBe("QA tester");
    expect(loggedUser.password).toBe("hash-original");
    expect(loggedUser.save).toHaveBeenCalledOnce();
  });

  it("ignora campos no editables como el id (asignación masiva)", async () => {
    const loggedUser = fakeUser({ id: 1 });
    await updateUser({ loggedUser, body: { user: { id: 999, bio: "x" } } }, fakeRes(), vi.fn());
    expect(loggedUser.id).toBe(1);
  });

  it("cifra la nueva contraseña cuando sí se envía (RNF-04)", async () => {
    const loggedUser = fakeUser();
    await updateUser({ loggedUser, body: { user: { password: "NuevaClave1" } } }, fakeRes(), vi.fn());
    expect(loggedUser.password).not.toBe("hash-original");
    expect(loggedUser.password).not.toBe("NuevaClave1");
  });
});
