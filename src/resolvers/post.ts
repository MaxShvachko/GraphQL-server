import { Post } from "../entities/Post";
import { Arg, Mutation, Query, Resolver, InputType, Field, Ctx, UseMiddleware } from "type-graphql";
import { ApolloContext } from "../types";
import { isAuth } from "../middleware/isAuth";

@InputType()
class PostParams {
  @Field()
  title: string;

  @Field()
  text: string;
}

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
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