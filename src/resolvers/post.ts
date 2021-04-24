import { Post } from "../entities/Post";
import { ApolloContext } from "../types";
import { Arg, Ctx, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { em }: ApolloContext): Promise<Post[]> {
    return em.find(Post, {});
  }

  @Query(() => Post, { nullable: true })
  post(
    @Arg("id") id: number,
    @Ctx() { em }: ApolloContext
    ): Promise<Post | null> {
    return em.findOne(Post, { id });
  }
};
