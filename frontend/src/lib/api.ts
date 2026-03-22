const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.detail || "An error occurred");
  }

  return data as T;
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(401, "Session expired");
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",  // Always send cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // If 401, attempt token refresh (once)
  if (response.status === 401 && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokens().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      // Retry original request
      const retryResponse = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      return handleResponse<T>(retryResponse);
    } catch (error) {
      // Refresh also failed — only redirect if we aren't already at login
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      throw error instanceof ApiError ? error : new ApiError(401, "Session expired. Please log in again.");
    }
  }

  return handleResponse<T>(response);
}

// Convenience methods
export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),

  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, {
      method: "POST",
      body: formData,
      headers: {},  // Let browser set Content-Type with boundary
    }),
};
