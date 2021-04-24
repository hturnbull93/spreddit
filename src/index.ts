import { MikroORM } from "@mikro-orm/core";
import { DB_PASS, DB_USER, __prod__ } from "./constants";
import { Post } from "./entities/Post";

const main = async () => {
  const orm = await MikroORM.init({
    entities: [Post],
    dbName: 'lireddit',
    user: DB_USER,
    password: DB_PASS,
    type: 'postgresql',
    debug: !__prod__,
  });
};

main();
