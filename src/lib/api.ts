import { get } from "svelte/store";
import { auth, refreshAccessToken } from "../stores/auth.store";

const API_BASE = import.meta.env.VITE_API_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = get(auth).token;

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  // On 401, attempt a token refresh and retry once
  if (res.status === 401) {
    let newToken: string;
    try {
      newToken = await refreshAccessToken();
    } catch {
      const data = await res.json().catch(() => ({}));
      const message = (data as any)?.message ?? `Request failed (${res.status})`;
      throw new Error(message);
    }

    const retryRes = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
        ...(options.headers ?? {}),
      },
      ...options,
    });

    const retryData = await retryRes.json();
    if (!retryRes.ok) {
      const message = (retryData as any)?.message ?? `Request failed (${retryRes.status})`;
      throw new Error(message);
    }
    return retryData as T;
  }

  const data = await res.json();

  if (!res.ok) {
    const message = (data as any)?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export function getBoard(boardId: number | string) {
  return request<{ board: any; role?: string }>(`/boards/${boardId}`, {
    method: "GET",
  });
}

export function createColumn(boardId: number | string, name: string) {
  return request<{ column: any }>(`/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function reorderColumns(
  boardId: number | string,
  columnOrder: string[]
) {
  return request(`/boards/${boardId}/columns/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ columnOrder }),
  });
}

export function updateColumn(columnId: number | string, data: any) {
  return request(`/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteColumn(columnId: number | string) {
  return request(`/columns/${columnId}`, { method: "DELETE" });
}

export function createTask(
  columnId: number | string,
  title: string,
  description?: string
) {
  return request<{ task: any }>(`/columns/${columnId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export function updateTask(taskId: number | string, data: any) {
  return request(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function moveTask(
  taskId: number | string,
  columnId: number | string,
  position: number
) {
  return request(`/tasks/${taskId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ columnId, position }),
  });
}

export function deleteTask(taskId: number | string) {
  return request(`/tasks/${taskId}`, { method: "DELETE" });
}
