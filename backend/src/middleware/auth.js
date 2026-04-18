const jwt = require("jsonwebtoken");

const JWT_SECRET = (process.env.JWT_SECRET || "pub1005").trim();

module.exports = function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Token não enviado" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido" });
  }
};
