import { Post } from "../entities/Post";
import { Arg, Mutation, Query, Resolver, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType } from "type-graphql";
import { ApolloContext } from "../types";
import { isAuth } from "../middleware/isAuth";

@InputType()
class PostParams {
  @Field()
  title: string;

  @Field()
  text: string;
}

@ObjectType()
class PaginatedPost {
  @Field(() => [Post])
  data: Post[];

  @Field()
  hasMore: boolean;
  
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String) 
  textSnippet(
    @Root() root: Post
  ) {
    return root.text.slice(0, 70);
  }
  
  @Query(() => PaginatedPost)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() { dataSource }: ApolloContext
  ): Promise<PaginatedPost | null> {
    const realLimit = Math.min(50, limit);
    const realLimitForHasMore = realLimit + 1;

    const qb = dataSource
    .getRepository(Post)
    .createQueryBuilder("p")
    .orderBy('"createdAt"', 'DESC')
    .take(realLimitForHasMore)

    if (cursor) {
      qb.where('"createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) })
    }

    const posts = await qb.getMany();

    return { data: posts.slice(0, realLimit), hasMore: posts.length === realLimitForHasMore };

  }

  @Query(() => Post, { nullable: true })
  post(@Arg('id') id: number): Promise<Post | null> {
    return Post.findOneBy({ id });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  createPost(
    @Arg('options') options: PostParams,
    @Ctx() { req }: ApolloContext
  ): Promise<Post> {
    return Post.create({ 
      ...options, creatorId: req.session.uid
    }).save()
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string | null,
  ): Promise<Post | null> {
    const post = await Post.findOneBy({ id });
    
    if (!post) {
      return null;
    }

    if (title) {
      await Post.update({ id }, { title })
    }
    
    return post;
  }

  @Mutation(() => Boolean, { nullable: true })
  async deletePost(@Arg('id') id: number): Promise<boolean> {
    try {
      await Post.delete(id);
      return true;
    } catch {
      return false; 
    }
  }
}