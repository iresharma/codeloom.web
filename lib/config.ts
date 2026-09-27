export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function wsUrl(sessionId: string, token: string): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/sessions/${sessionId}/stream?token=${encodeURIComponent(token)}`;
}
