import { ApolloContext } from "../types";
import { MiddlewareFn } from "type-graphql";

export const isAuth: MiddlewareFn<ApolloContext> = ({ context: { req } }, next) => {
  if (!req.session.uid) {
    throw new Error('You are not authenticated');
  }

  return next();
}
