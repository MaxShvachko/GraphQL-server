import { Arg, Ctx, Field, FieldResolver, InputType, Mutation, ObjectType, Query, Resolver, Root } from "type-graphql";
import argon2 from 'argon2';

import { ApolloContext } from "../types";
import { User } from "../entities/User";
import { COOKIE_NAME } from "../constants/cookies";
import sendEmail from "../utils/sendEmail";
import { FORGOT_PASSWORD_PREFIX, FRONT_HOST, THREE_DAYS } from "../constants/common";
import { v4 as uuid } from 'uuid';
import { FRONT_ROUTES } from "../constants/frontRoutes";
import { FieldError } from "../baseObjectType";

@InputType()
class RegisterParams {
  @Field()
  nick_name: string

  @Field()
  email: string

  @Field()
  password: string
}

@InputType()
class LogInParams {
  @Field()
  email: string

  @Field()
  password: string
}

@InputType()
class ChangePasswordParams {
  @Field()
  new_password: string;

  @Field()
  confirm_new_password: string;

  @Field()
  token: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String) 
  email(
    @Root() root: User,
    @Ctx() { req }: ApolloContext
  ) {
    if (req.session.userId === root.id) {
      return root.email;
    }

    return '';
  }

  @Query(() => UserResponse)
  async me(@Ctx() { req }: ApolloContext): Promise<UserResponse> {
    const { uid } = req.session;

    if (!uid) {
      return {
        errors: [{
          field: 'user',
          message: `You are not authenticated`
        }]
      };
    }


    const user = await User.findOneBy({ id: uid });

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
    @Arg('options') { email, nick_name, password }: RegisterParams,
    @Ctx() { req }: ApolloContext
  ): Promise<UserResponse> {
    const existedEmail = await User.findOneBy({ email });

    if (existedEmail) {
      return {
        errors: [{
          field: 'email',
          message: `User with email \'${email}\' already exists`
        }]
      };
    }

    const existedNickName = await User.findOneBy({ nick_name });

    if (existedNickName) {
      return {
        errors: [{
          field: 'nick_name',
          message: `User with nick name \'${nick_name}\' already exists`
        }]
      };
    }

    const hashedPassword = await argon2.hash(password);

    const user = await User.create({ nick_name, password: hashedPassword, email }).save();

    await sendEmail(email, 'Thanks for registration ))');

    req.session.uid = user.id

    return { user }; 
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') { email, password }: LogInParams,
    @Ctx() { req }: ApolloContext
  ): Promise<UserResponse> {
    const user = await User.findOneBy({ email });

    if (!user) {
      delete req.session.uid
      return {
        errors: [{
          field: 'email',
          message: `User with email '${email}' doesn't exist`
        }]
      };
    }

    const isEqualPassword = await argon2.verify(user.password, password);

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
  users(): Promise<User[]> {
    return User.find();
  }

  @Mutation(() => Boolean)
  logout(
    @Ctx() { req, res }: ApolloContext
  ): Promise<{}> {
    return new Promise((resolve) => req.session.destroy((error: unknown) => {
      if (error) {
        resolve(false);
        return
      } else {
        res.clearCookie(COOKIE_NAME);
        resolve(true);
      }
    }))
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: ApolloContext
  ) {
    const user = await User.findOneBy({ email });

    if (!user) {
      return true;
    }

    const token = uuid();

    await redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'EX', THREE_DAYS);

    await sendEmail(email, `<a href=${FRONT_HOST}${`${FRONT_ROUTES.RECOVERY_PASSWORD}?token=${token}`} target="_blank">Reset Password</a>`);

    return false;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('options') { token, confirm_new_password, new_password }: ChangePasswordParams,
    @Ctx() { redis, req }: ApolloContext
  ) {
    const isNotEqualPasswords = new_password !== confirm_new_password;

    if (isNotEqualPasswords) {
      return {
        errors: [{
          field: 'confirm_new_password',
          message: 'Please set equal new password and confirm new password'
        }]
      }
    }

    if (!token) {
      return {
        errors: [{
          field: 'token',
          message: 'Please pass the token'
        }]
      }
    }

    const tokenKey = FORGOT_PASSWORD_PREFIX + token;

    const userId = await redis.get(tokenKey);

    if (!userId) {
      return {
        errors: [{
          field: 'token',
          message: 'The token is expired'
        }]
      }
    }

    redis.del(tokenKey);

    const user = await User.findOneBy({ id: Number(userId) });

    if (!user) {
      return {
        errors: [{
          field: 'email',
          message: 'User doesn\'t exist'
        }]
      }
    }

    const hashedPassword = await argon2.hash(new_password);

    await User.update({ id: Number(userId) }, { password: hashedPassword });

    req.session.uid = userId;

    return {
      user
    }
  }
}
