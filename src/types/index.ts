import { Request, Response } from 'express';
import { Redis } from "ioredis";
import { DataSource } from "typeorm";

import { createUserLoader } from '../utils/createUserLoader';
import { createUpdootLoader } from '../utils/createUpdootLoader';

export interface ApolloContext {
  dataSource: DataSource;
  req: Request & { session: any };
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  updootLoader: ReturnType<typeof createUpdootLoader>;
}
