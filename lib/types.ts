export type User = {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string | null;
};

export type Repo = {
  full_name: string;
  owner: string;
  name: string;
  default_branch: string;
  private: boolean;
  description: string | null;
};

export type Project = {
  id: string;
  full_name: string;
  owner: string;
  repo: string;
  default_branch: string;
  created_at: string;
};

export type Session = {
  id: string;
  project_id: string;
  status: string;
  repo: string;
  branch: string;
  engine_session_id: string | null;
  error: string | null;
  created_at: string;
  stopped_at: string | null;
};

export type FileTreeNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileTreeNode[] | null;
};

export type AgentRow = {
  id: string;
  role: string;
  profile: string;
  status: string;
  current_tool?: string;
  parent_id?: string;
  task?: string;
  branch?: string;
};

export type GitState = {
  branch?: string | null;
  dirty?: boolean;
  staged?: string[];
  unstaged?: string[];
  untracked?: string[];
};

export type Stats = {
  total_tokens?: number;
  prompt_tokens?: number;
  cached_tokens?: number;
  cost?: number;
  tool_calls?: number;
  turns?: number;
  requests?: number;
};

export type PendingPrompt = {
  prompt_id: string;
  question: string;
  kind: string;
  choices: string[];
  default?: string | null;
};

export type ChatMessage = {
  kind: "message";
  id: string;
  role: string;
  text: string;
  streaming?: boolean;
};

export type ChatTool = {
  kind: "tool";
  call_id: string;
  name: string;
  arguments_json: string;
  preview?: string;
  ok?: boolean;
  duration_ms?: number;
};

export type ChatItem = ChatMessage | ChatTool;

export type EngineEvent = {
  type: string;
  [key: string]: unknown;
};
