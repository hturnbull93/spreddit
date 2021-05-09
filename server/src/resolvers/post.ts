import { Post } from "../entities/Post";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { ApolloContext } from "../types";
import { isAuth } from "../middleware/isAuth";

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, root.text.indexOf(" ", 50));
  }

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

  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

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

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("input") { title }: PostInput,
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
