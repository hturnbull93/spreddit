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

## Quick Start

```shell
# start postgresql and redis services
sudo service postgresql start && sudo service redis-server start

# start dev compiler
cd server && yarn watch

# start dev server
cd server && yarn dev

# start dev client
cd client && yarn dev
```

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

Initialise orm in `server/src/index.ts`:

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

In `server/src/entities/Post.ts`:

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

### MikroORM CLI Setup

Add the config in `package.json`:

```json
  "mikro-orm": {
    "useTsNode": true,
    "configPaths": [
      "./server/src/mikro-orm.config.ts",
      "./dist/mikro-orm.config.js"
    ]
  }
```

Add `server/src/mikro-orm.config.ts` exporting the config object we already had set up in `server/src/index.ts`:

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

Then import that back into `server/src/index.ts` and pass to `MikroORM.init`. This is not strictly necessary as it if called without an object would go to find the object based on the config in `package.json`.

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

In `server/src/index.ts` after initialising MikroORM, run migrations:

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

In `server/src/index.ts`:

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

For a hello world GraphQL endpoint, in `server/src/resolvers/hello/ts`:

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

The resolver can then be imported and used an Apollo Server instance, in `server/src/index.ts`:

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

In `server/src/entities/Post.ts`:

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

Then adding a resolver to get posts, in `server/src/resolvers/post.ts`:

```ts
import { Post } from "server/src/entities/Post";
import { ApolloContext } from "server/src/types";
import { Ctx, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { em }: ApolloContext): Promise<Post[]> {
    return em.find(Post, {});
  }
};
```

Here we are able to add the type for the `Query` decorator as an array containing `Post`, which works because we decorated `Post` as an `ObjectType`. The first parameter for the query is the context object, which is decorated with `Ctx` and typed with `ApolloContext` from `server/src/types.ts`:

```ts
import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";

export type ApolloContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>
}
```

A simple type where em is the type of `orm.em`.

The context is set up as part of the ApolloServer, in `server/src/index.ts`:

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

Users need their own entity, so in `server/src/entities/User.ts`:

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

To register a user, in `server/src/resolvers/user.ts`:

```ts
import argon2 from "argon2";
import { User } from "../entities/User";
import { ApolloContext } from "../types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Resolver,
} from "type-graphql";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") { username, password }: UsernamePasswordInput,
    @Ctx() { em }: ApolloContext,
  ): Promise<UserResponse> {
    const passwordDigest = await argon2.hash(password);
    let user;
    try {
      user = em.create(User, {
        username,
        password: passwordDigest,
      });
      await em.persistAndFlush(user);
    } catch (error) {
      return {
        errors: [
          { field: "username", message: "that username is already in use" },
        ],
      };
    }
    return { user };
  }
}
```

The `UsernamePasswordInput` class is decorated with `InputType`, and `Field` for each property. The `UserResponse` `ObjectType` has a nullable errors field, which is an array of `FieldError`s. `FieldError` is another `ObjectType` with a `field` and `message` fields. `UserResponse` also has a nullable `user` field. 

In the `register` method the `options` arg (which is destructured immediately) is typed with `UsernamePasswordInput`, and it returns a `Promise` that resolves a `UserResponse`. 

`argon2` is installed with `yarn add argon2` and is used to hash the password into a passwordDigest, which is persisted as a new user in the database. If the user cannot be created, because the username already exists, it will return a `UserResponse` object with a relevant error, otherwise it will return a a `UserResponse` object with the user.

The `UserResolver` is then added to the resolvers array of the Apollo Server.

To log in as a user, in `server/src/resolvers/user.ts`:

```ts
  @Mutation(() => UserResponse)
  async login(
    @Arg("options") { username, password }: UsernamePasswordInput,
    @Ctx() { em }: ApolloContext,
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username });
    if (!user) {
      return {
        errors: [{ field: "username", message: "that username doesn't exist" }],
      };
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return {
        errors: [{ field: "password", message: "password doesn't match" }],
      };
    }

    return { user };
  }
```

Here the login mutation has the `UsernamePasswordInput` for its options arg as well. It attempts to find the user by the passed username, but if it cannot returns a `UserResponse` object with a `FieldError` with relevant messaging. If it did find a user by that username it will check if the hashed password matches the one stored for the user with `argon2.verify`. If it doesn't it returns a `UserResponse` object with a `FieldError` with relevant messaging. If it did match, it will return a `UserResponse` object with the user.

*Generally exposing information about the existence of a user is bad practice, for example if login failed because there was no user for that username, or because the username existed but the password is wrong. I will keep it as it is for now as I don't know if it would cause me to deviate greatly from the tutorial later on.*

To add some validation to user registration, if either the username or password is less that 2 characters in length return a `UserResponse` with a relevant `FieldError`. Also, handle an error more specifically by the error detail when attempting to persist the user with a potentially duplicate username:

```ts
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") { username, password }: UsernamePasswordInput,
    @Ctx() { em }: ApolloContext,
  ): Promise<UserResponse> {
    const errors = [];
    if (username.length < 2) {
      errors.push({
        field: "username",
        message: "length must be at least 2 characters",
      });
    }
    if (password.length < 2) {
      errors.push({
        field: "password",
        message: "length must be at least 2 characters",
      });
    }
    if (errors.length) {
      return { errors };
    }

    const passwordDigest = await argon2.hash(password);
    const user = em.create(User, {
      username,
      password: passwordDigest,
    });
    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.detail.includes("already exists")) {
        return {
          errors: [
            { field: "username", message: "that username is already in use" },
          ],
        };
      }
    }
    return { user };
  }
```

### Sessions and Authentication

Redis will be used to store user session tokens for quick access.

Install dependencies with:

```shell
yarn add redis connect-redis express-session
```

Install types with:

```shell
yarn add -D @types/redis @types/connect-redis @types/express-session
```

