// Variables mínimas para cargar los modelos de Sequelize sin conectarse a una base real.
// Las pruebas unitarias nunca abren conexión: los métodos de los modelos se reemplazan con stubs.
process.env.NODE_ENV = "test";
process.env.TEST_DB_DIALECT = "postgres";
process.env.JWT_KEY = "clave-de-prueba-unitaria";
