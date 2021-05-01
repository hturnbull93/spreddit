import { dedupExchange, fetchExchange } from "urql";
import { cacheExchange } from "@urql/exchange-graphcache";
import {
  LoginMutation,
  MeQuery,
  MeDocument,
  RegisterMutation,
  LogoutMutation,
  ChangePasswordMutation,
} from "../generated/graphql";
import { typedUpdateQuery } from "./typedUpdateQuery";

export const createUrqlClient = (ssrExchange: any) => ({
  url: "http://localhost:4000/graphql",
  fetchOptions: {
    credentials: "include" as const,
  },
  exchanges: [
    dedupExchange,
    cacheExchange({
      updates: {
        Mutation: {
          login: (result, _args, cache, _info) => {
            typedUpdateQuery<LoginMutation, MeQuery>(
              cache,
              { query: MeDocument },
              result,
              (r, q) => {
                if (r.login.errors) {
                  return q;
                } else {
                  return {
                    me: r.login.user,
                  };
                }
              },
            );
          },
          register: (result, _args, cache, _info) => {
            typedUpdateQuery<RegisterMutation, MeQuery>(
              cache,
              { query: MeDocument },
              result,
              (r, q) => {
                if (r.register.errors) {
                  return q;
                } else {
                  return {
                    me: r.register.user,
                  };
                }
              },
            );
          },
          changePassword: (result, _args, cache, _info) => {
            typedUpdateQuery<ChangePasswordMutation, MeQuery>(
              cache,
              { query: MeDocument },
              result,
              (r, q) => {
                if (r.changePassword.errors) {
                  return q;
                } else {
                  return {
                    me: r.changePassword.user,
                  };
                }
              },
            );
          },
          logout: (result, _args, cache, _info) => {
            typedUpdateQuery<LogoutMutation, MeQuery>(
              cache,
              { query: MeDocument },
              result,
              () => ({ me: null }),
            );
          },
        },
      },
    }),
    ssrExchange,
    fetchExchange,
  ],
});
