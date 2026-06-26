import argon2 from "argon2";
import db from "../db/index.js";
import { UsersTable } from "../models/user.model.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { refreshTokensTable } from "../models/tokens.model.js";

export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existing = await db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.email, email));

    if (existing.length > 0) {
      return next({ status: 409, message: "Email already in use" });
    }

    const passwordHash = await argon2.hash(password);

    const result = await db.insert(UsersTable).values({
      firstName,
      lastName,
      email,
      passwordHash,
    }).returning({ id: UsersTable.id, email: UsersTable.email });

    res.status(201).json({ success: true, user: result[0] });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.email, email));

    if (result.length === 0) {
      return next({ status: 401, message: "Invalid credentials" });
    }

    const user = result[0];

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return next({ status: 401, message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await db.insert(refreshTokensTable).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(200).json({ success: true, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const result = await db
      .select({
        id: UsersTable.id,
        firstName: UsersTable.firstName,
        lastName: UsersTable.lastName,
        email: UsersTable.email,
        role: UsersTable.role,
        createdAt: UsersTable.createdAt,
      })
      .from(UsersTable)
      .where(eq(UsersTable.id, req.user.id));

    if (result.length === 0) {
      return next({ status: 404, message: "User not found" });
    }

    res.status(200).json({ success: true, user: result[0] });
  } catch (err) {
    next(err);
  }
};