import { MikroORM } from "@mikro-orm/core";
import path from 'path';

import { __prod__ } from "./constants/common";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

export default {
  entities: [Post, User],
  type: 'postgresql',
  host: process.env.POSTGRES_HOST,
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  debug: !__prod__,
  migrations: {
    path: path.join(__dirname, './migrations'),
    glob: '!(*.d).{js,ts}', // how to match migration files (all .js and .ts files, but not .d.ts)
  }
} as Parameters<typeof MikroORM.init>[0]
