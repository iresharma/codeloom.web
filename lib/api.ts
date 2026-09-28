import { API_URL } from "./config";
import type { Project, Repo, Session, SessionArchive, User } from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : response.statusText;
    throw new ApiError(response.status, detail);
  }
  return data as T;
}

export const api = {
  me: (token: string) => request<User>("/me", token),
  repos: (token: string) => request<Repo[]>("/github/repos?per_page=100", token),
  projects: (token: string) => request<Project[]>("/projects", token),
  createProject: (token: string, full_name: string, default_branch?: string) =>
    request<Project>("/projects", token, {
      method: "POST",
      body: JSON.stringify({ full_name, default_branch }),
    }),
  project: (token: string, id: string) => request<Project>(`/projects/${id}`, token),
  sessions: (token: string, projectId: string) =>
    request<Session[]>(`/projects/${projectId}/sessions`, token),
  createSession: (token: string, projectId: string) =>
    request<Session>(`/projects/${projectId}/sessions`, token, { method: "POST" }),
  session: (token: string, id: string) => request<Session>(`/sessions/${id}`, token),
  setSessionTitle: (token: string, id: string, title: string) =>
    request<Session>(`/sessions/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  stopSession: (token: string, id: string) =>
    request<Session>(`/sessions/${id}`, token, { method: "DELETE" }),
  deleteSession: (token: string, id: string) =>
    request<void>(`/sessions/${id}/record`, token, { method: "DELETE" }),
  archive: (token: string, id: string) =>
    request<SessionArchive>(`/sessions/${id}/archive`, token),
  saveArchive: (token: string, id: string, archive: SessionArchive) =>
    request<SessionArchive>(`/sessions/${id}/archive`, token, {
      method: "PUT",
      body: JSON.stringify(archive),
    }),
};
