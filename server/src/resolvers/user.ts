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
import { validateRegister } from "../utils/validateRegister";
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
  async me(@Ctx() { em, req }: ApolloContext): Promise<User | null> {
    const { userId } = req.session;
    if (!userId) return null;

    const user = await em.findOne(User, { id: userId });
    return user;
  }

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
