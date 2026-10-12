export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const API =
  process.env.NODE_ENV === "production"
    ? ""
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
        /\/+$/,
        "",
      );

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (
    ["POST", "PATCH", "PUT", "DELETE"].includes(
      (init.method || "GET").toUpperCase(),
    )
  ) {
    const csrf = document.cookie
      .split("; ")
      .find((v) => v.startsWith("aida_csrf="))
      ?.split("=")
      .slice(1)
      .join("=");
    if (csrf) headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  }
  const response = await fetch(`${API}/api/v1/${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new HttpError(
      response.status,
      body.message || `Error HTTP ${response.status}`,
    );
  }
  return response.json();
}
