import User, { IUser } from '../models/user';

/**
 * All Mongoose access for users lives here. Services depend on this module
 * rather than on the model, so persistence can be swapped without touching
 * business logic.
 */

export const findByEmail = (email: string): Promise<IUser | null> =>
  User.findOne({ email }) as unknown as Promise<IUser | null>;

export const findById = (userId: string): Promise<IUser | null> =>
  User.findById(userId) as unknown as Promise<IUser | null>;

/** Looks up the user that currently holds this exact session token. */
export const findBySessionToken = (userId: string, token: string): Promise<IUser | null> =>
  User.findOne({ _id: userId, authToken: token }) as unknown as Promise<IUser | null>;

export const saveSessionToken = async (user: IUser, token: string | undefined): Promise<void> => {
  user.authToken = token;
  await user.save();
};
