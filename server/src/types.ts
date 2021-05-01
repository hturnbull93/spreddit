import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Redis } from "ioredis";
import { Request, Response } from "express";
import { Field, InputType, ObjectType } from "type-graphql";

declare module "express-session" {
  interface Session {
    userId: number;
  }
}

export type ApolloContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request;
  res: Response;
  redis: Redis;
};

@InputType()
export class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;

  @Field()
  email: string;
}

@ObjectType()
export class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}
