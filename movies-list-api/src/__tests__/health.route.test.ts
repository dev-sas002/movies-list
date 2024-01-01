import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';

/** `readyState` is a non-configurable getter, so swap it out by hand. */
const withReadyState = (state: number, run: () => Promise<void>) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(mongoose.connection),
    'readyState'
  );

  Object.defineProperty(mongoose.connection, 'readyState', {
    value: state,
    configurable: true,
  });

  return run().finally(() => {
    delete (mongoose.connection as unknown as Record<string, unknown>).readyState;
    if (descriptor) {
      Object.defineProperty(Object.getPrototypeOf(mongoose.connection), 'readyState', descriptor);
    }
  });
};

describe('GET /health', () => {
  it('reports 503 while the database is not connected', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'degraded', database: 'disconnected' });
  });

  it('reports ok once the database is connected', async () => {
    await withReadyState(1, async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'ok', database: 'connected' });
      expect(typeof response.body.uptimeSeconds).toBe('number');
    });
  });

  it('says whether AI search is configured without leaking the key', async () => {
    const response = await request(app).get('/health');

    expect(response.body.aiSearch).toBe('disabled');
    expect(JSON.stringify(response.body)).not.toContain('sk-ant');
  });
});
