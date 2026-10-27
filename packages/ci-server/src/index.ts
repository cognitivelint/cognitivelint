#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createStoreFromEnv } from './store/index.js';

const port = Number.parseInt(process.env.PORT ?? '3848', 10);
const store = await createStoreFromEnv();
const app = createApp({ store });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CognitiveLint CI listening on http://127.0.0.1:${info.port}`);
});