Set up redis following [this article](https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-database#install-redis).

Now in `server/src/index.ts`:

```ts
import express from "express";
import { MikroORM } from "@mikro-orm/core";
import mikroConfig from "./mikro-orm.config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";

import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { SESSION_SECRET, __prod__ } from "./constants";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();
  app.use(
    session({
      name: "qid",
      store: new RedisStore({ client: redisClient, disableTouch: true }),
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
    context: ({ req, res }): ApolloContext => ({ em: orm.em, req, res }),
  });
  apolloServer.applyMiddleware({ app });

  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`server started on port: `, PORT);
  });
};

main();
```

A `RedisStore` is created by passing `session` to `connectRedis`, and a `redisClient` is created with `redis.createClient()`. The express `app` uses session, passing a name of "qid", an instance of `RedisStore` passing the client and `disableTouch: true` to reduce the amount of traffic to redis. The cookie is given a max age of 10 years (for now), `httpOnly: true`, and `secure` (https) only when in the production environment. The secret is `SESSION_SECRET` taken from the `.env` file. `resave` is false, as we don't need to manually tell the store to update the session, as redis would do this automatically. `saveUninitialized` is false, because if nothing is added to a new session it does not need to be saved.

The context function gets the req and res from express, and passes those through, which are added to the ApolloContext type in `server/src/types.ts`:

```ts
import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from "express";

declare module "express-session" {
  interface Session {
    userId: number;
  }
}

export type ApolloContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request;
  res: Response;
};
```

Here, a module is declared for "express-session" to allow the TypeScript compiler to accept that a userId can be added to the Session object.

Now on the `login` mutation on `UserResolver`:

```ts
  @Mutation(() => UserResponse)
  async login(
    @Arg("options") { username, password }: UsernamePasswordInput,
    @Ctx() { em, req }: ApolloContext,
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username });
    if (!user) {
      return {
        errors: [{ field: "username", message: "that username doesn't exist" }],
      };
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return {
        errors: [{ field: "password", message: "password doesn't match" }],
      };
    }

    req.session.userId = user.id;

    return { user };
  }
```

The `req` is destructured from the context, `req.session.userId` is set with the user's id.

To make sure the cookie can be set via the GraphQL playground, open settings and add `"request.credentials": "include"` to the json object.

Also, set the same userId in session after the register mutation, so the user is essentially logged in after registration.

Adding a `me` query to `UserResolver`: 

```ts
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: ApolloContext): Promise<User | null> {
    const { userId } = req.session;
    if (!userId) return null;

    const user = await em.findOne(User, { id: userId });
    return user;
  }
```

Here, the query gets the `userId` off the session, if it does not exist, return null. Otherwise it will find the user with that id and return that. This could be null if the user doesn't exist by that id, in the case that the user potentially was deleted while the cookie was still active. This query is useful to periodically check if the user still exists and who they are.

Behind the scenes, when `session.userId` is set, the `express-session` middleware will take that and update that session in redis, and also sends instructions to store a signed cookie back to the browser.

### Install Next.js with Chakra UI

Initialise the client directory with:

```shell
yarn create next-app --example with-chakra-ui client
```

Dev server can be run with:

```shell
yarn dev
```

Clear boilerplate from `client/src/pages/index.js` and convert to `.tsx`.

Convert `client/src/pages/_app.js` and `client/src/theme.ts` to `.tsx`.

Clear the components directory of prebuilt components.

After these changes, running `yarn dev` prompts to install TypeScript with:

```shell
yarn add --dev typescript
```

Running dev server now automatically adds `client/tsconfig.json` and `client/next-env.d.ts`.

### Snippets

To make working in React easier, set up VSCode snippets in `typescriptreact.json` following [this guide](https://www.freecodecamp.org/news/definitive-guide-to-snippets-visual-studio-code/).

### Register Page

In `client/src/pages/register.tsx`:

```tsx
import React from "react";

interface RegisterProps {}

const Register: React.FC<RegisterProps> = ({}) => {
  return <div>register page</div>;
};

export default Register;
```

As this file is under the `pages` directory, Next.js will create a route based on the filename and render this component. This works on sub-directories too. 

Install formik with:

```shell
yarn add formik
```

In `client/src/components/Wrapper.tsx`:

```tsx
import { Box } from "@chakra-ui/layout";
import React from "react";

interface WrapperProps {
  variant?: "small" | "regular";
}

const Wrapper: React.FC<WrapperProps> = ({ children, variant = "regular" }) => {
  return (
    <Box
      mt={8}
      mx="auto"
      maxW={variant === "regular" ? "800px" : "400px"}
      w="100%"
    >
      {children}
    </Box>
  );
};

export default Wrapper;
```

`Wrapper` is a component that takes `WrapperProps`, which has an optional type that is a union of `"small"` or `"regular"`. It returns the Chakra UI layout element `Box` with some styling props (influenced by the `variant` prop) wrapping the children.

In `client/src/components/InputField.tsx`:

```tsx
import React, { InputHTMLAttributes } from "react";
import { useField } from "formik";
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
} from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
};

const InputField: React.FC<InputFieldProps> = ({
  label,
  size: _size,
  ...props
}) => {
  const [field, { error }] = useField(props);
  return (
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <Input {...field} {...props} id={field.name} />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
};

export default InputField;
```

Here, `InputField` is a component that takes props typed by `InputFieldProps`. `InputFieldProps` is an extension of `InputHTMLAttributes<HTMLInputElement>` as that is what the [`useField` custom React hook from Formik](https://formik.org/docs/api/useField) expects, allowing `props` to be passed straight to it.

`useField` provides a `FieldInputProps` object containing everything needed for the `Input`, and a second object with `error`

*It seems that `useField` would actually prefer to use the type `FieldHookConfig<string>`, which works with Formik's `Field` component, but `Input` from Chakra doesn't like this type when `FieldInputProps` is spread into it*.

`label` and `size` are destructured off `props` as they shouldn't be passed to `Input`.

The second object from `useField` is the `FieldMetaProps`, from which `error` is destructured and used to render the `FormErrorMessage` and validate the field when cast to a Boolean.

Back in `client/src/pages/register.tsx`:

```tsx
import React from "react";
import { Form, Formik } from "formik";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { Box } from "@chakra-ui/layout";
import { Button } from "@chakra-ui/react";

interface RegisterProps {}

const Register: React.FC<RegisterProps> = ({}) => {
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={console.log}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="Username"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Register
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default Register;
```

The `Register` component renders a small `Wrapper` containing a `Formik` form, with `InputField`s for username and password. It also renders a `Button` whose `isLoading` prop is passed the `isSubmitting` property from the [Formik](https://formik.org/docs/api/formik) render child props function ([read more](https://reactjs.org/docs/render-props.html)).

`Formik`'s `initialValues` is an object representing the fields of the form, which is passed directly to `console.log` in `onSubmit` for now.

### GraphQL Client

Install URQL and GrqphQL with:

```shell
yarn add urql graphql
```

In `client/src/pages/_app.tsx` add the URQL provider with client:

```tsx
import { ChakraProvider, ColorModeProvider } from "@chakra-ui/react";
import { Provider, createClient } from "urql";

import theme from "../theme";

const client = createClient({
  url: "http://localhost:4000/graphql",
  fetchOptions: {
    credentials: "include",
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <Provider value={client}>
      <ChakraProvider resetCSS theme={theme}>
        <ColorModeProvider
          options={{
            useSystemColorMode: true,
          }}
        >
          <Component {...pageProps} />
        </ColorModeProvider>
      </ChakraProvider>
    </Provider>
  );
}

export default MyApp;
```

The config object for the client is hardcoded with the url of the graphql backend for now, and `credentials: "include"` is added to be able to send cookies for authentication.

However, this will result in a Cross-Origin Resource Sharing (CORS) error if the server is not expecting it.

Install cors for the server with:

```shell
yarn add cors
```

And the types with

```shell
yarn add -D @types/cors
```

### Accepting CORS Requests

Then in `server/src/index.ts` apply cors as a middleware to the express app, passing an origin (set in the `.env` as `http://localhost:3000`), and credentials as true to allow the cookie. Also, set cors on the `apolloServer.applyMiddleware` to false, as it is already applied on express.

```ts
  import cors from "cors";

  ...

  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    }),
  );

  ...

  apolloServer.applyMiddleware({ app, cors: false });
```

### Register Mutation

Now in `client/src/pages/register.tsx`:

```tsx
import React from "react";
import { Form, Formik } from "formik";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { Box } from "@chakra-ui/layout";
import { Button } from "@chakra-ui/react";
import { useMutation } from "urql";

interface RegisterProps {}

const REGISTER_MUTATION = `
  mutation Register($username: String!, $password: String!) {
    register(options: { username: $username, password: $password }) {
      errors {
        field
        message
      }
      user {
        id
        createdAt
        updatedAt
        username
      }
    }
  }
`;

const Register: React.FC<RegisterProps> = ({}) => {
  const [_dataObject, register] = useMutation(REGISTER_MUTATION);
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={(values) => {
          console.log(`mutating with: `, values);
          return register(values);
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="Username"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Register
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default Register;
```

`REGISTER_MUTATION` is a string template for the register mutation, which has some variables `$username` and `$password` that are required to be non null strings by `String!`.

This is passed to URQL's `useMutation` hook, which return an object of data and a function to call the mutation `register` which is called in the `onSubmit` handler. `register` returns a promise, which when returned to `onSubmit` will resolve `isSubmitting` to false, stopping the loading spinner on the button.

### Generating GraphQL Types

To be able to generate a type from the query to be able to type the return of the hook, install the GrqphQL Code Generator cli with:

```shelll
yarn add -D @graphql-codegen/cli
```

Then run the initialiser wizard with:

```shell
yarn graphql-codegen init
```

Selecting the following options:

```shell
? What type of application are you building? Application built with React
? Where is your schema?: (path or url) http://localhost:4000/graphql
? Where are your operations and fragments?: src/graphql/**/*.graphql
? Pick plugins: TypeScript (required by other typescript plugins), TypeScript Operations (operations and fragments)
? Where to write the output: src/generated/graphql.tsx
? Do you want to generate an introspection file? No
? How to name the config file? codegen.yml
? What script in package.json should run the codegen? gen
```

Then install the `typescript-urql` plugin with:

```shell
yarn add -D @graphql-codegen/typescript-urql
```

And in `codegen.yml` manually add the plugin `typescript-urql`.

Then in `client/src/graphql/mutations/register.graphql`:

```graphql
mutation Register($username: String!, $password: String!) {
  register(options: { username: $username, password: $password }) {
    errors {
      field
      message
    }
    user {
      id
      username
    }
  }
}
```

And run `yarn gen` to generate types in `client/src/generated/graphql.tsx`.

There are types for the entire schema on the exposed on the backend, and custom typed URQL hooks, passing the generated types to the `useMutation` generics:

```ts
export function useRegisterMutation() {
  return Urql.useMutation<RegisterMutation, RegisterMutationVariables>(
    RegisterDocument,
  );
}
```

Now in `client/src/pages/register.tsx`:

```tsx
import React from "react";
import { Form, Formik } from "formik";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { Box } from "@chakra-ui/layout";
import { Button } from "@chakra-ui/react";
import { useRegisterMutation } from "../generated/graphql";

interface RegisterProps {}

const Register: React.FC<RegisterProps> = ({}) => {
  const [{ fetching, error, data }, register] = useRegisterMutation();
  console.log(`fetching`, fetching);
  console.log(`error`, error);
  console.log(`data`, data);
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={async (values) => {
          console.log(`mutating with: `, values);
          const response = await register(values);
          return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="Username"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Register
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default Register;
```

Instead of specifying the mutation and passing it to `useMutation`, `useRegisterMutation` is used, meaning the response resolved from the promise returned from `register` is now typed with what that mutation may return (potentially a user, and potentially an array of errors).

Now the workflow is:
- Add in a mutation/query to `client/src/graphql`
- Run `yarn gen`
- Use that custom generated hook in the component

### Render Register Errors and Handle Success

The errors that come back from the register mutation are an array of `FieldError`s, and need to be converted to an object map to be displayed by `Formik`.

In `client/src/utils/toErrorMap.ts`:

```ts
import { FieldError } from "../generated/graphql";

export const toErrorMap = (errors: FieldError[]) => {
  const errorMap: Record<string, string> = {};
  errors.forEach(({ field, message }) => {
    if (!errorMap[field]) {
      errorMap[field] = message;
    } else {
      errorMap[field].concat(` | ${message}`);
    }
  });
  return errorMap;
};
```

`toErrorMap` is a utility function that takes an array of `FieldError`s. `errorMap` is an object with the type `Record<string, string>` meaning it has keys that are strings which have values that are strings. `errors` is iterated through, and fields on the `errorMap` are either added, or concatenated onto, with a pipe spacer.

Now in the `Register` component:

```tsx
import React from "react";
import { Form, Formik } from "formik";
import { useRouter } from "next/router";
import { Box } from "@chakra-ui/layout";
import { Button } from "@chakra-ui/react";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { useRegisterMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";

interface RegisterProps {}

const Register: React.FC<RegisterProps> = ({}) => {
  const router = useRouter();
  const [_data, register] = useRegisterMutation();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await register(values);
          if (response.data?.register.errors) {
            setErrors(toErrorMap(response.data.register.errors));
          } else if (response.data?.register.user) {
            router.push("/");
          }
          return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="Username"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Register
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default Register;
```

If there were errors (using optional chaining to early return undefined if `data` does not exist) `setErrors` from the Formik helpers object can be called with the result of `toErrorMap` passing the errors.

Otherwise, if there is a user push to the homepage using Next.js's `useRouter` hook.

### Login Page

The login page will be very similar to the register page

In `client/src/graphql/mutations/login.graphql`, a very similar mutation for logging in, except that instead of specifying both a `$username` and `$password` as `String!`, the variable is the entire `$options` object as a `UsernamePasswordInput!`:

```graphql
mutation Login($options: UsernamePasswordInput!) {
  login(options: $options) {
    errors {
      field
      message
    }
    user {
      id
      username
    }
  }
}
```

And run `yarn gen` to generate types and mutation hooks.

Then in `client/src/pages/login.tsx`:

```tsx
import React from "react";
import { Form, Formik } from "formik";
import { useRouter } from "next/router";
import { Box } from "@chakra-ui/layout";
import { Button } from "@chakra-ui/react";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { useLoginMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";

interface LoginProps {}

const Login: React.FC<LoginProps> = ({}) => {
  const router = useRouter();
  const [_data, login] = useLoginMutation();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await login({ options: values });
          if (response.data?.login.errors) {
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            router.push("/");
          }
          return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="Username"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Log in
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default Login;
```

The `Login` component is very similar to `Register`, however as it uses the slightly different `options` variable for the mutation, `values` needs to be remapped when calling the `login` mutation.

### NavBar

In `client/src/components/NavBar.tsx`:

```tsx
import React from "react";
import { Box, Flex, Link } from "@chakra-ui/layout";
import NextLink from "next/link";
import { useMeQuery } from "../generated/graphql";
import { Button } from "@chakra-ui/button";

interface NavBarProps {}

const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ data, fetching }] = useMeQuery();

  let body;
  if (fetching) {
    body = null;
  } else if (!data?.me) {
    body = (
      <>
        <NextLink href="/login">
          <Link color="white" mr={2}>
            Log in
          </Link>
        </NextLink>
        <NextLink href="/register">
          <Link color="white">Register</Link>
        </NextLink>
      </>
    );
  } else {
    body = (
      <>
        <Box mr={2}>{data.me.username}</Box>
        <Button variant="link">Log out</Button>
      </>
    );
  }

  return (
    <Flex bg="teal" p={4}>
      <Flex ml="auto">{body}</Flex>
    </Flex>
  );
};

export default NavBar;
```

The `NavBar` uses the custom query hook `useMeQuery` generated from the `me` GraphQL query, and conditionally renders log in and register links if not logged in, or a logout button if logged in. `NextLink` from `next/link` is used to create links to the other pages.

The `NavBar` is rendered in the `Index` component.

### Caching GraphQL Responses

Install Graphcache with:

```shell
yarn add @urql/exchange-graphcache
```

In `client/src/pages/_app.tsx`:

```tsx
import { ChakraProvider, ColorModeProvider } from "@chakra-ui/react";
import { cacheExchange, Cache, QueryInput } from "@urql/exchange-graphcache";
import { Provider, createClient, dedupExchange, fetchExchange } from "urql";
import {
  LoginMutation,
  MeDocument,
  MeQuery,
  RegisterMutation,
} from "../generated/graphql";
import theme from "../theme";

function typedUpdateQuery<Result, Query>(
  cache: Cache,
  qi: QueryInput,
  result: any,
  fn: (r: Result, q: Query) => Query,
) {
  return cache.updateQuery(qi, (data) => fn(result, data as any) as any);
}

const client = createClient({
  url: "http://localhost:4000/graphql",
  fetchOptions: {
    credentials: "include",
  },
  exchanges: [
    dedupExchange,
    cacheExchange({
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
        },
      },
    }),
    fetchExchange,
  ],
});

function MyApp({ Component, pageProps }: any) {
  return (
    <Provider value={client}>
      <ChakraProvider resetCSS theme={theme}>
        <ColorModeProvider
          options={{
            useSystemColorMode: true,
          }}
        >
          <Component {...pageProps} />
        </ColorModeProvider>
      </ChakraProvider>
    </Provider>
  );
}

export default MyApp;
```

Here, the client takes a array of [exchanges](https://formidable.com/open-source/urql/docs/architecture/#the-exchanges), which are used for resolving GraphQL requests. The `cacheExchange` is the [alternate normalised cache from URQL](https://formidable.com/open-source/urql/docs/graphcache/). This allows full control of how the cache is updated, especially useful in the case where the usual exchange cannot infer what's going on.

Mutations and subscriptions use [updaters](https://formidable.com/open-source/urql/docs/graphcache/cache-updates/) to update links and relations in the cache. The updaters have four parameters: 
- The `result` which is the response to the request
-  `args` which is the arguments that the request was made with
-  The `cache` object, with methods to interact with and update the cache
-  `info` containing information about the traversal of the query document.

`typedUpdateQuery` is a function that allows the `cache.updateQuery` method to be typed with generics, taking a `Result` which is the returned object from the request, and a `Query` which is the query or mutation document the request was made with. These are used to type the parameters of the function that is passed that updates the query in the cache. the `cache` and `qi` are typed as `Cache` and `QueryInput` from Graphcache. The function then calls `cache.updateQuery` with `qi` as the first argument (the document to update), and then a callback function that passes through `result` (the return of the API call) with `data` (the current state of the cache) to the function we provide.  

For example the `login` updater uses the types `LoginMutation` for `Result` and `MeQuery` for the `Query` and passes through the cache, qi object with the `MeDocument`, the result, and the callback function. In the callback function if the result (`r`) has errors, return the current data in the cache (`q`), otherwise return data with the user from the login mutation to update the `MeDocument` in the cache.

### Refactoring a User Fragment

In `client/src/graphql/fragments/RegularUser.graphql` add a fragment:

```graphql
fragment RegularUser on User {
  id
  username
}
```

Which can be used to DRY up the GraphQL documents where this is used, for example in `client/src/graphql/mutations/login.graphql`:

```graphql
mutation Login($options: UsernamePasswordInput!) {
  login(options: $options) {
    errors {
      field
      message
    }
    user {
      ...RegularUser
    }
  }
}
```

### Logout

In `server/src/resolvers/user.ts`:

```ts
  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: ApolloContext) {
    return new Promise((resolve) =>
      req.session.destroy((error) => {
        res.clearCookie(COOKIE_NAME);
        if (error) {
          resolve(false);
          return;
        }
        resolve(true);
      }),
    );
  }
```

The `logout` resolver is a mutation returning a boolean. It brings the request and response from the context and returns a promise whose executor callback calls `req.session.destroy` to attempt to clear the session from Redis. the callback from `destroy` may have an error, and resolves false then returns, if there is no error resolve true. In either case, `res.clearCookie` is called with `COOKIE_NAME` (which is `qid`, extracted to constants) which instructs the browser to delete its `qid` cookie.

In `client/src/graphql/mutations/logout.graphql`:

```graphql
mutation Logout {
  logout
}
```

And `yarn gen` to generate types.

In `client/src/components/NavBar.tsx`:

```tsx
import React from "react";
import { Box, Flex, Link } from "@chakra-ui/layout";
import NextLink from "next/link";
import { useLogoutMutation, useMeQuery } from "../generated/graphql";
import { Button } from "@chakra-ui/button";

interface NavBarProps {}

const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
  const [{ data, fetching }] = useMeQuery();

  let body;
  if (fetching) {
    body = null;
  } else if (!data?.me) {
    body = (
      <>
        <NextLink href="/login">
          <Link color="white" mr={2}>
            Log in
          </Link>
        </NextLink>
        <NextLink href="/register">
          <Link color="white">Register</Link>
        </NextLink>
      </>
    );
  } else {
    body = (
      <>
        <Box mr={2}>{data.me.username}</Box>
        <Button
          variant="link"
          onClick={() => logout()}
          isLoading={logoutFetching}
        >
          Log out
        </Button>
      </>
    );
  }

  return (
    <Flex bg="teal" p={4}>
      <Flex ml="auto">{body}</Flex>
    </Flex>
  );
};

export default NavBar;
```

The `useLogoutMutation` custom mutation hook is used, and is passed to the log out button's `onClick`. The log out button's `isLoading` is passed `logoutFetching`, renamed from the data object to avoid name clash.

Now the cache is updated when the `Logout` mutation returns, in `client/src/pages/_app.tsx`:

```ts
         ...

          logout: (result, _args, cache, _info) => {
            typedUpdateQuery<LogoutMutation, MeQuery>(
              cache,
              { query: MeDocument },
              result,
              () => ({ me: null }),
            );
          },

         ...
```

This simply sets the `me` document in the cache to null.

### Server Side Rendering

Install the dependencies with:

```shell
yarn add next-urql react-is isomorphic-unfetch
```

Extract the logic to create the URQL client to `client/src/utils/createUrqlClient.ts`:

```ts
import { dedupExchange, fetchExchange } from "urql";
import { cacheExchange } from "@urql/exchange-graphcache";
import {
  LoginMutation,
  MeQuery,
  MeDocument,
  RegisterMutation,
  LogoutMutation,
} from "../generated/graphql";
import { typedUpdateQuery } from "./typedUpdateQuery";

export const createUrqlClient = (ssrExchange: any) => ({
  url: "http://localhost:4000/graphql",
  fetchOptions: {
    credentials: "include" as const,
  },
  exchanges: [
    dedupExchange,
    cacheExchange({
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
          logout: (result, _args, cache, _info) => {
            typedUpdateQuery<LogoutMutation, MeQuery>(
              cache,
              { query: MeDocument },
              result,
              () => ({ me: null }),
            );
          },
        },
      },
    }),
    ssrExchange,
    fetchExchange,
  ],
});
```

The only thing that has changed is that the function `createUrqlClient` takes an `ssrExchange` for server side rendering, that is added to the exchanges array. Also `credentials: "include"` is cast to const, so it is a concrete type rather than the `string` type.

`typedUpdateQuery` is also extracted to its own utility file.

Now, each page can choose which client is uses, for example in `client/src/pages/index.tsx`:

```tsx
import { withUrqlClient } from "next-urql";
import NavBar from "../components/NavBar";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../generated/graphql";

const Index = () => {
  const [{ fetching, data }] = usePostsQuery();
  return (
    <>
      <NavBar />
      {fetching && <div>loading...</div>}
      {data && data.posts.map((p) => <div key={p.id}>{p.title}</div>)}
    </>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
```

`withUrqlClient` is a function that injects the `ssrExchange` into `createUrqlCLient` based on the `ssr` in the options object. It returns a higher order component that wraps `Index`.

To have something to server side render, Index uses `usePostsQuery` generated from the Posts query

However, now the entire `MyApp` component isn't wrapped in an URQL provider, each component making a GraphQL request needs to be wrapped in the HOC. For example in `client/src/pages/register.tsx`:

```tsx
...

export default withUrqlClient(createUrqlClient)(Register);
```

And similarly in `client/src/pages/register.tsx`:

```tsx
...

export default withUrqlClient(createUrqlClient)(Login);
```

These components don't fetch anything that would benefit from server side rendering, so they don't use it.

### Skipping Queries on SSR

The `me` query on `NavBar` will always return `null` when server side rendered, because the Next.js server doesn't use cookies, only the browser does. However Next.js will still make the query, so it can be turned off by checking if we are on the server with the `isServer` util in `client/src/utils/isServer.ts`:

```ts
export const isServer = () => typeof window === "undefined";
```

And use that in `NavBar` (or any other place where a GrqphQL request should only run in the browser):

```tsx
const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
  const [{ data, fetching }] = useMeQuery({
    pause: isServer(),
  });

   ...
};

export default NavBar;
```

### Add Email to User

In order to reset a password, users need email addresses.

Add the email field, very similar to the username field, to the User entity in `server/src/entities/User.ts`:

```tsx
  ...

  @Field(() => String)
  @Property({ type: "text", unique: true })
  email!: string;

  ...
```

Then run create the migration with `yarn migration:create`.

*MikroORM complains that it can't perform the migration because existing records in the user table don't have emails, so I deleted those for the sake of speed rather than allowing that column to be null or performing some migration for the existing test users.*

Add the `email` field to `UsernamePasswordInput`, and extract it to `server/src/types.ts` along with `FieldErrors`:

```ts
@InputType()
export class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;

  @Field()
  email: string;
}
```

Extract register validations to `server/src/utils/validateRegister.ts`:

```ts
import isEmail from "validator/lib/isEmail";
import { UsernamePasswordInput, FieldError } from "../types";

export const validateRegister = ({
  username,
  email,
  password,
}: UsernamePasswordInput): FieldError[] | null => {
  const errors = [];
  if (!isEmail(email)) {
    errors.push({
      field: "email",
      message: "invalid email",
    });
  }
  if (username.length < 2) {
    errors.push({
      field: "username",
      message: "length must be at least 2 characters",
    });
  }
  if (username.includes("@")) {
    errors.push({
      field: "username",
      message: "cannot contain '@'",
    });
  }
  if (password.length < 2) {
    errors.push({
      field: "password",
      message: "length must be at least 2 characters",
    });
  }
  if (errors.length) {
    return errors;
  }
  return null;
};
```

`validateRegister` takes options in the shape of `UsernamePasswordInput` and returns either an array of `FieldError`s or `null`. Email is validated using the `isEmail` function from `validator` (installed with `yarn add validator`). Also added is a check that the username cannot contain `@`.

Update the `UserResolver` `register` mutation:

```ts
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: ApolloContext,
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) return { errors };

    const { username, email, password } = options;
    const passwordDigest = await argon2.hash(password);
    const user = em.create(User, {
      username,
      email,
      password: passwordDigest,
    });
    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.detail.includes("already exists")) {
        return {
          errors: [
            { field: "username", message: "that username is already in use" },
          ],
        };
      }
    }

    req.session.userId = user.id;

    return { user };
  }
```

`register` uses the `validateRegister` util and returns errors if there are any, then saves the `email` along with `username` and `passwordDigest`.

The `login` mutation:

```ts
  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { em, req }: ApolloContext,
  ): Promise<UserResponse> {
    const findByEmail = isEmail(usernameOrEmail);
    let user = await em.findOne(
      User,
      findByEmail ? { email: usernameOrEmail } : { username: usernameOrEmail },
    );
    if (!user) {
      return {
        errors: [
          { field: "usernameOrEmail", message: "that user doesn't exist" },
        ],
      };
    }
```

Here, the `isEmail` function is used to decide which field should be queried with `usernameOrEmail`. *It could possibly try the other field if it isn't found the first time, but given that no `@` are allowed in usernames it seems very unlikely that an input would be miscategorised.*

Adding in `email` and changing login to `usernameOrEmail` requires updates to `client/src/graphql/mutations/login.graphql`:

```graphql
mutation Login($usernameOrEmail: String!, $password: String!) {
  login(usernameOrEmail: $usernameOrEmail, password: $password) {
    errors {
      field
      message
    }
    user {
      ...RegularUser
    }
  }
}
```

And `client/src/graphql/mutations/register.graphql`:

```graphql
mutation Register($options: UsernamePasswordInput!) {
  register(options: $options) {
    errors {
      field
      message
    }
    user {
      ...RegularUser
    }
  }
}
```

After which types can be regenerated with `yarn gen`.

In `client/src/pages/login.tsx` the form field `username` is changed to `usernameOrEmail`:

```tsx
      ...
      <Formik
        initialValues={{ usernameOrEmail: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await login(values);
          if (response.data?.login.errors) {
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            router.push("/");
          }
          return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="usernameOrEmail"
              placeholder="username or email"
              label="Username or Email"
            />

            ...

          </Form>
       ...
```

And in `client/src/pages/register.tsx` an additional field for `email` is added:

```tsx
      ...
      <Formik
        initialValues={{ username: "", email: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await register({ options: values });
          if (response.data?.register.errors) {
            setErrors(toErrorMap(response.data.register.errors));
          } else if (response.data?.register.user) {
            router.push("/");
          }
          return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            ...
            <Box mt={4}>
              <InputField name="email" placeholder="email" label="Email" />
            </Box>
            ...
          </Form>
       ...

```

### Nodemailer Setup

Now that users have emails, there needs to be a way to send emails.

In order to send email install Nodemailer on the server with:

```shell
yarn add nodemailer
```

And install types with:

```shell
yarn add -D @types/nodemailer
```

*Nodemailer was installed slightly earlier in the commit history, but makes sense to add it to the dev journal here.*

In `server/src/utils/sendEmail.ts`:

```ts
import nodemailer from "nodemailer";
import {
  MAILER_HOST,
  MAILER_PASS,
  MAILER_PORT,
  MAILER_USER,
} from "../constants";

export async function sendEmail(to: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: MAILER_HOST,
    port: MAILER_PORT,
    secure: false,
    auth: {
      user: MAILER_USER,
      pass: MAILER_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>',
    to,
    subject: "Reset Password",
    html,
  });

  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
```

The `sendEmail` utility function takes `to` and `html` as strings, creates a transport and then uses that to send the email. `MAILER_HOST`, `MAILER_PASS`, `MAILER_PORT`, `MAILER_USER`, are constants coming from the `.env`. For testing purposes they are set to an Ethereal email, provided by Nodemailer. 

To create test email accounts, in `server/src/createTestEmail.ts`:

```ts
import nodemailer from "nodemailer";

const createTestEmail = async () => {
  console.log(await nodemailer.createTestAccount());
};

createTestEmail();
```

The `createTestEmail` function simply logs the test account created by `nodemailer.createTestAccount`. The test accounts don't last forever, so new ones can be created when needed using the script added to `server/package.json`:

```json
    "testEmail:create": "node dist/createTestEmail.js",
```

Which provides account details such as this: 

```js
{
  user: 'iyzrrucbdcrdkjze@ethereal.email', // MAILER_USER
  pass: '4KnyWHdHDs4nMPycqh',              // MAILER_PASS
  smtp: { host: 'smtp.ethereal.email', port: 587, secure: false }, // MAILER_HOST and MAILER_PORT
  imap: { host: 'imap.ethereal.email', port: 993, secure: true },
  pop3: { host: 'pop3.ethereal.email', port: 995, secure: true },
  web: 'https://ethereal.email'
}
```

### Reset Password Email

Users can enter an email to reset the password for that account (if it exists). The operation should be associated with a one use token.

Install uuid and ioredis (to replace the redis library currently in use which doesn't support async/await out of the box):

```shell
yarn add uuid ioredis
```

And the types with:

```shell
yarn add -D @types/uuid @types/ioredis
```

Replacing redis with ioredis in `server/src/index.ts`:

```ts
...
import ioredis from "ioredis";
...

const main = async () => {
  ...
  const redis = new ioredis();
  ...
  const apolloServer = new ApolloServer({
    ...
    context: ({ req, res }): ApolloContext => ({ em: orm.em, req, res, redis }),
  });
};
```

The redis instance is passed through the apollo server context also, which is added to the `ApolloContext` type in `server/src/types.ts`:

```ts
import { Redis } from "ioredis";

...

export type ApolloContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request;
  res: Response;
  redis: Redis;
};
```

Now the replaced redis library can be removed with:

```shell
yarn remove redis
```

In `server/src/resolvers/user.ts`:

```ts
  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: ApolloContext,
  ) {
    const user = await em.findOne(User, { email });
    if (!user) return true;

    const token = v4();

    const threeDays = 1000 * 60 * 24 * 3;
    redis.set(`${FORGOT_PASSWORD_PREFIX}${token}`, user.id, "ex", threeDays);

    const resetPasswordBody = `<a href="${CORS_ORIGIN}/change-password/${token}">Reset password</a>`;
    await sendEmail(user.email, resetPasswordBody);

    return true;
  }
```

The `forgotPassword` mutation resolver takes an email and attempts to find the user by that email. If it can't it returns true immediately. If the user exists it creates a token using uuid's `v4` function, and uses `redis` from the context to set a key using a the new `FORGOT_PASSWORD_PREFIX` from `server/src/constants.ts`:

```ts
export const FORGOT_PASSWORD_PREFIX = "forgot-password:";
```

This prefix allows the purpose of the key to easily be identified. The expiry of the key is set to three days.

The body for the email (a single anchor tag at the moment) is created and passed with the user's email to the `sendEmail` function.

The function returns true regardless if the user was found so the client does not get information that the user exists or not.

The link that is generated isn't yet created, so a page needs to be created at `client/src/pages/change-password/[token].tsx`. The bracket here is part of a Next.js convention that this part of the url is variable:

```tsx
import React from "react";
import { Form, Formik } from "formik";
import { NextPage } from "next";
import { Button } from "@chakra-ui/react";
import Wrapper from "../../components/Wrapper";
import InputField from "../../components/InputField";

const ChangePassword: NextPage<{ token: string }> = ({ token }) => {
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ password: "" }}
        onSubmit={(values) => {
          console.log('values', values)
          console.log('token', token)
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="password"
              placeholder="new password"
              label="New password"
              type="password"
            />
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Change password
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

ChangePassword.getInitialProps = ({ query }) => {
  return {
    token: query.token as string,
  };
};

export default ChangePassword;
```

The `ChangePassword` component is a `NextPage`, and its `getInitialProps` function is defined to get the token from the query string, cast as a string. The token can then be taken from the props and for now, is logged with the values on form submission.

The form needs a mutation to change the password on submit. In the `UserResolver`:

```ts
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("password") password: string,
    @Ctx() { em, redis, req }: ApolloContext,
  ): Promise<UserResponse> {
    const errors: FieldError[] = [];

    const passwordErrors = validatePassword(password);
    if (passwordErrors) errors.push(...passwordErrors);

    const key = `${FORGOT_PASSWORD_PREFIX}${token}`;
    const userId = await redis.get(key);
    if (!userId) {
      errors.push({
        field: "token",
        message: "token expired",
      });
    }

    if (errors.length) return { errors };

    const user = await em.findOne(User, { id: parseInt(userId as string) });
    if (!user) {
      errors.push({
        field: "user",
        message: "user no longer exists",
      });
      return { errors };
    }

    const passwordDigest = await argon2.hash(password);
    user.password = passwordDigest;
    await em.persistAndFlush(user);

    await redis.del(key);

    req.session.userId = user.id;

    return { user };
  }
```

The `changePassword` mutation takes a `token` and `password` that are strings, and returns a promise that resolves to a `UserResponse`. It validates the `password` using a newly abstracted `validatePassword` utility that returns an array of `FieldErrors` or `null`. If then attempts to get the `userId` which should be stored in Redis by the key of the `token` with the `FORGOT_PASSWORD_PREFIX`. If it doesn't find the key because it is expired (or the token has been tampered with) it adds a token error, and then if there are any errors at this point returns the errors. If it did find the `userId` then it fetches the `user`. If there is no user (in the case the user was deleted in the interim before the reset password email was used) it returns a relevant error. If it did find the `user` it then hashes and saves the new password, and sets the session, removes the key from redis, and then returns the `user`.

*Note that `userId` is cast as a string when finding the `user`, as if there were any errors, they would have already been returned before this point. However, the compiler was not able to infer that this is the case.*

Back in the `ChangePassword` component: 

```tsx
import React, { useState } from "react";
import { Form, Formik } from "formik";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Alert, AlertIcon, Button, Link } from "@chakra-ui/react";
import Wrapper from "../../components/Wrapper";
import InputField from "../../components/InputField";
import { toErrorMap } from "../../utils/toErrorMap";
import { useChangePasswordMutation } from "../../generated/graphql";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../../utils/createUrqlClient";
import NextLink from "next/link";

const ChangePassword: NextPage<{ token: string }> = ({ token }) => {
  const router = useRouter();
  const [_data, changePassword] = useChangePasswordMutation();
  const [tokenError, setTokenError] = useState("");
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ password: "" }}
        onSubmit={async ({ password }, { setErrors }) => {
          const response = await changePassword({ password, token });
          if (response.data?.changePassword.errors) {
            const errorMap = toErrorMap(response.data.changePassword.errors);
            if ("token" in errorMap) setTokenError(errorMap.token);
            setErrors(errorMap);
          } else if (response.data?.changePassword.user) {
            router.push("/");
          }
          return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="password"
              placeholder="new password"
              label="New password"
              type="password"
            />
            {tokenError ? (
              <>
                <Alert mt={4} mb={4} status="error">
                  <AlertIcon />
                  {tokenError}
                </Alert>
                <NextLink href="/forgot-password">
                  <Link>Reset password again</Link>
                </NextLink>
              </>
            ) : (
              <Button
                mt={4}
                isLoading={isSubmitting}
                type="submit"
                colorScheme="teal"
              >
                Change password
              </Button>
            )}
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

ChangePassword.getInitialProps = ({ query }) => {
  return {
    token: query.token as string,
  };
};

export default withUrqlClient(createUrqlClient)(ChangePassword as any);
```

The `useChangePasswordMutation` hook is used, generated from `changePassword.graphql. When handling the errors if there is a key `token` in the map, the errors is set in state `tokenError`. If there is a `tokenError` the change password button is switched out for an alert displaying the error, and a link to reset the password again.

*`ChangePassword` is cast as any when passed to the `withUrqlClient` HOC to stop TypeScript complaining about something I couldn't quite work out*

Finally, the changePassword cache updater is added to the `cacheExchange` in `client/src/utils/createUrqlClient.ts`:

```ts
         ...
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
         ...
```

It does a very similar update to the login and register updaters.

To request a reset password email, in `client/src/pages/forgot-password.tsx`:

```tsx
import React, { useState } from "react";
import { Form, Formik } from "formik";
import { withUrqlClient } from "next-urql";
import { Alert, AlertIcon, Button } from "@chakra-ui/react";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { useForgotPasswordMutation } from "../generated/graphql";
import { createUrqlClient } from "../utils/createUrqlClient";

interface ForgotPasswordProps {}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({}) => {
  const [_data, forgotPassword] = useForgotPasswordMutation();
  const [success, setSuccess] = useState(false);
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "" }}
        onSubmit={async (values) => {
          const response = await forgotPassword(values);
          if (response.data?.forgotPassword) {
            setSuccess(true);
          }
          return response;
        }}
      >
        {({ isSubmitting }) =>
          success ? (
            <Alert mt={4} mb={4} status="success">
              <AlertIcon />
              Password reset email sent!
            </Alert>
          ) : (
            <Form>
              <InputField
                name="email"
                placeholder="email"
                label="Email"
                type="email"
              />
              <Button
                mt={4}
                isLoading={isSubmitting}
                type="submit"
                colorScheme="teal"
              >
                Reset password
              </Button>
            </Form>
          )
        }
      </Formik>
    </Wrapper>
  );
};

export default withUrqlClient(createUrqlClient)(ForgotPassword);
```

The `ForgotPassword` component is very similar to the previous components, with an email field in the form that when submitted calls the `forgotPassword` mutation. Once the response is back `success` is set to true, and a message is displayed.

*The ForgotPassword mutation could be altered to accept either an email or username, similar to login. Perhaps this will be altered in future.*

Also, added a button to reset password in the `Login` component:

```tsx
            ...
            <Button
              ml={4}
              mt={4}
              variant="ghost"
              colorScheme="teal"
              color="black"
              onClick={() => {
                router.push("/forgot-password");
              }}
            >
              Forgot password
            </Button>
            ...
```

### Further Fragmenting GraphQL

Currently the `RegularUser` is the only fragment, however each of the `register`, `login`, and `changePassword` mutations return very similar things that could be fragmented further.

In `client/src/graphql/fragments/RegularError.graphql`:

```graphql
fragment RegularError on FieldError {
  field
  message
}
```

`RegularError` is composed with `RegularUser` into `RegularUserResponse` in `client/src/graphql/fragments/RegularUserResponse.graphql`:

```graphql
fragment RegularUserResponse on UserResponse {
  errors {
    ...RegularError
  }
  user {
    ...RegularUser
  }
}
```

Which in turn is used on the mutations, for example `login` becomes:

```graphql
mutation Login($usernameOrEmail: String!, $password: String!) {
  login(usernameOrEmail: $usernameOrEmail, password: $password) {
    ...RegularUserResponse
  }
}
```

### Replacing MikroORM with TypeORM

Install TypeORM with:

```shell
yarn add typeorm
```

TypeORM has a similar setup in concept to MikroORM, but with some differences in syntax. In `server/src/index.ts`:

```ts
...
import { createConnection } from "typeorm";

import typeormConfig from "./typeorm.config";
...

const main = async () => {
  await createConnection(typeormConfig);

  ...

  const apolloServer = new ApolloServer({
    ...
    context: ({ req, res }): ApolloContext => ({ req, res, redis }),
  });
...
};

main();
```


The connection is created using the `typeormConfig`, and the `em` no longer needs to be passed through context any more, so is removed from `ApolloContext`. 

In `server/src/typeorm.config.ts`:

```ts
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
```

`typeormConfig` is typed as TypeORM's `ConnectionOptions`. The `synchronize` option will create the database schema without the need for migrations on every application launch, good for development but not good for production, as it could destroy data.

`server/src/mikro-orm.config.ts` is also removed.

The entities are updated also, for example in `server/src/entities/User.ts`:

```ts
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => String)
  @Column({ unique: true })
  username!: string;

  @Field(() => String)
  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;
}
```

The `User` entity extends the TypeORM `BaseEntity`, allowing calls such as `User.find()` etc. The `Property` decorators are switched for `Column`s, and in the case of the `createdAt` and `updatedAt`, specific `CreateDateColumn` and `UpdateDateColumn` decorators are used. TypeORM is also better at inferring the correct column type, so now only options for uniqueness are passed. Similar changes are also made in `server/src/entities/Post.ts`

The resolvers now need to use TypeORM. In the PostResolver:

```ts
import { Post } from "../entities/Post";
import { Arg, Mutation, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => Post)
  async createPost(@Arg("title") title: string): Promise<Post> {
    return Post.create({ title }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("title", () => String, { nullable: true }) title: string,
    @Arg("id") id: number,
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) return null;

    if (typeof title !== "undefined") {
      post.title = title;
      await post.save();
    }
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<Boolean> {
    await Post.delete(id);
    return true;
  }
}
```

As `em` is no longer needed, all context arguments are removed, simplifying things greatly. TypeORM seems quite similar to Mongoose in terms of the entity and methods available.

Similarly in the `UserResolver`:

```ts
import argon2 from "argon2";
import { User } from "../entities/User";
import { ApolloContext, FieldError, UsernamePasswordInput } from "../types";
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { v4 } from "uuid";
import { COOKIE_NAME, CORS_ORIGIN, FORGOT_PASSWORD_PREFIX } from "../constants";
import { validatePassword, validateRegister } from "../utils/validators";
import isEmail from "validator/lib/isEmail";
import { sendEmail } from "../utils/sendEmail";

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: ApolloContext): Promise<User | undefined> {
    const { userId } = req.session;
    if (!userId) return;

    return User.findOne(userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: ApolloContext,
  ): Promise<UserResponse> {
    let errors = validateRegister(options);
    if (errors) return { errors };

    const { username, email, password } = options;

    const existingUsers = await User.find({ where: [{ username }, { email }] });
    errors = existingUsers.flatMap((existingUser) => {
      const existingUserErrors = [];
      if (existingUser.email === email) {
        existingUserErrors.push({
          field: "email",
          message: "that email is already in use",
        });
      }
      if (existingUser.username === username) {
        existingUserErrors.push({
          field: "username",
          message: "that username is already in use",
        });
      }
      return existingUserErrors;
    });
    if (errors.length) return { errors };

    const passwordDigest = await argon2.hash(password);

    const user = await User.create({
      username,
      email,
      password: passwordDigest,
    }).save();

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: ApolloContext,
  ): Promise<UserResponse> {
    const findByEmail = isEmail(usernameOrEmail);
    let user = await User.findOne(
      findByEmail ? { email: usernameOrEmail } : { username: usernameOrEmail },
    );
    if (!user) {
      return {
        errors: [
          { field: "usernameOrEmail", message: "that user doesn't exist" },
        ],
      };
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return {
        errors: [{ field: "password", message: "password doesn't match" }],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: ApolloContext,
  ) {
    const user = await User.findOne({ email });
    if (!user) return true;

    const token = v4();

    const threeDays = 1000 * 60 * 24 * 3;
    redis.set(`${FORGOT_PASSWORD_PREFIX}${token}`, user.id, "ex", threeDays);

    const resetPasswordBody = `<a href="${CORS_ORIGIN}/change-password/${token}">Reset password</a>`;
    await sendEmail(user.email, resetPasswordBody);

    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("password") password: string,
    @Ctx() { redis, req }: ApolloContext,
  ): Promise<UserResponse> {
    const errors: FieldError[] = [];

    const passwordErrors = validatePassword(password);
    if (passwordErrors) errors.push(...passwordErrors);

    const key = `${FORGOT_PASSWORD_PREFIX}${token}`;
    const userId = await redis.get(key);
    if (!userId) {
      errors.push({
        field: "token",
        message: "token expired",
      });
    }

    if (errors.length) return { errors };

    const user = await User.findOne(parseInt(userId as string));
    if (!user) {
      errors.push({
        field: "user",
        message: "user no longer exists",
      });
      return { errors };
    }

    const passwordDigest = await argon2.hash(password);
    user.password = passwordDigest;
    await user.save();

    await redis.del(key);

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: ApolloContext) {
    return new Promise((resolve) =>
      req.session.destroy((error) => {
        res.clearCookie(COOKIE_NAME);
        if (error) {
          resolve(false);
          return;
        }
        resolve(true);
      }),
    );
  }
}
```

The resolvers are largely the same, however in the register resolver I have taken the approach to find any users by the passed username and email, then return any errors due to conflicting unique values here.

In the previous implementation an error was returned when catching a duplicate value error, however now email has been included, this could be one of two duplicate value errors. It seems better for the user experience to return both potential errors at the same time, rather than having them find out on separate attempts if their username and email is already taken. The cost is that two SQL queries are made, however I think this is worth it.

A more performative, but perhaps frustrating implementation could be:

```ts
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: ApolloContext,
  ): Promise<UserResponse> {
    let errors = validateRegister(options);
    if (errors) return { errors };

    const { username, email, password } = options;
    const passwordDigest = await argon2.hash(password);

    let user;
    try {
      const result = await User.createQueryBuilder()
        .insert()
        .values({
          username,
          email,
          password: passwordDigest,
        })
        .returning("*")
        .execute();
      user = result.raw[0];
    } catch (error) {
      const errors = [];
      const details: string = error.details;
      if (
        details.includes("Key (username)") &&
        details.includes("already exists")
      ) {
        errors.push({
          field: "username",
          message: "that username is already in use",
        });
      }
      if (
        details.includes("Key (email)") &&
        details.includes("already exists")
      ) {
        errors.push({
          field: "email",
          message: "that email is already in use",
        });
      }
      return { errors };
    }

    req.session.userId = user.id;

    return { user };
  }
```

Here, `createQueryBuilder` is used to construct a query that will insert the fields into the user table, returning everything. The `user` can then be constructed form the result's raw output. A similar conversion of caught errors to error arrays is performed, however only the email or username will be thrown at one time.

I would use this approach for more frequent inserts that have fewer restraints.

Finally, MikroOrm migrations are deleted, related scripts and config removed from `server/package.json`, and the package uninstalled with:

```
yarn remove @mikro-orm/cli @mikro-orm/core @mikro-orm/migrations @mikro-orm/postgresql
```

### Expanding on Users and Posts

Posts will have a many to one relationship to Users. Posts will also have text, and points.

In `server/src/entities/Post.ts` the following columns are added:

```ts
  @Field(() => String)
  @Column()
  text!: string;

  @Field(() => Int)
  @Column({ default: 0 })
  points!: number;

  @Field(() => Int)
  @Column()
  creatorId!: number;

  @ManyToOne(() => User, (user) => user.posts)
  creator: User;
```

Here the `text` and `points` columns are pretty straightforward, and similar to those seen before. The `creatorId` field is a required number, and acts as the foreign key for the relationship defined below. The `ManyToOne` decorator is used to create a relationship between the `creatorId` and the `creator`, which is available on the user as its `posts`.

In `server/src/entities/User.ts` the inverse relationship is added:

```ts
  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[];
```

The `OneToMany` decorator defines the fact that the `User` can have many posts, where the foreign key is the `post.creator`.

### Linking User to Posts on Creation

Now to create a post a user must be logged in, so their userId can be added as the post's creatorId.

To guarantee a user is logged in, TypeGraphQL middleware can be used. In `server/src/middleware/isAuth.ts`:

```ts
import { MiddlewareFn } from "type-graphql";
import { AUTHENTICATION_ERROR } from "../constants";
import { ApolloContext } from "../types";

export const isAuth: MiddlewareFn<ApolloContext> = ({ context }, next) => {
  if (!context.req.session.userId) throw new Error(AUTHENTICATION_ERROR);

  return next();
};
```

The `isAuth` function is typed as a `MiddlewareFn`, being passed a generic for the context using `ApolloContext`. Middleware functions have access to each of the context, args, info, and root query to do whatever they please with. The second arg is `next`, the function that passes along to the next middleware. From the context, if there is no `userId` throw an `AUTHENTICATION_ERROR` from `constants`. If not, return the call of `next`.

Now in the `PostResolver`:

```ts
@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@Resolver()
export class PostResolver {
  ...
  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: ApolloContext,
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }
  ...
}
```

The `createPost` resolver takes input types with `PostInput`, and uses the `isAuth` middleware with the TypeGraphQL decorator `UseMiddleware`. Given that `isAuth` does not throw an error, we can guarantee the `userId` is on the `session`, and pass it as the post's `creatorId`.

### Create Post Page

In `client/src/pages/create-post.tsx`:

```tsx
import { Box, Button, Center, Spinner } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import { withUrqlClient } from "next-urql";
import { useRouter } from "next/router";
import React from "react";
import InputField from "../components/InputField";
import Layout from "../components/Layout";
import { useCreatePostMutation } from "../generated/graphql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { useIsAuth } from "../utils/useIsAuth";

interface CreatePostProps {}

const CreatePost: React.FC<CreatePostProps> = ({}) => {
  const router = useRouter();
  const { isAuth } = useIsAuth();
  const [_data, createPost] = useCreatePostMutation();
  return (
    <Layout variant="small">
      {!isAuth ? (
        <Center>
          <Spinner size="xl" />
        </Center>
      ) : (
        <Formik
          initialValues={{ title: "", text: "" }}
          onSubmit={async (values) => {
            const { error } = await createPost({ input: values });
            if (!error) {
              router.push("/");
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form>
              <InputField name="title" placeholder="title" label="Title" />
              <Box mt={4}>
                <InputField
                  name="text"
                  placeholder="text..."
                  label="Body"
                  textArea
                />
              </Box>
              <Button
                mt={4}
                isLoading={isSubmitting}
                type="submit"
                colorScheme="teal"
              >
                Create post
              </Button>
            </Form>
          )}
        </Formik>
      )}
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient)(CreatePost);
```

The `CreatePost` component renders a form to create a post, using `useCreatePostMutation` generated from the mutation in `client/src/graphql/mutations/createPost.graphql`. It also uses the new `Layout` component, which incorporates the `NavBar` with `Wrapper`, using a untion type `WrapperVariant` from `Wrapper`:

```tsx
import React from "react";
import NavBar from "./NavBar";
import Wrapper, { WrapperVariant } from "./Wrapper";

interface LayoutProps {
  variant?: WrapperVariant;
}

const Layout: React.FC<LayoutProps> = ({ variant, children }) => {
  return (
    <>
      <NavBar />
      <Wrapper variant={variant}>{children}</Wrapper>
    </>
  );
};

export default Layout;
```

The `InputField` component now takes the prop `textArea` which allows it to render a Textarea instead of a regular input. The `InputFieldProps` type uses an extended interface for the generic to allow this to work:

```tsx
import React, { InputHTMLAttributes } from "react";
import { useField } from "formik";
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
} from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Textarea } from "@chakra-ui/textarea";

type InputFieldProps = InputHTMLAttributes<
  HTMLInputElement & HTMLTextAreaElement
> & {
  label: string;
  name: string;
  textArea?: boolean;
};

const InputField: React.FC<InputFieldProps> = ({
  label,
  size: _size,
  textArea,
  ...props
}) => {
  let InputOrTextarea = textArea ? Textarea : Input;
  const [field, { error }] = useField(props);
  return (
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <InputOrTextarea {...field} {...props} id={field.name} />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
};

export default InputField;
```

`CreatePost` uses the `textArea` prop for the post body. It also uses `useIsAuth`, a custom hook to check if the user is logged in with `useMeQuery`, and if not, move them to the login page. In `client/src/utils/useIsAuth.ts`:

```ts
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useMeQuery } from "../generated/graphql";

export const useIsAuth = () => {
  const router = useRouter();
  const [{ data, fetching }] = useMeQuery();
  useEffect(() => {
    if (!fetching && !data?.me) {
      router.replace(`/login?next=${router.pathname}`);
    }
  }, [fetching, data, router]);
  return { isAuth: data?.me, fetching };
};
```

It returns `fetching` on an object, which `CreatePost` uses to render a loading spinner to prevent the form from being rendered until it is confirmed the user is logged in.

### Global Authentication Error Handling

On many GraphQL queries there may be the possibility of getting an `AUTHENTICATION_ERROR` from the `isAuth` middleware. Rather than handling this in all components that might encounter it, it can be handled globally with an error exchange. In `client/src/utils/createUrqlClient.ts`:

```ts
import { dedupExchange, Exchange, fetchExchange } from "urql";
import { pipe, tap } from "wonka";
...
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

export const createUrqlClient = (ssrExchange: any) => ({
  ...
  exchanges: [
    ...
    errorExchange,
    ...
  ],
});
```

The `errorExchange` uses `pipe` and `tap` methods from wonka, which is one of URQL's dependencies. This allows what is essentially a middleware to intercept responses before they get back to a component, and in this case, if the error message includes "not authenticated, it uses the Next.js `Router` to move to the login page.

### Smart Redirect After Login

Currently after logging in when sent to the login page after being caught `useIsAuth` the browser is redirected to home. It should redirect to the original page the user was trying to get to. In `client/src/utils/useIsAuth.ts`:

```ts
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useMeQuery } from "../generated/graphql";

