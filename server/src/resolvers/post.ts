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
import { getConnection } from "typeorm";
import { Vote } from "../entities/Vote";

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

  @Query(() => Post, { nullable: true })
  async post(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: ApolloContext,
  ): Promise<Post | undefined> {
    const replacements: any[] = [id];
    let userIndex;
    if (req.session.userId) {
      replacements.push(req.session.userId);
      userIndex = replacements.length;
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
      WHERE p.id = $1
      `,
      replacements,
    );

    return posts[0];
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
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("input") input: PostInput,
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: ApolloContext,
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) return null;

    const result = await Post.createQueryBuilder()
      .update()
      .set(input)
      .where({ id, creatorId: req.session.userId })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: ApolloContext,
  ): Promise<Boolean> {
    const result = await Post.delete({ id, creatorId: req.session.userId });
    return !!result.affected;
  }

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
}
