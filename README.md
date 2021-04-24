# Reddit Clone

This project is to practice and gain more understanding of best practices when using the following technologies:

- React
- TypeScript
- GraphQL
- URQL/Apollo
- Node.js
- PostgreSQL
- MikroORM/TypeORM
- Redis
- Next.js
- TypeGraphQL
- Chakra

Following [this tutorial](https://www.youtube.com/watch?v=I6ypD7qv3Z8&ab_channel=BenAwad).

## Development Journal

### Setting up TypeScript with Node

Install dev dependencies:

```shell
yarn add -D @types/node typescript
```

Generate tsconfig.json, choosing nodejs:

```shell
npx tsconfig.json
```

Add script to watch in package.json:

```json
  "watch": "tsc -w",
```

Add script to start in package.json:

```json
  "start": "node dist/index.js",
```

Install nodemon:

```shell
yarn add -D nodemon
```

Add dev script to watch for file changes in dist:

```json
    "dev": "nodemon dist/index.js",
```


### Mikro ORM & Postgresql

Install Mikro ORM and Postgresql driver PG with:

```shell
yarn add @mikro-orm/cli @mikro-orm/core @mikro-orm/migrations @mikro-orm/postgresql pg
```

Install Postgresql following the steps in [this article](https://harshityadav95.medium.com/postgresql-in-windows-subsystem-for-linux-wsl-6dc751ac1ff3).

As I want to keep credentials safe, and easily customisable, add detenv with:

```shell
yarn add dotenv
```

And add environmental variables in a gitignored `.env` file, for example:

```
DB_USER=myPostgresqlUsername
DB_PASS=myPostgresqlPassword
```

Initialise orm in `src/index.ts`:

```ts
import { MikroORM } from "@mikro-orm/core";
import { DB_PASS, DB_USER, __prod__ } from "./constants";

const main = async () => {
  const orm = await MikroORM.init({
    dbName: 'lireddit',
    user: DB_USER,
    password: DB_PASS,
    type: 'postgresql',
    debug: !__prod__,
  });
};

main();
```

The `main` function is used to be able to wrap the await. Imported from `constants.ts` are the environmental variables for the database, and one that indicates if `NODE_ENV` is `production`. 

### Post Entity

MikroORM works with entities, which represent the items in the tables in the database.

In `src/entities/Post.ts`:

```ts
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class Post {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property()
  createdAt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt = new Date();
}
```

The class `Post` is decorated with `Entity` from MikroORM, to let it know that this class is an entity (relating to tables int he database). Similarly, the `Property` and `PrimaryKey` decorators. `updatedAt`'s decorator takes an object with a function for `onUpdate` that will provide the new date.

The `Post` class is added to the `entities` array when initialising MikroOrm.

### Set up MikroORM CLI

Add the config in `package.json`:

```json
  "mikro-orm": {
    "useTsNode": true,
    "configPaths": [
      "./src/mikro-orm.config.ts",
      "./dist/mikro-orm.config.js"
    ]
  }
```

Add `src/mikro-orm.config.ts` exporting the config object we already had set up in `src/index.ts`:

```ts
import path from "path";
import { MikroORM } from "@mikro-orm/core";
import { DB_USER, DB_PASS, __prod__ } from "./constants";
import { Post } from "./entities/Post";

export default {
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  entities: [Post],
  dbName: 'lireddit',
  user: DB_USER,
  password: DB_PASS,
  type: 'postgresql',
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
```

`as Parameters<typeof MikroORM.init>[0]` is used to get the type of the `MikroORM.init` function, and as this config object is the first parameter of several optional ones, select the first one of the array.

The purpose of using the cli is to be able to easily perform migrations. the migrations object contains a path to the migrations directory, and also a pattern for either `.js` or `.ts` files (so it will work after compilation to js).

Then import that back into `src/index.ts` and pass to `MikroORM.init`. This is not strictly necessary as it if called without an object would go to find the object based on the config in `package.json`.

### Running a Migration for Posts

The cli tool needs `ts-node` to work, installed with:

```shell
yarn add -D ts-node
```

The [migration](https://mikro-orm.io/docs/migrations/#using-via-cli) itself is run with:

```shell
npx mikro-orm migration:create
```

This creates a class in the migrations folder, timestamped, such as `Migration20210424130609.ts`, which contains a method `up` that will run SQL code to perform the migration.

However, this gives the createdAt and updatedAt columns the type of jsonb, when they should be dates, so specify the type in the Post entity as date, and delete the file and rerun the migration:create command.

In `src/index.ts` after initialising MikroORM, run migrations:

```ts
import { MikroORM } from "@mikro-orm/core";
import { Post } from "./entities/Post";
import mikroConfig from "./mikro-orm.config";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const post = orm.em.create(Post, { title: "My first post" });
  await orm.em.persistAndFlush(post);
};

main();
```

`await orm.getMigrator().up()` will run the migrations. Then `orm.em.create` is used to create a Post with a title, and `orm.em.persistAndFlush` ise used to persist that to the database.

*For some reason it was throwing an error when attempting to create the Posts table, however adding `disableForeignKeys: false` to the migrations config fixes this, though I'm not entirely sure how.*
