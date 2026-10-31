const jwt = require("jsonwebtoken");
const privateKey = process.env.JWT_KEY;

module.exports.jwtSign = async (payload) => {
  return jwt.sign(
    { username: payload.username, email: payload.email },
    privateKey,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
  );
};

module.exports.jwtVerify = async (token) => {
  return jwt.verify(token, privateKey);
};
