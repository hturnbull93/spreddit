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
