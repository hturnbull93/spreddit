import isEmail from "validator/lib/isEmail";
import { UsernamePasswordInput, FieldError } from "../types";

export const validateRegister = ({
  username,
  email,
  password,
}: UsernamePasswordInput): FieldError[] | null => {
  const errors = [];
  if (!isEmail(email)) {
    errors.push({
      field: "email",
      message: "invalid email",
    });
  }
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
  if (password.length < 2) {
    errors.push({
      field: "password",
      message: "length must be at least 2 characters",
    });
  }
  if (errors.length) {
    return errors;
  }
  return null;
};
