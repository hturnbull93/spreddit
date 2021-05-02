import { MiddlewareFn } from "type-graphql";
import { AUTHENTICATION_ERROR } from "../constants";
import { ApolloContext } from "../types";

export const isAuth: MiddlewareFn<ApolloContext> = ({ context }, next) => {
  if (!context.req.session.userId) throw new Error(AUTHENTICATION_ERROR);

  return next();
};
