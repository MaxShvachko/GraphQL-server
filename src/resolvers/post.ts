import { Post } from "../entities/Post";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { ApolloContext } from "../types";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(
    @Ctx() ctx: ApolloContext
  ): Promise<Post[]> {
    return ctx.em.find(Post, {});
  }

  @Query(() => Post, { nullable: true })
  post(
    @Arg('id') id: number,
    @Ctx() { em }: ApolloContext
  ): Promise<Post | null> {
    return em.findOne(Post, { id });
  }

  @Mutation(() => Post)
  async createPost(
    @Arg('title') title: string,
    @Ctx() { em }: ApolloContext
  ): Promise<Post> {
    const post = em.create(Post, { title });
    await em.persistAndFlush(post);
    return post;
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string | null,
    @Ctx() { em }: ApolloContext
  ): Promise<Post | null> {
    const post = await em.findOne(Post, { id });
    
    if (!post) {
      return null;
    }

    if (title) {
      post.title = title;
      await em.persistAndFlush(post);
    }
    
    return post;
  }

  @Mutation(() => Boolean, { nullable: true })
  async deletePost(
    @Arg('id') id: number,
    @Ctx() { em }: ApolloContext
  ): Promise<boolean> {
    try {
      await em.nativeDelete(Post, { id });
      return true;
    } catch {
      return false; 
    }
  }
}