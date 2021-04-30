import dotenv from "dotenv";
dotenv.config();

export const __prod__ = process.env.NODE_ENV === "production";
export const DB_USER = process.env.DB_USER;
export const DB_PASS = process.env.DB_PASS;
export const MAILER_USER = process.env.MAILER_USER;
export const MAILER_PASS = process.env.MAILER_PASS;
export const MAILER_HOST = process.env.MAILER_HOST;
export const MAILER_PORT = process.env.MAILER_PORT;
export const SESSION_SECRET = process.env.SESSION_SECRET || "secret";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
export const COOKIE_NAME = "qid";
