export type User = {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string | null;
  github_refreshable?: boolean;
  github_access_expires_at?: string | null;
};

export type Repo = {
  full_name: string;
  owner: string;
  name: string;
  default_branch: string;
  private: boolean;
  description: string | null;
  language: string | null;
};

export type WorkItem = {
  number: number;
  title: string;
  html_url: string;
  user: string;
  updated_at: string | null;
};

export type Contributor = {
  login: string;
  avatar_url: string | null;
  contributions: number;
};

export type ProjectOverview = {
  full_name: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  private: boolean;
  html_url: string;
  stars: number;
  forks: number;
  open_issues: number;
  pushed_at: string | null;
  issues: WorkItem[];
  pulls: WorkItem[];
  contributors: Contributor[];
};

export type Project = {
  id: string;
  full_name: string;
  owner: string;
  repo: string;
  default_branch: string;
  runtime: "python" | "node" | "golang";
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
  title: string | null;
  created_at: string;
  stopped_at: string | null;
};

export type FileTreeNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileTreeNode[] | null;
};

export type AgentRun = {
  agent_id: string;
  profile: string;
  cost?: number;
  prompt_tokens?: number;
  cached_tokens?: number;
  total_tokens?: number;
  requests?: number;
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
  worktree?: string;
  run_status?: string;
  summary?: string;
  cost?: number;
  prompt_tokens?: number;
  cached_tokens?: number;
  total_tokens?: number;
  requests?: number;
  duration_ms?: number;
  started_at?: number;
};

export type GitState = {
  branch?: string | null;
  dirty?: boolean;
  staged?: string[];
  unstaged?: string[];
  untracked?: string[];
};

export function mergeGit(git: GitState | null, editedPaths: string[]): GitState | null {
  if (!git && editedPaths.length === 0) return null;
  const staged = git?.staged ?? [];
  const unstaged = git?.unstaged ?? [];
  const untracked = git?.untracked ?? [];
  const known = new Set([...staged, ...unstaged, ...untracked]);
  const extra = editedPaths.filter((path) => path && !known.has(path));
  return {
    ...git,
    staged,
    unstaged: extra.length ? [...unstaged, ...extra] : unstaged,
    untracked,
    dirty: Boolean(staged.length || unstaged.length || untracked.length || extra.length),
  };
}

export type Stats = {
  total_tokens?: number;
  prompt_tokens?: number;
  cached_tokens?: number;
  cost?: number;
  tool_calls?: number;
  turns?: number;
  requests?: number;
  agent_runs?: AgentRun[];
  models?: string[];
};

export type ModelCapability = {
  id: string;
  name?: string;
  supports_reasoning: boolean;
  mandatory?: boolean;
  default_effort?: string | null;
  default_enabled?: boolean | null;
  /** Allowed effort levels for this model, highest first. `null`/absent
   * with supports_reasoning true means every level is accepted. */
  supported_efforts?: string[] | null;
  supports_max_tokens?: boolean;
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
  image?: string;
  image_mime?: string;
};

export type ChatItem = ChatMessage | ChatTool;

export type PullFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
};

export type PullPreview = {
  number: number;
  title: string;
  body: string;
  state: string;
  draft: boolean;
  html_url: string;
  user: string;
  base: string;
  head: string;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  files: PullFile[];
};

export type SessionArchive = {
  stats: Stats | null;
  items: ChatItem[];
};

export type EngineEvent = {
  type: string;
  [key: string]: unknown;
};
