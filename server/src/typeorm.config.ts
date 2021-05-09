import { ConnectionOptions } from "typeorm";
import { DB_PASS, DB_USER } from "./constants";
import path from "path";

const typeormConfig: ConnectionOptions = {
  type: "postgres",
  database: "reddit2",
  username: DB_USER,
  password: DB_PASS,
  logging: true,
  synchronize: true,
  entities: [path.join(__dirname, "./entities/*")],
  migrations: [path.join(__dirname, "./migrations/*")],
};

export default typeormConfig;
