import { Request, Response } from 'express';
import { Redis } from "ioredis";
import { DataSource } from "typeorm";

export interface ApolloContext {
  dataSource: DataSource;
  req: Request & { session: any };
  res: Response;
  redis: Redis
}
