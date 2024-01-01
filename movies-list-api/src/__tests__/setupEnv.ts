// Values the application reads through src/config/env.ts.
// Kept deliberately fake - the suite never talks to a real database, and never
// to a real Anthropic API (ANTHROPIC_API_KEY stays unset so the rule-based
// planner is the one under test).
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017';
process.env.PORT = '3001';
process.env.MAX_UPLOAD_BYTES = '4096';
process.env.LIST_CACHE_TTL_MS = '30000';
delete process.env.ANTHROPIC_API_KEY;
