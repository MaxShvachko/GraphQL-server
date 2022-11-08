require('dotenv').config();
import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import Redis from "ioredis";
import session from "express-session";
import connectRedis from 'connect-redis';
import cors from 'cors';
import { DataSource } from 'typeorm';

import { __prod__  } from "./constants/common";
import typeOrmConfig from "./type-orm-config";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from './resolvers/user';
import { COOKIE_MAX_AGE, COOKIE_NAME } from './constants/cookies';

const init = async() => {
  const AppDataSource = new DataSource(typeOrmConfig);
  await AppDataSource.initialize(); 

  const app = express();

  const RedisStore = connectRedis(session);
  
  const redis = new Redis(`redis://${process.env.REDIS_USER}:${process.env.REDIS_PASSWORD}@0.0.0.0:6379`);

  app.use(cors({
    origin: ['https://studio.apollographql.com', 'http://localhost:3000'],
    credentials: true,
  }));

  app.set("trust proxy", !__prod__);
  app.set("Access-Control-Allow-Origin", ["https://studio.apollographql.com", 'http://localhost:3000']);
  app.set("Access-Control-Allow-Credentials", true);

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true
       }),
      cookie: {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax"
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
    context: ({ req, res }) => ({ dataSource: AppDataSource, req, res, redis })
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(process.env.PORT, () => {
    console.log(`Server started on the ${process.env.PORT} port`);
  });
}

init().catch(e => console.error(e));
