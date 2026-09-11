// Secure QR/device authorization for GameVolt Big Picture and standard login.
// The QR contains only the approval token. The polling token stays on the TV.
// An authenticated phone explicitly approves the displayed six-digit code;
// only then can the TV obtain a short-lived, one-time Supabase email token hash.

import { CORS, json, serviceClient, getUser } from "../_shared/supa.ts";

const TTL_MS = 5 * 60 * 1000;
const MAX_CREATES_PER_TEN_MINUTES = 10;

function token(bytes = 32): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash).map((n) => n.toString(16).padStart(2, "0")).join("");
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validSecret(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(value);
}

async function fingerprint(req: Request): Promise<string> {
  const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
  const pepper = Deno.env.get("DEVICE_AUTH_PEPPER") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return digest(pepper + ":" + address);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const svc = serviceClient();
  const now = new Date();
  const nowIso = now.toISOString();
  await svc.from("device_auth_requests").delete().lt("expires_at", nowIso);

  if (action === "create") {
    const clientFingerprint = await fingerprint(req);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const { count } = await svc.from("device_auth_requests")
      .select("id", { count: "exact", head: true })
      .eq("client_fingerprint", clientFingerprint)
      .gte("created_at", tenMinutesAgo);
    if ((count || 0) >= MAX_CREATES_PER_TEN_MINUTES) {
      return json({ error: "too many requests" }, 429);
    }

    const approvalToken = token();
    const pollToken = token();
    const displayCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    const expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
    const { data, error } = await svc.from("device_auth_requests").insert({
      approval_token_hash: await digest(approvalToken),
      poll_token_hash: await digest(pollToken),
      display_code: displayCode,
      client_fingerprint: clientFingerprint,
      expires_at: expiresAt,
    }).select("id").single();
    if (error || !data) return json({ error: "could not create request" }, 500);
    return json({ requestId: data.id, approvalToken, pollToken, displayCode, expiresAt });
  }

  if (!validId(body?.requestId)) return json({ error: "bad request" }, 400);

  if (action === "inspect") {
    if (!validSecret(body?.approvalToken)) return json({ error: "bad request" }, 400);
    const approvalHash = await digest(body.approvalToken);
    const { data: request } = await svc.from("device_auth_requests")
      .select("display_code, status, expires_at")
      .eq("id", body.requestId)
      .eq("approval_token_hash", approvalHash)
      .single();
    if (!request || new Date(request.expires_at) <= now) return json({ status: "expired" }, 410);
    return json({ status: request.status, displayCode: request.display_code, expiresAt: request.expires_at });
  }

  if (action === "approve") {
    if (!validSecret(body?.approvalToken)) return json({ error: "bad request" }, 400);
    const user = await getUser(req);
    if (!user?.email) return json({ error: "auth required" }, 401);
    const approvalHash = await digest(body.approvalToken);
    const { data: request } = await svc.from("device_auth_requests")
      .select("id, display_code, status, expires_at")
      .eq("id", body.requestId)
      .eq("approval_token_hash", approvalHash)
      .single();
    if (!request || request.status !== "pending" || new Date(request.expires_at) <= now) {
      return json({ error: "request expired" }, 410);
    }
    const { data: approved, error } = await svc.from("device_auth_requests").update({
      status: "approved",
      approved_user_id: user.id,
      approved_email: user.email,
      approved_at: nowIso,
    }).eq("id", request.id).eq("status", "pending").select("id").maybeSingle();
    if (error || !approved) return json({ error: "request already handled" }, 409);
    return json({ ok: true, displayCode: request.display_code });
  }

  if (!validSecret(body?.pollToken)) return json({ error: "bad request" }, 400);
  const pollHash = await digest(body.pollToken);

  if (action === "cancel" || action === "consume") {
    await svc.from("device_auth_requests").delete()
      .eq("id", body.requestId).eq("poll_token_hash", pollHash);
    return json({ ok: true });
  }

  if (action !== "status") return json({ error: "bad action" }, 400);
  let { data: request } = await svc.from("device_auth_requests")
    .select("id, status, approved_email, login_token_hash, expires_at")
    .eq("id", body.requestId)
    .eq("poll_token_hash", pollHash)
    .single();
  if (!request || new Date(request.expires_at) <= now) return json({ status: "expired" }, 410);

  if (request.status === "approved" && request.approved_email && !request.login_token_hash) {
    const { data: link, error } = await svc.auth.admin.generateLink({
      type: "magiclink",
      email: request.approved_email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (error || !tokenHash) return json({ error: "could not prepare login" }, 500);
    const { error: storeError } = await svc.from("device_auth_requests")
      .update({ status: "ready", login_token_hash: tokenHash })
      .eq("id", request.id).eq("status", "approved");
    if (storeError) return json({ error: "could not prepare login" }, 500);
    request = { ...request, status: "ready", login_token_hash: tokenHash };
    }

  if (request.status === "ready" && request.login_token_hash && request.approved_email) {
    return json({ status: "ready", email: request.approved_email, tokenHash: request.login_token_hash });
  }
  return json({ status: request.status });
});
