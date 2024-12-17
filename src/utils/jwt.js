const jwt = require("jsonwebtoken");

const generateTokenAndSetCookie = (res, userId) => {
    console.log("here")
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });

    res.cookie("token",token,{
        httpOnly:true, // to prevent xss attacks
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict", //csrf attacks prevent
        maxAge: process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000, // cookie expires in
    })

    return token;
};

module.exports = { generateTokenAndSetCookie };