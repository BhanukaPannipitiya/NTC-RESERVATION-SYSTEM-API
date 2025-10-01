const jwt = require("jsonwebtoken");

const generateTokenAndSetCookie = (res, payload) => {
  const { id, role } = payload;
  const token = jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  const cookieDays = Number(process.env.JWT_COOKIE_EXPIRE || 1);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: cookieDays * 24 * 60 * 60 * 1000,
  });

  return token;
};

module.exports = { generateTokenAndSetCookie };