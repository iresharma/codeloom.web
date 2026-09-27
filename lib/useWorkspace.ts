"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "./api";
import type { Project, Repo, Session } from "./types";
import type { ProjectWithSessions } from "./workspace";

type WorkspaceValue = {
  projects: ProjectWithSessions[];
  repos: Repo[];
  loading: boolean;
  error: string | null;
  busy: string | null;
  addRepo: (repo: Repo) => Promise<Project>;
  startSession: (projectId: string) => Promise<Session>;
  refresh: () => Promise<void>;
  patchSession: (session: Session) => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

async function loadProjects(token: string): Promise<ProjectWithSessions[]> {
  const projects = await api.projects(token);
  const sessions = await Promise.all(
    projects.map((project) =>
      api.sessions(token, project.id).catch(() => [] as Session[]),
    ),
  );
  return projects.map((project, index) => ({
    ...project,
    sessions: sessions[index] ?? [],
  }));
}

export function WorkspaceProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextProjects, nextRepos] = await Promise.all([
        loadProjects(token),
        api.repos(token).catch(() => [] as Repo[]),
      ]);
      setProjects(nextProjects);
      setRepos(nextRepos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not load workspace");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const addRepo = useCallback(
    async (repo: Repo) => {
      setBusy(repo.full_name);
      setError(null);
      try {
        const project = await api.createProject(token, repo.full_name, repo.default_branch);
        const next: ProjectWithSessions = { ...project, sessions: [] };
        setProjects((current) => [next, ...current]);
        return project;
      } catch (err) {
        const message = err instanceof Error ? err.message : "could not add project";
        setError(message);
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [token],
  );

  const startSession = useCallback(
    async (projectId: string) => {
      setBusy(projectId);
      setError(null);
      try {
        const session = await api.createSession(token, projectId);
        setProjects((current) =>
          current.map((project) =>
            project.id === projectId
              ? { ...project, sessions: [session, ...project.sessions] }
              : project,
          ),
        );
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : "could not start session";
        setError(message);
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [token],
  );

  const patchSession = useCallback((session: Session) => {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== session.project_id) return project;
        const exists = project.sessions.some((row) => row.id === session.id);
        return {
          ...project,
          sessions: exists
            ? project.sessions.map((row) => (row.id === session.id ? session : row))
            : [session, ...project.sessions],
        };
      }),
    );
  }, []);

  const value = useMemo<WorkspaceValue>(
    () => ({
      projects,
      repos,
      loading,
      error,
      busy,
      addRepo,
      startSession,
      refresh,
      patchSession,
    }),
    [projects, repos, loading, error, busy, addRepo, startSession, refresh, patchSession],
  );

  return createElement(WorkspaceContext.Provider, { value }, children);
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return value;
}
