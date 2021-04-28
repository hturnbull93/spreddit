import { FieldError } from "../generated/graphql";

export const toErrorMap = (errors: FieldError[]) => {
  const errorMap: Record<string, string> = {};
  errors.forEach(({ field, message }) => {
    if (!errorMap[field]) {
      errorMap[field] = message;
    } else {
      errorMap[field].concat(` | ${message}`);
    }
  });
  return errorMap;
};
