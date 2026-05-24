// tod-start-run — issues a run (GDD §6.3 step 1). The server picks the seed,
// so the client can't cherry-pick easy words and the server knows exactly
// which text should have been typed. Returns { run_id, seed }.

import { CORS, json, serviceClient, getUser } from "../_shared/supa.ts";
import { seedFromString } from "../_shared/prng.ts";

const VALID_MODES = new Set([
  "speedtest-15", "speedtest-30", "speedtest-60", "zombie",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const user = await getUser(req);
  if (!user) return json({ error: "auth required" }, 401);

  const { mode, daily } = await req.json().catch(() => ({}));
  if (!VALID_MODES.has(mode)) return json({ error: "bad mode" }, 400);

  const today = new Date().toISOString().slice(0, 10);
  const bucket = daily ? today : "all";
  // Daily Challenge: the same seed for everyone that UTC day. Otherwise a
  // fresh random seed per run.
  const seed = daily
    ? seedFromString(today + ":" + mode)
    : (Math.random() * 0xffffffff) >>> 0;

  const svc = serviceClient();
  const { data, error } = await svc
    .from("tod_runs")
    .insert({ user_id: user.id, mode, bucket, seed })
    .select("run_id")
    .single();
  if (error) return json({ error: "could not start run" }, 500);

  return json({ run_id: data.run_id, seed, mode, bucket });
});