export const useIsAuth = () => {
  const router = useRouter();
  const [{ data, fetching }] = useMeQuery();
  useEffect(() => {
    if (!fetching && !data?.me) {
      router.replace(`/login?next=${router.pathname}`);
    }
  }, [fetching, data, router]);
  return { fetching };
};
```

The login page now needs to read the `next` parameter (if it exists) in order to move to the correct page:

```ts
      ...
      <Formik
        initialValues={{ usernameOrEmail: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await login(values);
          if (response.data?.login.errors) {
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            if (typeof router?.query?.next === "string") {
              router.push(router?.query?.next);
            } else {
              router.push("/");
            }
          }
          return response;
        }}
      >
      ...
```

The `ChangePassword` page accesses the query parameters in a different way using `NextPage`, however using `router` is simpler, so refactored in `client/src/pages/change-password/[token].tsx`:


```tsx
      ...
      <Formik
        initialValues={{ password: "" }}
        onSubmit={async ({ password }, { setErrors }) => {
          const { token } = router.query;
          const response = await changePassword({
            password,
            token: typeof token === "string" ? token : "",
          });
          if (response.data?.changePassword.errors) {
            const errorMap = toErrorMap(response.data.changePassword.errors);
            if ("token" in errorMap) setTokenError(errorMap.token);
            setErrors(errorMap);
          } else if (response.data?.changePassword.user) {
            router.push("/");
          }
          return response;
        }}
      >
      ...
