import { Arg, Mutation, Query, Resolver, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType } from "type-graphql";

import { Post } from "../entities/Post";
import { ApolloContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { Updoot } from "../entities/Updoot";

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
  
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() { req, dataSource }: ApolloContext
  ) {
      const { uid } = req.session;
      const isUpdoot = value !== -1;
      
      const realValue = isUpdoot ? 1 : -1;
  
      const updoot = await Updoot.findOne({ where: { userId: uid, postId } })

      if (updoot && updoot.value !== realValue) {
        await dataSource.transaction(async(tr) => {
          await tr.query(`
          update updoot
          set value = $1
          where "postId" = $2;
          `, [realValue, postId]);

          await tr.query(`
          update post
          set points = points + $1
          where id = $2;
          `, [2 * realValue, postId]);
        })

      } else if (!updoot) {
        await dataSource.transaction(async(tr) => {
          await tr.query(`
          insert into updoot ("userId", "postId", "value") 
          values ($1, $2, $3);
          `, [uid, postId, realValue]);

          await tr.query(`
          update post
          set points = points + $1
          where id = $2;
          `, [realValue, postId]);
        })
      }
       return true;
  }

  @Query(() => PaginatedPost)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() { dataSource, req }: ApolloContext
  ): Promise<PaginatedPost | null> {
    const { uid } = req.session;
    const realLimit = Math.min(50, limit);
    const realLimitForHasMore = realLimit + 1;

    const posts = await dataSource.query(
      `select p.*,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'nick_name', u."nick_name"
        ) creator,
        ${uid
          ? `(select value from updoot where "userId" = ${uid} and "postId" = p.id) "voteStatus"`
          : 'null as "voteStatus"'
        }
        from post p
        inner join public.user u on u.id = p."creatorId"
        ${cursor ? `where p."createdAt" < ${cursor}` : ''}
        order by p."createdAt" DESC
        limit ${realLimitForHasMore}
      `
    );

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