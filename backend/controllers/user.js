const { UnauthorizedError } = require("../helper/customErrors");
const { bcryptHash } = require("../helper/bcrypt");

//* Current User
const currentUser = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    loggedUser.dataValues.email = req.headers.email;
    delete req.headers.email;

    res.json({ user: loggedUser });
  } catch (error) {
    next(error);
  }
};

//* Update User
const updateUser = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const {
      user: { password },
      user,
    } = req.body;

    // Solo se permiten estos campos; evita que el cliente sobrescriba id u otros atributos.
    const editableFields = ["username", "email", "bio", "image"];
    editableFields.forEach((key) => {
      if (user[key] !== undefined) loggedUser[key] = user[key];
    });

    // Antes: (password !== undefined || password !== "") era siempre verdadero y
    // provocaba un error 500 al actualizar el perfil sin enviar contraseña.
    if (password !== undefined && password !== "") {
      loggedUser.password = await bcryptHash(password);
    }

    await loggedUser.save();

    res.json({ user: loggedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = { currentUser, updateUser };
