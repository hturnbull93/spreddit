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

### Server Setup

Install dependencies:

```
yarn add express apollo-server-express graphql type-graphql
```

Install express types with:

```
yarn add -D @types/express
```

In `src/index.ts`:

```ts
import express from "express";
import { MikroORM } from "@mikro-orm/core";
// import { Post } from "./entities/Post";
import mikroConfig from "./mikro-orm.config";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const app = express();
  app.get('/', (_req, res) => {
    res.send('hello world')
  })
  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`server started on port: `, PORT);
  })
};

main();
```

`app` is initialised as an express instance, adding a simple get route for `/`, and listen on port 4000.

### GraphQL Schema Setup

For a hello world GraphQL endpoint, in `src/resolvers/hello/ts`:

```ts
import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
  @Query(() => String)
  hello() {
    return "Hello world"
  }
};
```

Here the class `HelloResolver` is decorated with `Resolver` from `type-graphql`, and each function/property etc is decorated with either `Query` or `Mutation`. The function `() => String` is passed to `Query` to tell it that this is a function that returns a string.

The resolver can then be imported and used an Apollo Server instance, in `src/index.ts`:

```ts
import express from "express";
import { MikroORM } from "@mikro-orm/core";
// import { Post } from "./entities/Post";
import mikroConfig from "./mikro-orm.config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver],
      validate: false,
    }),
  })
  apolloServer.applyMiddleware({ app });
  
  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`server started on port: `, PORT);
  })
};

main();
```

Here `apolloServer` is an instance of `ApolloServer`, which takes an config object with property `schema` which assigned with `buildSchema` from `type-graphql`, with the array of resolvers. Validation is also turned off. Then the `apolloServer` applies the express app as middleware, creating the GraphQL endpoint.

### Post Resolvers for CRUD Operations

In order for the Post class to be recognised as a GraphQL type, the class can be decorated with `ObjectType` and the properties with `Field` from `type-graphql`:

In `src/entities/Post.ts`:

```ts
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Post {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;
  
  @Field(() => String)
  @Property({ type: 'text' })
  title!: string;
  
  @Field(() => String)
  @Property({ type: 'date', })
  createdAt = new Date();
  
  @Field(() => String)
  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();
}
```

Then adding a resolver to get posts, in `src/resolvers/post.ts`:

```ts
import { Post } from "src/entities/Post";
import { ApolloContext } from "src/types";
import { Ctx, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { em }: ApolloContext): Promise<Post[]> {
    return em.find(Post, {});
  }
};
```

Here we are able to add the type for the `Query` decorator as an array containing `Post`, which works because we decorated `Post` as an `ObjectType`. The first parameter for the query is the context object, which is decorated with `Ctx` and typed with `ApolloContext` from `src/types.ts`:

```ts
import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";

export type ApolloContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>
}
```

A simple type where em is the type of `orm.em`.

The context is set up as part of the ApolloServer, in `src/index.ts`:

```ts
import express from "express";
import { MikroORM } from "@mikro-orm/core";
import mikroConfig from "./mikro-orm.config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver],
      validate: false,
    }),
    context: () => ({ em: orm.em })
  })
  apolloServer.applyMiddleware({ app });

  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`server started on port: `, PORT);
  })
};

main();
```

Here the `PostResolver` is added to the resolvers array, and context is added as a function that returns ab object with the `em` from `orm.em`. 

Now when running the server and visiting `localhost:4000/graphql` the playground offers the `posts` query with fields for `id`, `title`, `createdAt` and `updatedAt`.

To get a single post, in the `PostResolver` class:

```ts
  @Query(() => Post, { nullable: true })
  post(
    @Arg("id") id: number,
    @Ctx() { em }: ApolloContext
    ): Promise<Post | null> {
    return em.findOne(Post, { id });
  }
```

