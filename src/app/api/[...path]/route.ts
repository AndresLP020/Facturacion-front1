import { type NextRequest } from "next/server";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-encoding",
  "content-length",
]);

function backendBase(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "https://facturacion-back-2n9i.onrender.com"
  ).replace(/\/+$/, "");
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const base = backendBase();
  if (!base) {
    return Response.json(
      { message: "BACKEND_URL no está configurada" },
      { status: 503 },
    );
  }
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const url = `${base}/api/${path.join("/")}${incoming.search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }
  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    return Response.json(
      { message: "No se pudo contactar el backend" },
      { status: 502 },
    );
  }
  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (HOP_BY_HOP.has(name) || name === "set-cookie") return;
    out.append(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    out.append("Set-Cookie", cookie);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
