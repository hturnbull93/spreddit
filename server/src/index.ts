import express from "express";
import { MikroORM } from "@mikro-orm/core";
import mikroConfig from "./mikro-orm.config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import ioredis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";

import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import {
  COOKIE_NAME,
  CORS_ORIGIN,
  SESSION_SECRET,
  __prod__,
} from "./constants";
import { ApolloContext } from "./types";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const app = express();

  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    }),
  );

  const RedisStore = connectRedis(session);
  const redis = ioredis();
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redis, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax",
      },
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    }),
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver, PostResolver],
      validate: false,
    }),
    context: ({ req, res }): ApolloContext => ({ em: orm.em, req, res, redis }),
  });
  apolloServer.applyMiddleware({ app, cors: false });

  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`server started on port: `, PORT);
  });
};

main();
