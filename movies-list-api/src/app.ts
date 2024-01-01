import express from 'express';
import cors from 'cors';
import { getCorsOrigins } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import healthRouter from './routes/health';
import movieRouter from './routes/movie';
import userRouter from './routes/user';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: getCorsOrigins() }));
app.use(express.json({ limit: '1mb' }));

app.use(healthRouter);
app.use(userRouter);
app.use(movieRouter);

// Must come last: the 404 catches unmatched paths, the error handler turns
// everything thrown above into the single documented error shape.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
