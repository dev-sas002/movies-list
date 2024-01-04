import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { HealthResponse } from '../contracts/api';
import { isAiSearchEnabled } from '../config/env';

const healthRouter = express.Router();

/** Used by the Docker healthcheck and by anything fronting the API. */
healthRouter.get('/health', (_req: Request, res: Response) => {
  const connected = mongoose.connection.readyState === 1;

  const body: HealthResponse = {
    status: connected ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    database: connected ? 'connected' : 'disconnected',
    aiSearch: isAiSearchEnabled() ? 'enabled' : 'disabled',
  };

  res.status(connected ? 200 : 503).json(body);
});

export default healthRouter;
