import { __prod__ } from "./constants/common";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

export default {
  host: process.env.POSTGRES_HOST,
  debug: !__prod__,
  type: "postgres" as const,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Post, User],
  synchronize: true,
  logging: !__prod__,
}
