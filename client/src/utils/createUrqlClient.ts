import {
  dedupExchange,
  Exchange,
  fetchExchange,
  stringifyVariables,
} from "urql";
import { pipe, tap } from "wonka";
import { cacheExchange, Resolver } from "@urql/exchange-graphcache";
import {
  LoginMutation,
  MeQuery,
  MeDocument,
  RegisterMutation,
  LogoutMutation,
  ChangePasswordMutation,
} from "../generated/graphql";
import { typedUpdateQuery } from "./typedUpdateQuery";
import Router from "next/router";

const errorExchange: Exchange = ({ forward }) => (ops$) => {
  return pipe(
    forward(ops$),
    tap(({ error }) => {
      if (error?.message.includes("not authenticated")) {
        Router.replace("/login");
      }
    }),
  );
};

export const cursorPagination = (__typename: string): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info;

    const allFields = cache.inspectFields(entityKey);
    const fieldInfos = allFields.filter((info) => info.fieldName === fieldName);
    if (!fieldInfos.length) return undefined;

    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
    const isInCache = !!cache.resolve(
      cache.resolve(entityKey, fieldKey) as string,
      fieldName,
    );
    info.partial = !isInCache;

    return fieldInfos.reduce(
      (prev, fi) => {
        console.log(`fi.fieldKey`, fi.fieldKey);
        const key = cache.resolve(entityKey, fi.fieldKey) as string;
        const data = cache.resolve(key, fieldName) as string[];
        const hasMore = cache.resolve(key, "hasMore");

        if (!hasMore) prev.hasMore = false;
        prev[fieldName].push(...data);
        return prev;
      },
      { [fieldName]: [], hasMore: true, __typename } as any,
    );
  };
};

export const createUrqlClient = (ssrExchange: any) => ({
  url: "http://localhost:4000/graphql",
  fetchOptions: {
    credentials: "include" as const,
  },
  exchanges: [
    dedupExchange,
    cacheExchange({
      keys: {
        PaginatedPosts: () => null,
      },
      resolvers: {
        Query: {
          posts: cursorPagination("PaginatedPosts"),
        },
      },
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
          createPost: (_result, _args, cache, _info) => {
            const allFields = cache.inspectFields("Query");
            const fieldInfos = allFields.filter(
              (info) => info.fieldName === "posts",
            );
            fieldInfos.forEach((fi) => {
              cache.invalidate("Query", "posts", fi.arguments || {});
            });
          },
        },
      },
    }),
    errorExchange,
    ssrExchange,
    fetchExchange,
  ],
});
