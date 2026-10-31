// Las variables de entorno siempre son texto: "false" debe desactivar el log, no romper Sequelize.
const toLogger = (value) => (value === "true" ? console.log : false);

// Proveedores cloud gestionados (Render, Neon) exigen SSL.
const dialectOptions =
  process.env.DB_SSL === "true"
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {};

/** @type {import('sequelize').Options} */
module.exports = {
  development: {
    username: process.env.DEV_DB_USERNAME,
    password: process.env.DEV_DB_PASSWORD,
    database: process.env.DEV_DB_NAME,
    host: process.env.DEV_DB_HOSTNAME,
    dialect: process.env.DEV_DB_DIALECT,
    logging: toLogger(process.env.DEV_DB_LOGGING),
  },
  test: {
    username: process.env.TEST_DB_USERNAME,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_NAME,
    host: process.env.TEST_DB_HOSTNAME,
    dialect: process.env.TEST_DB_DIALECT,
    logging: toLogger(process.env.TEST_DB_LOGGING),
  },
  production: {
    username: process.env.PROD_DB_USERNAME,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOSTNAME,
    dialect: process.env.PROD_DB_DIALECT,
    logging: toLogger(process.env.PROD_DB_LOGGING),
    dialectOptions,
  },
};