This query is typed to return a `Post`, the options object containing `nullable: true` indicates it could also return null, if a post by that id is not found. Similarly, the method returns a Promise that resolves to a union of `Post` and `null`. A parameter decorated with `Arg` from `type-graphql` as `id` is a number. The method finds the `Post` with the passed `id`.

To create a post, in the `PostResolver` class:

```ts
  @Mutation(() => Post)
  async createPost(
    @Arg("title") title: string,
    @Ctx() { em }: ApolloContext
    ): Promise<Post> {
    const post = em.create(Post, { title })
    await em.persistAndFlush(post);
    return post;
  }
```

The `createPost` mutation is decorated with `Mutation` from `type-graphql`, and returns a `Post`. It takes an arg of `title` which is a string, and uses `em` to create a post with that title, waits for it to be persisted to the database, then returns the post.

To update a post, in the `PostResolver` class:

```ts
  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("title", () => String, { nullable: true }) title: string,
    @Arg("id") id: number,
    @Ctx() { em }: ApolloContext
    ): Promise<Post | null> {
    const post = await em.findOne(Post, { id });
    if (!post) return null;
  
    if (typeof title !== 'undefined') {
      post.title = title;
      await em.persistAndFlush(post);
    }
    return post;
  }
```

Here `updatePost` takes two arguments: `title` and `id`, which are decorated, and `title` is also nullable. The method attempts to find the post, and if it does not find one by the passed `id` it will return null. It will then set and persist the new title, if the title isn't undefined/null. Then it returns the post.

To delete a post, in the `PostResolver` class:

```ts
  @Mutation(() => Boolean)
  async deletePost(
    @Arg("id") id: number,
    @Ctx() { em }: ApolloContext
    ): Promise<Boolean> {
      const post = await em.findOne(Post, { id });
      if (!post) return false; 
      
      await em.removeAndFlush(post);
      return true;
  }
```

`deletePost` takes an `id` and returns a Boolean. It attempts to find the post by the passed `id`, and returns false if it cannot find it. If it did, it deletes the post and returns true.

Refactors:
- Move the `createdAt` and `updatedAt` fields for the Post class up above `title`, for consistency with future entities.

### Users and Authentication

Users need their own entity, so in `src/entities/User.ts`:

```ts
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class User {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({ type: 'date', })
  createdAt = new Date();

  @Field(() => String)
  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field(() => String)
  @Property({ type: 'text', unique: true })
  username!: string;

  @Property({ type: 'text' })
  password!: string;
}
```

It is very similar to the `Post` entity, however the property `username` is unique, and the property `password (which will be the hashed password digest), is not a field exposed over GraphQL.

Add `User` to the `entities` array in the MikroORM config, and run `migration:create`.

To register a user, in `src/resolvers/user.ts`:

```ts
import argon2 from "argon2";
import { User } from "../entities/User";
import { ApolloContext } from "../types";
import { Arg, Ctx, Field, InputType, Mutation, Resolver } from "type-graphql";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string
  @Field()
  password: string
}

@Resolver()
export class UserResolver {
  @Mutation(() => User, { nullable: true })
  async register(
    @Arg("options") { username, password }: UsernamePasswordInput,
    @Ctx() { em }: ApolloContext,
  ): Promise<User | null> {
    const passwordDigest = await argon2.hash(password);
    let user;
    try {
      user = em.create(User, {
        username,
        password: passwordDigest,
      });
      await em.persistAndFlush(user)
    } catch (error) {
      return null;
    }
    return user;
  }
};
```

The `UsernamePasswordInput` class is decorated with `InputType`, and `Field` for each property. This is used in the `register` method as a type for the `options` arg (which is destructured immediately). `argon2` is installed with `yarn add argon2` and is used to hash the password into a passwordDigest, which is persisted as a new user in the database. If the user cannot be created, because the username already exists, it will return null, otherwise it will return the user.

The `UserResolver` is then added to the resolvers array of the Apollo Server.
