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
