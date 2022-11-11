import DataLoader from 'dataloader';
import { In } from 'typeorm';
import { User } from '../entities/User';

export const createUserLoader = () => new DataLoader<number, User>(async (userIds) => {
  const users = await User.findBy({ id: In(userIds as number[]) })
  
  const userIdsToUser: Record<number, User> = {};

  users.forEach((user) => {
    userIdsToUser[user.id] = user;
  })

  return userIds.map((id) => userIdsToUser[id]);
});
