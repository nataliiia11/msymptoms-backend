const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const getUserId = (req) => {
  const token = req.cookies["token"];
  const decodedId = jwt.verify(token, process.env.JWT_SECRET);
  return decodedId;
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token.toString()).digest("hex");
};

const sendCookies = (res) => {
  return res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(),
    sameSite: "none",
    secure: true,
  });
};

module.exports = {
  getUserId,
  generateToken,
  hashToken,
  sendCookies,
};
