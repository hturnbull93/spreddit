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
# start postgresql service
sudo service postgresql start

# start redis service
sudo service redis-server start

# start dev compiler
cd server && yarn watch

# start dev server
cd server && yarn start
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

### Set up MikroORM CLI

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

To add some validation to user registration, if either the username or password is less that 2 characters in length return a `UserResponse` with a relevant `FieldError`. Also, handle an error more specifically by the code when attempting to persist the user with a potentially duplicate username:

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
        message: "length muse be at least 2 characters",
      });
    }
    if (password.length < 2) {
      errors.push({
        field: "password",
        message: "length muse be at least 2 characters",
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
      if (error.code === "23505") {
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
