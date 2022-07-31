require('dotenv').config();
import 'reflect-metadata';
import { MikroORM } from "@mikro-orm/core";
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import redis from "redis";
import session from "express-session";
import connectRedis from 'connect-redis';
import cors from 'cors';

import { __prod__  } from "./constants/common";
import mikroOrmConfig from "./mikro-orm.config";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from './resolvers/user';
import { COOKIE_MAX_AGE, COOKIE_NAME } from './constants/cookies';

const init = async() => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();
  const app = express();

  const RedisStore = connectRedis(session)
  
  const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_USER}:${process.env.REDIS_PASSWORD}@0.0.0.0:6379`,
  });

  app.use(cors({
    origin: ['https://studio.apollographql.com', 'http://localhost:3000'],
    credentials: true
  }))

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redisClient,
        disableTouch: true
       }),
      cookie: {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        secure: __prod__,
        sameSite: 'lax',
      },
      saveUninitialized: false,
      secret: process.env.REDIS_SECRET as string,
      resave: false
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false
    }),
    context: ({ req, res }) => ({ em: orm.em, req, res })
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(process.env.PORT, () => {
    console.log(`Server started on the ${process.env.PORT} port`);
  });
}

init().catch(e => console.error(e));
