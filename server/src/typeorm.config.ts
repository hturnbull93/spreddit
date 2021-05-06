import { ConnectionOptions } from "typeorm";
import { DB_PASS, DB_USER } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";

const typeormConfig: ConnectionOptions = {
  type: "postgres",
  database: "reddit2",
  username: DB_USER,
  password: DB_PASS,
  logging: true,
  synchronize: true,
  entities: [Post, User],
  migrations: [path.join(__dirname, "./migrations/*")],
};

export default typeormConfig;
