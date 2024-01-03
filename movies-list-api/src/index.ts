import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './db/mongoose';
import { getJwtSecret, getPort, isAiSearchEnabled } from './config/env';
import Movie from './models/movie';
import User from './models/user';

/**
 * Boots the API: validate configuration, connect to MongoDB, ensure indexes
 * exist, then listen.
 */
const startServer = async () => {
  const port = getPort();

  // Fail fast rather than surfacing a missing secret as a broken login later.
  // `getJwtSecret` throws when JWT_SECRET is unset; there is no default.
  getJwtSecret();

  await connectDB();
  await Promise.all([Movie.syncIndexes(), User.syncIndexes()]);

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`AI-assisted search: ${isAiSearchEnabled() ? 'enabled' : 'disabled (rule-based)'}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