```

This removes the need for the `getInitialProps` function, allowing the page to be static and optimised, and having to cast the component as any when using `withUrqlClient`.

### Paginating Posts

Posts should be paginated using cursor based pagination, rather than using limit/offset. In an app where the paginated items are updated and added to quickly, the offset may not remain accurate and the pages will begin to slide about.

In the `PostResolver`:

```ts
  ...
  @Query(() => [Post])
  posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
  ): Promise<Post[]> {
    const upperLimit = Math.min(50, limit);
    const query = Post.getRepository()
      .createQueryBuilder()
      .orderBy('"createdAt"', "DESC")
      .take(upperLimit);
    if (cursor) {
      query.where('"createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }
    return query.getMany();
  }
  ...
```

The `posts` query takes a `limit` and a `cursor`. It imposes an `upperLimit` of 50, regardless of the passed `limit`. A query is built from the Post repository, ordering by `createdAt` descending. Note that `'"createdAt"'` is wrapped in both quotes to cause Postgresql to maintain the capital A. If there is a cursor, the `where` method is used to find posts that have a `createdAt` smaller than the `cursor`, which is parsed from a string to an integer then to a date, which is inserted into the raw SQL using a [parameter](https://typeorm.io/#select-query-builder/using-parameters-to-escape-data). Finally return the `getMany` call.

It is possible to write an alternate implementation using the `find` method, which generates identical SQL:

```ts
import { LessThan } from "typeorm";

  ...
  @Query(() => [Post])
  posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
  ): Promise<Post[]> {
    const upperLimit = Math.min(50, limit);
    return Post.find({
      take: upperLimit,
      order: {
        createdAt: "DESC",
      },
      where: cursor
        ? { createdAt: LessThan(new Date(parseInt(cursor))) }
        : undefined,
    });
  }
  ...
```

However, I will stick with the query builder, as I am less familiar with using that style of querying, and it seems easier to chain in optional parts of the query.

The cursor essentially finds any posts that were created before the `createdAt` that is used as the cursor. To get the next page, simply use the `createdAt` of the last post on the page you are on.

In `client/src/graphql/queries/posts.graphql` the query is updated to take the new parameters:

```graphql
query Posts($limit: Int!, $cursor: String) {
  posts(limit: $limit, cursor: $cursor) {
    id
    createdAt
    updatedAt
    title
    text
    points
    creatorId
  }
}
```

And the types are regenerated.

### Seeding Post Data

Using [Mockaroo](https://mockaroo.com/) generate some posts, and download the SQL.

Create a migration to insert the mock data:

```shell
npx typeorm migration:create -n FakePosts
```

Then in the migration: 

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class FakePosts1620336116681 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ... SQL from Mockaroo here ...
    `);
  }

  public async down(): Promise<void> {}
}
```

Then the migration can be run by adding the following to `server/src/index.ts`:

```ts
const main = async () => {
  const conn = await createConnection(typeormConfig);
  await conn.runMigrations();
  ...
};
```

This instructs the connection to run the migrations, the path to which is specified in the `typeormConfig` migrations array:

```ts
import path from "path";

