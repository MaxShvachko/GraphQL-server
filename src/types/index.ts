import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Request, Response } from 'express';
import { Redis } from "ioredis";

export interface ApolloContext {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session: any };
  res: Response;
  redis: Redis
}
