export type ToolResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type ClientContext = {
  client: {
    id: string;
    name: string;
    industry: string | null;
    contactName: string | null;
    personality: string | null;
    relationshipScore: number;
    notes: string | null;
  };
  activeProjects: {
    id: string;
    name: string;
    status: string;
    openRisks: number;
    recentDecisions: number;
  }[];
  summary: string;
};

export type DecisionTrail = {
  projectId: string;
  projectName: string;
  decisions: {
    id: string;
    title: string;
    rationale: string;
    madeBy: string;
    createdAt: string;
    supersedes: string | null;
  }[];
};

export type WeekSummary = {
  projectId: string;
  projectName: string;
  clientName: string;
  period: { from: string; to: string };
  decisions: string[];
  risksOpened: string[];
  risksResolved: string[];
  tasksAdded: string[];
  digest: string;
};

export type ScopeCreepReport = {
  projectId: string;
  projectName: string;
  agreedScope: string | null;
  totalTasks: number;
  flaggedTasks: {
    id: string;
    title: string;
    addedAt: string;
  }[];
  creepScore: number; // 0-100
};
