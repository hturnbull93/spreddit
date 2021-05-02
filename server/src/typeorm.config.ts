import { ConnectionOptions } from "typeorm";
import { DB_PASS, DB_USER } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

const typeormConfig: ConnectionOptions = {
  type: "postgres",
  database: "reddit2",
  username: DB_USER,
  password: DB_PASS,
  logging: true,
  synchronize: true,
  entities: [Post, User],
};

export default typeormConfig;
