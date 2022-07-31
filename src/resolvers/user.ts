import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from 'argon2';

import { ApolloContext } from "../types";
import { User } from "../entities/User";
import { COOKIE_NAME } from "../constants/cookies";

@InputType()
class RegisterParams {
  @Field()
  nick_name: string

  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string

  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Query(() => UserResponse)
  async me(
    @Ctx() { req, em }: ApolloContext
  ): Promise<UserResponse> {
    const { uid } = req.session;

    if (!uid) {
      return {
        errors: [{
          field: 'user',
          message: `You are unauthorized`
        }]
      };
    }


    const user = await em.findOne(User, { id: uid });

    if (!user) {
      return {
        errors: [{
          field: 'user',
          message: `User doesn't exist`
        }]
      };
    }
    
    return { user }; 
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: RegisterParams,
    @Ctx() { em, req }: ApolloContext
  ): Promise<UserResponse> {
    const existedUser = await em.findOne(User, { nick_name: options.nick_name });

    if (existedUser) {
      return {
        errors: [{
          field: 'nick_name',
          message: `User with nick name \'${options.nick_name}\' already exists`
        }]
      };
    }

    const password = await argon2.hash(options.password);

    const user = em.create(User, { nick_name: options.nick_name, password });
    await em.persistAndFlush(user);
    
    req.session.uid = user.id

    return { user }; 
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: RegisterParams,
    @Ctx() { em, req }: ApolloContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { nick_name: options.nick_name });

    if (!user) {
      delete req.session.uid
      return {
        errors: [{
          field: 'nick_name',
          message: `User with nick name '${options.nick_name}' doesn't exist`
        }]
      };
    }

    const isEqualPassword = await argon2.verify(user.password, options.password);

    if (!isEqualPassword) {
      delete req.session.uid

      return {
        errors: [{
          field: 'password',
          message: `Password is incorrect`
        }]
      };
    }

    req.session.uid = user.id

    return { user };
  }

  @Query(() => [User])
  users(
    @Ctx() { em }: ApolloContext
  ): Promise<User[]> {
    return em.find(User, {});
  }

  @Mutation(() => Boolean)
  logout(
    @Ctx() { req, res }: ApolloContext
  ): Promise<{}> {    
    return new Promise((resolve) => req.session.destroy((error: unknown) => {
      if (error) {
        console.log(error);
        resolve(false);
        return
      } else {
        res.clearCookie(COOKIE_NAME);
        resolve(true);
      }
    }))
  }
}
