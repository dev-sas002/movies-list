import dotenv from 'dotenv';
dotenv.config();

import { createHash } from 'crypto';
import bcrypt from 'bcrypt';
import Movie from '../models/movie';
import User from '../models/user';
import { connectDB, mongoose } from './mongoose';
import { renderPoster } from './posterArt';
import { SEED_MOVIES } from './seedData';

/**
 * Seeds the demo account and its movie collection, including generated poster
 * art, so the application is populated the first time it boots. Re-running is
 * safe: existing records are left alone.
 */

const DEMO_EMAIL = process.env.SEED_EMAIL || 'test@example.com';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'password123';

const seedUser = async () => {
  const existing = await User.findOne({ email: DEMO_EMAIL });

  if (existing) {
    console.log(`User ${DEMO_EMAIL} already exists.`);
    return existing;
  }

  const user = new User({
    email: DEMO_EMAIL,
    password: await bcrypt.hash(DEMO_PASSWORD, 10),
  });

  await user.save();
  console.log(`Seeded user ${DEMO_EMAIL}.`);

  return user;
};

const seedMovies = async (userId: mongoose.Types.ObjectId) => {
  let created = 0;

  for (const [index, seed] of SEED_MOVIES.entries()) {
    const existing = await Movie.findOne({ userId, title: seed.title });

    if (existing) {
      continue;
    }

    const svg = renderPoster({ ...seed, year: seed.publishYear, index });
    const image = Buffer.from(svg, 'utf8');

    await new Movie({
      ...seed,
      userId,
      image,
      imageType: 'image/svg+xml',
      imageHash: createHash('sha256').update(image).digest('hex'),
    }).save();

    created += 1;
  }

  console.log(
    created === 0
      ? 'Movies already seeded.'
      : `Seeded ${created} movie(s) with generated poster art.`
  );
};

const seed = async () => {
  try {
    await connectDB();

    const user = await seedUser();
    await seedMovies(user._id as mongoose.Types.ObjectId);

    // Build the compound and text indexes the list and search paths rely on.
    await Movie.syncIndexes();
    await User.syncIndexes();
    console.log('Indexes synchronised.');
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

seed().catch(() => {
  process.exitCode = 1;
});
