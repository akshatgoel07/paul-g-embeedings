import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getConfig } from "@pg/core";
import { chatRoute } from "./chat.ts";

const cfg = getConfig();
const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok", model: cfg.GENERATION_MODEL }));

app.route("/chat", chatRoute);

serve({ fetch: app.fetch, port: cfg.API_PORT }, (info) => {
  console.log(`✓ API listening on http://localhost:${info.port}`);
});
