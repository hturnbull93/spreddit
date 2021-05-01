import isEmail from "validator/lib/isEmail";
import { UsernamePasswordInput, FieldError } from "../types";

export const validateRegister = ({
  username,
  email,
  password,
}: UsernamePasswordInput): FieldError[] | null => {
  const errors: FieldError[] = [];

  const emailErrors = validateEmail(email);
  if (emailErrors) errors.push(...emailErrors);

  const usernameErrors = validateUsername(username);
  if (usernameErrors) errors.push(...usernameErrors);

  const passwordErrors = validatePassword(password);
  if (passwordErrors) errors.push(...passwordErrors);

  if (errors.length) return errors;

  return null;
};

export const validateEmail = (email: string): FieldError[] | null => {
  const errors = [];
  if (!isEmail(email)) {
    errors.push({
      field: "email",
      message: "invalid email",
    });
  }

  if (errors.length) return errors;

  return null;
};

export const validatePassword = (password: string): FieldError[] | null => {
  const errors = [];
  if (password.length < 2) {
    errors.push({
      field: "password",
      message: "length must be at least 2 characters",
    });
  }

  if (errors.length) return errors;

  return null;
};

export const validateUsername = (username: string): FieldError[] | null => {
  const errors = [];
  if (username.length < 2) {
    errors.push({
      field: "username",
      message: "length must be at least 2 characters",
    });
  }
  if (username.includes("@")) {
    errors.push({
      field: "username",
      message: "cannot contain '@'",
    });
  }
  if (errors.length) return errors;

  return null;
};
