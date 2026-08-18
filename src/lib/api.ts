import { supabase } from "@/lib/supabase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    "Missing VITE_API_BASE_URL. Copy .env.example to .env.local and fill in your API base URL.",
  );
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new ApiError(error.message, 401);
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new ApiError("Not authenticated", 401);
  }

  return accessToken;
}

function messageFromDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.length > 0) {
    return detail;
  }
  if (!Array.isArray(detail)) {
    return null;
  }

  const parts = detail.flatMap((item) => {
    if (typeof item === "string" && item.length > 0) {
      return [item];
    }
    if (typeof item === "object" && item !== null && "msg" in item) {
      const message = (item as { msg: unknown }).msg;
      if (typeof message === "string" && message.length > 0) {
        return [message];
      }
    }
    return [];
  });

  return parts.length > 0 ? parts.join("; ") : null;
}

function messageFromBody(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.length > 0) {
      return record.message;
    }
    const detailMessage = messageFromDetail(record.detail);
    if (detailMessage) {
      return detailMessage;
    }
    if (typeof record.error === "string" && record.error.length > 0) {
      return record.error;
    }
  }
  return fallback;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const isFormData = init.body instanceof FormData;
  if (init.body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      messageFromBody(body, `Request failed (${response.status})`),
      response.status,
    );
  }

  return body as T;
}
