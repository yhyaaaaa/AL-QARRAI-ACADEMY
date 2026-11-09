import { defineConfig } from "@playwright/test";

/**
 * Browser E2E against the real local stack. Prerequisites:
 *   npx supabase start        (Postgres, Auth, Storage, Edge Functions, Mailpit)
 *   .env with the local VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * Uses the installed Microsoft Edge to avoid downloading browsers (PW_CHANNEL=chrome to switch).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    channel: process.env.PW_CHANNEL ?? "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
