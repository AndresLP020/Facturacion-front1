import { HttpError, request } from "@/lib/api";

const DEFAULT_GHL_ORIGINS = [
  "https://app.gohighlevel.com",
  "https://app.leadconnectorhq.com",
];

export type GhlContextStatus =
  | "idle"
  | "outside_iframe"
  | "waiting"
  | "received"
  | "timeout"
  | "decrypt_error";

export type GhlSanitizedContext = {
  userId: string;
  activeLocation?: string;
  email?: string;
  userName?: string;
  type?: string;
};

export type GhlContextView = {
  status: GhlContextStatus;
  context?: GhlSanitizedContext;
  message?: string;
};

export function ghlContextLabel(status: GhlContextStatus): string {
  switch (status) {
    case "outside_iframe":
      return "Fuera de iframe";
    case "waiting":
      return "Esperando a GHL…";
    case "received":
      return "Recibido";
    case "timeout":
      return "No llegó";
    case "decrypt_error":
      return "Error de descifrado";
    default:
      return "Sin comprobar";
  }
}

export function allowedGhlOrigins(): string[] {
  const extra = (
    process.env.NEXT_PUBLIC_ALLOWED_FRAME_ANCESTORS ||
    process.env.ALLOWED_FRAME_ANCESTORS ||
    ""
  )
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return [...new Set([...DEFAULT_GHL_ORIGINS, ...extra])];
}

export function isEmbeddedInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

function extractCipher(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  for (const key of ["encryptedData", "encryptedUserData", "payload"]) {
    if (typeof row[key] === "string" && row[key].trim())
      return (row[key] as string).trim();
  }
  return null;
}

function requestEncryptedUserData(timeoutMs = 8000): Promise<string> {
  const allowed = new Set(allowedGhlOrigins());
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("timeout"));
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (!allowed.has(event.origin.replace(/\/+$/, ""))) return;
      const data = event.data;
      if (!data || data.message !== "REQUEST_USER_DATA_RESPONSE") return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      const cipher = extractCipher(data.payload ?? data);
      if (!cipher) {
        reject(new Error("empty-payload"));
        return;
      }
      resolve(cipher);
    }
    window.addEventListener("message", onMessage);
    for (const origin of allowed) {
      window.parent.postMessage({ message: "REQUEST_USER_DATA" }, origin);
    }
  });
}

export async function probeGhlContext(): Promise<GhlContextView> {
  if (!isEmbeddedInIframe()) {
    return {
      status: "outside_iframe",
      message: "Abre esta URL como Custom Page dentro de HighLevel.",
    };
  }
  try {
    const encryptedData = await requestEncryptedUserData();
    const context = await request<GhlSanitizedContext>(
      "integrations/ghl/context",
      {
        method: "POST",
        body: JSON.stringify({ encryptedData }),
      },
    );
    return {
      status: "received",
      context,
      message: "El parent de HighLevel entregó contexto y el backend lo descifró.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "timeout") {
      return {
        status: "timeout",
        message:
          "El iframe no recibió REQUEST_USER_DATA_RESPONSE. Revisa la Custom Page y el App ID.",
      };
    }
    if (error instanceof HttpError) {
      return {
        status: "decrypt_error",
        message:
          "Llegó ciphertext pero el backend no pudo validarlo. Revisa GHL_SHARED_SECRET en Render.",
      };
    }
    return {
      status: "timeout",
      message: "No se obtuvo un payload cifrado usable.",
    };
  }
}
