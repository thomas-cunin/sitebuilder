export interface Site {
  id: string;
  name: string;
  displayName: string;
  sourceUrl?: string | null;
  clientInfo: Record<string, unknown>;
  status: SiteStatus;
  dokployProjectId?: string | null;
  dokployAppId?: string | null;
  deployedUrl?: string | null;
  validationScore?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deployedAt?: Date | string | null;
  jobs?: Job[];
  logs?: Log[];
}

export type SiteStatus =
  | "DRAFT"
  | "GENERATING"
  | "GENERATED"
  | "DEPLOYING"
  | "DEPLOYED"
  | "ERROR";

export interface Job {
  id: string;
  siteId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  error?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type JobType = "GENERATE" | "DEPLOY";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Log {
  id: string;
  siteId: string;
  level: LogLevel;
  message: string;
  createdAt: Date | string;
}

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface Settings {
  id: string;
  adminPassword: string;
  dokployUrl?: string | null;
  dokployToken?: string | null;
  claudeApiKey?: string | null;
  updatedAt: Date | string;
}

export interface ClientInfo {
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  social?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  colors?: {
    primary?: string;
    secondary?: string;
  };
  generationMode?: "creative" | "standard";
}