const typeormConfig: ConnectionOptions = {
  ...
  migrations: [path.join(__dirname, "./migrations/*")],
};
```

### Displaying Snippets of Posts

The full text of a post could be quite long and doesn't need to be shown on the Posts page, instead a snippet should be sent.

In the PostResolver:

```ts
@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, root.text.indexOf(" ", 50));
  }
  ...
}
```

The `textSnippet` resolver is a `FieldResolver` for Posts, which needs to be indicated by passing `Post` to the `Resolver` decorator. It takes a `root` which will be the `Post`. It then uses the root post's text and slices it to the nearest space to the 50th character (so a word is not chopped in half). This is a handy way to do virtuals that only need to be exposed over GraphQL.

The `text` field can be swapped for the `textSnippet` in the `posts.graphql` query.

### Better Post Pagination

At the moment the posts are loaded, but it is not known if there are any more posts to be loaded on the next page. In the `PostsResolver`:


```ts
@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
   ...
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
  ): Promise<PaginatedPosts> {
    const upperLimit = Math.min(50, limit);
    const upperLimitPlusOne = upperLimit + 1;

    const query = Post.getRepository()
      .createQueryBuilder()
      .orderBy('"createdAt"', "DESC")
      .take(upperLimitPlusOne);
    if (cursor) {
      query.where('"createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }
    const posts = await query.getMany();

    let hasMore = false;
    if (posts.length === upperLimitPlusOne) {
      hasMore = true;
      posts.pop();
    }

    return { posts, hasMore };
  }
  ...
}
```

The `posts` resolver returns a new type, `PaginatedPosts` which has the `posts` array, and also a `hasMore` boolean. The `upperLimitPlusOne` is used to fetch one more than the number of posts asked for. Then, if there were a number of posts found equal to `upperLimitPlusOne`, it indicates there are in fact more to go. The extra post is removed from the array, and returned. 

This new structure is reflected in the `posts.graphql` query: 

```graphql
query Posts($limit: Int!, $cursor: String) {
  posts(limit: $limit, cursor: $cursor) {
    posts {
      id
      createdAt
      updatedAt
      title
      textSnippet
      points
      creatorId
    }
    hasMore
  }
}
```

### Rendering the Posts

In `client/src/pages/index.tsx`:

```tsx
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../generated/graphql";
import Layout from "../components/Layout";
import NextLink from "next/link";
import { Box, Center, Flex, Heading, Stack, Text } from "@chakra-ui/layout";
import { Spinner } from "@chakra-ui/spinner";
import { Button } from "@chakra-ui/button";
import { useState } from "react";

const Index = () => {
  const [variables, setVariables] = useState({
    limit: 10,
    cursor: null as null | string,
  });
  const [{ fetching, data }] = usePostsQuery({ variables });
  return (
    <Layout>
      <Flex align="center" mb={8}>
        <Heading>Spreddit</Heading>
        <NextLink href="/create-post">
          <Button colorScheme="teal" ml="auto">
            Create post
          </Button>
        </NextLink>
      </Flex>
      {!data && fetching ? (
        <Center>
          <Spinner size="xl" />
        </Center>
      ) : (
        <>
          <Stack spacing={8}>
            {data!.posts.posts.map((p) => (
              <Box key={p.id} p={5} shadow="md" borderWidth="1px">
                <Heading fontSize="xl">{p.title}</Heading>
                <Text mt={4}>{p.textSnippet}</Text>
              </Box>
            ))}
          </Stack>
          <Flex>
            {data!.posts.hasMore ? (
              <Button
                isLoading={fetching}
                mx="auto"
                my={8}
                colorScheme="teal"
                onClick={() => {
                  setVariables({
                    limit: variables.limit,
                    cursor: data!.posts.posts[data!.posts.posts.length - 1]
                      .createdAt,
                  });
                }}
              >
                Load more
              </Button>
            ) : (
              <Center my={8} mx="auto">
                No more posts!
              </Center>
            )}
          </Flex>
        </>
      )}
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
```

The `Index` component renders a set of cards constructed from Chakra components, with the post `title` and `textSnippet`. If `hasMore` is true, a button to load more is rendered. It's click handler updates the cursor variable to the `createdAt` of the last post of the page. When the variables are change, the posts query triggers again. This replaces the existing post data however. There are two methods to add them rather than prevent them being overwritten: store the posts in state and add to them as they arrive, or write a custom resolver to add them to the cache.

### Custom Resolver for Cursor Pagination

In `client/src/utils/createUrqlClient.ts`:

```ts
...
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
  ...
  exchanges: [
    cacheExchange({
      keys: {
        PaginatedPosts: () => null,
      },
      resolvers: {
        Query: {
          posts: cursorPagination("PaginatedPosts"),
        },
      },
      ...
    }),
    ...
   ],
});
```

Here the `cursorPagination` function returns a `Resolver` function, that is used for the posts query. It takes a `__typename` for reusability. First `fieldName` and `entityKey` are taken off the `info`. These are `posts` and `Query` respectively. Then, the cache is inspected to find cached fields that have the same `fieldName` as the `info` `fieldName`. If there are none, undefined is returned. Then a `fieldKey` is constructed using the `fieldName` and `stringifyVariables` from URQL with `fieldArgs`, producing `posts({"limit":10})`. This is used to resolve whether or not there is anything in the cache already. `info.partial` is set to true if there is nothing in the cache. Then, the cached fieldInfos are reduced through, resolving their own specific keys from the cache, which have the cursor for that call e.g. `posts({"cursor":"1618573184000","limit":10})`. Each the data and `hasMore` for each cached call is resolved, finally returning an object with all posts cached so far, the passed `__typename` and if any of them had false for `hasMore`.

### Invalidating Cache On Post Creation

It's potentially possible to have the cache be updated with a new post as soon as a user creates one, however this would likely be in the wrong order, so invalidating the cache and causing a refetch if an alternative option. in `client/src/utils/createUrqlClient.ts`:

```ts
...
export const createUrqlClient = (ssrExchange: any) => ({
  ...
  exchanges: [
    ...,
    cacheExchange({
      ...
      updates: {
        Mutation: {
          ...
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
    ...
  ],
});
```

The `createPost` mutation cache updater function inspects the cache for all queries, then filters them for ones that are `posts` queries. It then iterates through them invalidating the cache for that `posts` query with each of their arguments (the particular limit and cursor).

### Joining Users to Posts

To get the creator of the post, the tables need to be joined in `PostsResolver.posts`:

```tsx
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
  ): Promise<PaginatedPosts> {
    const upperLimit = Math.min(50, limit);
    const upperLimitPlusOne = upperLimit + 1;

    const query = Post.getRepository()
      .createQueryBuilder("post")
      .innerJoinAndSelect("post.creator", "user", 'post."creatorId" = user.id')
      .orderBy("post.createdAt", "DESC")
      .take(upperLimitPlusOne);
    if (cursor) {
      query.where('post."createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }
    const posts = await query.getMany();

    let hasMore = false;
    if (posts.length === upperLimitPlusOne) {
      hasMore = true;
      posts.pop();
    }

    return { posts, hasMore };
  }
```

Here the `innerJoinAndSelect` method links the `post.creator` from the `user` table by mapping `post."creatorId" = user.id`.

*Note that some quirk requires the `orderBy` to not quote around `post.createdAt` referring to the property name, rather than the column name. I am not exactly sure why, but it works.*

There is an alternate way to make this query using raw SQL:


```tsx
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
  ): Promise<PaginatedPosts> {
    const upperLimit = Math.min(50, limit);
    const upperLimitPlusOne = upperLimit + 1;

    const replacements: any[] = [upperLimitPlusOne];
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
      SELECT p.*,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
      ) creator
      FROM post p
      INNER JOIN public.user u ON u.id = p."creatorId"
      ${cursor ? `WHERE p."createdAt" < $2` : ""}
      ORDER BY p."createdAt" DESC
      LIMIT $1
      `,
      replacements,
    );

    let hasMore = false;
    if (posts.length === upperLimitPlusOne) {
      hasMore = true;
      posts.pop();
    }

    return { posts, hasMore };
  }
```

`query` allows any SQL to be sent, which can be parameterised using `$`. I will use this version for now, as I am less familiar and it will help me brush up on my SQL.

### Guarding Email Addresses

Currently a creator's email is exposed, however, a `FieldResolver` can be used to check if the current user is the user being resolved, or not:

```ts
@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: ApolloContext) {
    if (req.session.userId === user.id) {
      return user.email;
    }
    return "";
  }
  ...
}
```

`User` is passed to the `Resolver` decorator to let it know what the `Root` should be. If the `userId` matches the session, they can have their own email address, otherwise send an empty string.

### Votes on Posts

A user can vote on many posts, which can be voted on by many users so a many to many relationship. There will need to be a join table to keep track of which users have voted on which posts. In `server/src/entities/Vote.ts`:

```ts
import { Entity, Column, BaseEntity, ManyToOne, PrimaryColumn } from "typeorm";
import { Field, Int, ObjectType } from "type-graphql";
import { User } from "./User";
import { Post } from "./Post";

@ObjectType()
@Entity()
export class Vote extends BaseEntity {
  @Field(() => Int)
  @Column({ type: "int" })
  value: number;

  @Field(() => Int)
  @PrimaryColumn()
  userId!: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.votes)
  user: User;

  @Field(() => Int)
  @PrimaryColumn()
  postId!: number;

  @Field(() => Post)
  @ManyToOne(() => Post, (post) => post.votes)
  post: Post;
}
```

`value` will either be 1 or -1 depending on if the vote is an upvote or downvote.

The votes are linked with a one to many relationship on both the `Post`: 

```ts
@ObjectType()
@Entity()
export class Post extends BaseEntity {
   ...
  @OneToMany(() => Vote, (vote) => vote.post)
  votes: Vote[];

  @Field(() => Int, { nullable: true })
  voteStatus: number | null;
}
```

`voteStatus` is a virtual field that will represent if the user has upvoted (`1`) or downvoted (`0`) a post, or not voted at all (`null`).

And on the `User`:

```tsx
@ObjectType()
@Entity()
export class User extends BaseEntity {
  ...
  @OneToMany(() => Vote, (vote) => vote.user)
  votes: Vote[];
}
```

For the `voteStatus` field to be resolved properly it needs to be handled in the `posts` resolver:

```ts
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
    @Ctx() { req }: ApolloContext,
  ): Promise<PaginatedPosts> {
    const upperLimit = Math.min(50, limit);
    const upperLimitPlusOne = upperLimit + 1;

    const replacements: any[] = [upperLimitPlusOne];
    let userIndex;
    if (req.session.userId) {
      replacements.push(req.session.userId);
      userIndex = replacements.length;
    }
    let cursorIndex;
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIndex = replacements.length;
    }

    const posts = await getConnection().query(
      `
      SELECT p.*,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
      ) creator,
      ${
        req.session.userId
          ? `(SELECT value FROM vote WHERE "userId" = $${userIndex} AND "postId" = p.id) "voteStatus"`
          : 'null as "voteStatus"'
      }
      FROM post p
      INNER JOIN public.user u ON u.id = p."creatorId"
      ${cursor ? `WHERE p."createdAt" < $${cursorIndex}` : ""}
      ORDER BY p."createdAt" DESC
      LIMIT $1
      `,
      replacements,
    );

    let hasMore = false;
    if (posts.length === upperLimitPlusOne) {
      hasMore = true;
      posts.pop();
    }

    return { posts, hasMore };
  }
```

Here the main different is the SQL has a subquery for `"voteStatus"` which will either be to select the value from the votes table of the vote where the userId and postId match, which is either the (`1`, `-1` or `null`), or if the user is not logged in, it automatically is set as `null`. There is some logic to handle the correct index of the parameters array also.

To vote on a post, the `vote` resolver is added in `server/src/resolvers/post.ts`:

```ts
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: ApolloContext,
  ): Promise<Boolean> {
    const isUpvote = value !== -1;
    const actualValue = isUpvote ? 1 : -1;
    const { userId } = req.session;

    const vote = await Vote.findOne({ where: { postId, userId } });

    if (vote && vote.value !== actualValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `UPDATE vote 
          SET value = $1
          WHERE "postId" = $2 and "userId" = $3`,
          [actualValue, postId, userId],
        );
        const switchVoteValue = 2 * actualValue;
        await tm.query(
          `UPDATE post p
          SET points = points + $1
          WHERE p.id = $2`,
          [switchVoteValue, postId],
        );
      });
    } else if (!vote) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `INSERT INTO vote ("userId", "postId", "value")
          VALUES ($1, $2, $3)`,
          [userId, postId, actualValue],
        );
        await tm.query(
          `UPDATE post p
          SET points = points + $1
          WHERE p.id = $2`,
          [actualValue, postId],
        );
      });
    }

    return true;
  }
```

First the `vote` resolver checks if a vote for the userId/postId combination exists. If it does and if the existing vote value is different to the incoming value, a transaction is started to update that vote with the new value, and then update the associated post's `points` value accordingly. Note that the `switchVoteValue` is double the `actualValue` as the `+1` would turn into a `-1` so it would need to swing by two points.

If there was no vote found, a transaction occurs to add a new vote and update the post's `points`.

### UI for Voting

First, the vote mutation is added in `client/src/graphql/mutations/vote.graphql`:

```graphql
mutation Vote($value: Int!, $postId: Int!) {
  vote(value: $value, postId: $postId)
}
```

And for simplicity's sake for types a fragment `PostSnippet` is added in `client/src/graphql/fragments/PostSnippet.graphql`:

```graphql
fragment PostSnippet on Post {
  id
  createdAt
  updatedAt
  title
  textSnippet
  points
  voteStatus
  creator {
    id
    username
  }
}
```

Which is used in the `client/src/graphql/queries/posts.graphql` query:

```graphql
query Posts($limit: Int!, $cursor: String) {
  posts(limit: $limit, cursor: $cursor) {
    posts {
      ...PostSnippet
    }
    hasMore
  }
}
```

And types are regenerated.

In `client/src/components/VoteControl.tsx`:

```tsx
import { TriangleUpIcon, TriangleDownIcon } from "@chakra-ui/icons";
import { Flex, IconButton } from "@chakra-ui/react";
import React, { useState } from "react";
import { PostSnippetFragment, useVoteMutation } from "../generated/graphql";

interface VoteControlProps {
  post: PostSnippetFragment;
}

enum VoteValues {
  UP = 1,
  DOWN = -1,
}

const VoteControl: React.FC<VoteControlProps> = ({ post }) => {
  const [loading, setLoading] = useState<VoteValues | false>(false);
  const [_data, vote] = useVoteMutation();

  const voteClickHandlerGenerator = (value: VoteValues) => async () => {
    console.log(`value`, value);
    if (value === post.voteStatus) return;

    setLoading(value);
    await vote({
      postId: post.id,
      value,
    });
    setLoading(false);
  };

  const voteStatusIsUpVote = post.voteStatus === VoteValues.UP;
  const voteStatusIsDownVote = post.voteStatus === VoteValues.DOWN;

  return (
    <Flex direction="column" alignItems="center">
      <IconButton
        colorScheme={voteStatusIsUpVote ? "green" : "black"}
        aria-label="upvote post"
        size="xs"
        variant={voteStatusIsUpVote ? "solid" : "outline"}
        icon={<TriangleUpIcon size="24px" />}
        isLoading={loading === VoteValues.UP}
        onClick={voteClickHandlerGenerator(VoteValues.UP)}
      />
      {post.points}
      <IconButton
        colorScheme={voteStatusIsDownVote ? "red" : "black"}
        aria-label="downvote post"
        size="xs"
        variant={voteStatusIsDownVote ? "solid" : "outline"}
        icon={<TriangleDownIcon size="24px" />}
        isLoading={loading === VoteValues.DOWN}
        onClick={voteClickHandlerGenerator(VoteValues.DOWN)}
      />
    </Flex>
  );
};

export default VoteControl;
```

The `VoteControl` component takes a `post` typed as the `PostSnippetFragment` (conveniently only having the correct types instead of all available types on posts). It renders the post's points, and two buttons to upvote/downvote the post, using the `useVoteMutation`. `voteClickHandlerGenerator` is a function that curries the returned click handler with the correct value for the vote based on the passed `VoteValue` enum property. If the current `voteStatus` matches the button, the click handler returns early, preventing additional votes of a certain type. `loading` is held in state to determine which of the two buttons should be loading. The buttons are also conditionally styled based on the current `voteStatus`, and flexed vertically around the points number.

The `VoteControl` component is rendered by the `PostCard` component in `client/src/components/PostCard.tsx`:

```tsx
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import React from "react";
import { PostSnippetFragment } from "../generated/graphql";
import VoteControl from "./VoteControl";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: PostSnippetFragment;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const formattedDate = formatDistanceToNow(new Date(parseInt(post.createdAt)));
  return (
    <Box p={5} shadow="md" borderWidth="1px">
      <Flex justifyContent="space-between">
        <Box>
          <Heading size="md">{post.title}</Heading>
          <Text>{`posted by ${post.creator.username} ${formattedDate} ago`}</Text>
          <Text mt={4}>{post.textSnippet}</Text>
        </Box>
        <VoteControl post={post} />
      </Flex>
    </Box>
  );
};

export default PostCard;
```

The `formatDistanceToNow` function from `date-fns` is used to give human readable relative estimate of the time since the post was created.
