import dotenv from "dotenv";
dotenv.config();

export const __prod__ = process.env.NODE_ENV === "production";
export const DB_USER = process.env.DB_USER;
export const DB_PASS = process.env.DB_PASS;
export const SESSION_SECRET = process.env.SESSION_SECRET || "secret";
