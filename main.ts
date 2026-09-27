const GROQ_BASE = "https://api.groq.com/openai/v1";
const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host",
]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true, service: "groq-openai-proxy" });
  }

  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  const proxyApiKey = Deno.env.get("PROXY_API_KEY");
  if (!groqApiKey || !proxyApiKey) {
    return json({ error: { message: "Proxy is not configured" } }, 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const providedKey = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (providedKey !== proxyApiKey) {
    return json({ error: { message: "Unauthorized" } }, 401);
  }

  if (!url.pathname.startsWith("/openai/v1/")) {
    return json({ error: { message: "Use /openai/v1/<endpoint>" } }, 404);
  }
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return json({ error: { message: "Method not allowed" } }, 405);
  }

  const upstreamUrl = new URL(url.pathname + url.search, GROQ_BASE);
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP) headers.delete(header);
  headers.set("authorization", `Bearer ${groqApiKey}`);
  headers.delete("content-length");
  headers.delete("accept-encoding");

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      // Required for streaming request bodies in Deno's Fetch implementation.
      ...(request.body && !["GET", "HEAD"].includes(request.method)
        ? { duplex: "half" as const }
        : {}),
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const header of HOP_BY_HOP) responseHeaders.delete(header);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return json({ error: { message: "Could not reach Groq" } }, 502);
  }
});
