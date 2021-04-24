import { MikroORM } from "@mikro-orm/core";
import { DB_USER, DB_PASS, __prod__ } from "./constants";
import { Post } from "./entities/Post";

export default {
  entities: [Post],
  dbName: 'lireddit',
  user: DB_USER,
  password: DB_PASS,
  type: 'postgresql',
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
