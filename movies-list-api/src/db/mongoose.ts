import mongoose from 'mongoose';
import { getMongoDbName, getMongoUri } from '../config/env';

/**
 * Connects to MongoDB and builds the indexes declared on the schemas.
 * @throws {Error} If the connection cannot be established.
 */
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(`${getMongoUri()}/${getMongoDbName()}`, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export { connectDB, mongoose };
