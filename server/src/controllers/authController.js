import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import HttpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

export const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (name.length < 2) throw new HttpError(400, "Enter your full name");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address");
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    throw new HttpError(400, "Password must be at least 8 characters and include a letter and a number");
  if (password.length > 72) throw new HttpError(400, "Password must be 72 characters or fewer");

  if (await User.exists({ email })) throw new HttpError(409, "An account with this email already exists");

  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  if (!email || !password) throw new HttpError(400, "Enter your email and password");

  const user = await User.findOne({ email }).select("+password");
  const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Incorrect email or password");

  res.json({ token: signToken(user._id), user: publicUser(user) });
});

export const me = (req, res) => res.json({ user: publicUser(req.user) });
