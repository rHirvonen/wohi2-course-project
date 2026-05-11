const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { UnauthorizedError } = require("../lib/errors");

const SECRET = process.env.JWT_SECRET;

module.exports = async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      throw new UnauthorizedError("No token provided");
    }

    const token = header.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("No token provided");
    }

    let payload;

    try {
      payload = jwt.verify(token, SECRET);
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};