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

Initialise orm in `./src/index.ts`:

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

The `main` function is used to be able to wrap the await. Imported from `constants.ts` are the environmental variables for the database, and one that indiciates if `NODE_ENV` is `production`. 