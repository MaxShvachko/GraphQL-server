import { Arg, Mutation, Query, Resolver, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType } from "type-graphql";

import { Post } from "../entities/Post";
import { ApolloContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";

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

  @FieldResolver(() => User)
  creator(
    @Root() root: Post,
    @Ctx() { userLoader }: ApolloContext
  ) {
    return userLoader.load(root.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { updootLoader, req }: ApolloContext
  ) {
    if (!req.session.uid) {
      return null;
    }

    const updoot = await updootLoader.load({
      postId: post.id,
      userId: req.session.uid,
    });

    return updoot ? updoot.value : null;
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
    @Ctx() { dataSource }: ApolloContext
  ): Promise<PaginatedPost | null> {
    const realLimit = Math.min(50, limit);
    const realLimitForHasMore = realLimit + 1;

    const queryArguments: (Date | number)[] = [realLimitForHasMore];

    if (cursor) {
      queryArguments.push(new Date(Number(cursor)));
    }

    const posts = await dataSource.query(
      `select p.*
        from post p
        ${cursor ? `where p."createdAt" < $${queryArguments.length}` : ''}
        order by p."createdAt" DESC
        limit $1
      `,
      queryArguments
    );

    return { data: posts.slice(0, realLimit), hasMore: posts.length === realLimitForHasMore };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg('id', () => Int) id: number): Promise<Post | null> {
    return Post.findOne({ where: { id } });
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
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg('id', () => Int) id: number,
    @Arg('title') title: string,
    @Arg('text') text: string,
    @Ctx() { req, dataSource }: ApolloContext
  ): Promise<Post | null> {
    const result = await dataSource
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.uid,
      })
      .returning('*')
      .execute();

      return result.raw[0];
    
  }

  @Mutation(() => Boolean, { nullable: true })
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg('id', () => Int) id: number,
    @Ctx() { req }: ApolloContext
  ): Promise<boolean> {
    try {
      await Post.delete({ id, creatorId: req.session.uid });
      return true;
    } catch {
      return false; 
    }
  }
}