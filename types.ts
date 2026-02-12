// API Response Types

export enum UserRole {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST'
}

export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  roles: UserRole[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RuleListItem {
  id: string;
  path: string;
  title: string;
  status: string;
  level: string;
  author: string;
  rule_date: string;
  logsource_product: string;
  logsource_category: string;
  logsource_service: string;
  tags: string[];
  attack_ids: string[];
  description: string;
}

export interface RuleDetail extends RuleListItem {
  yaml_content: string;
  raw_text?: string;
}

export interface FilterOptions {
  products: string[];
  categories: string[];
  levels: string[];
  statuses: string[];
  authors: string[];
}

export interface SearchResponse {
  rules: RuleListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  index_version: string;
  filters_applied: Record<string, any>;
}

export interface DashboardSummary {
  total_rules: number;
  index_version: string;
  by_product: Record<string, number>;
  by_category: Record<string, number>;
  by_level: Record<string, number>;
  by_status: Record<string, number>;
  attack_coverage: number;
}

export interface GenerateRuleResponse {
  yaml_code: string;
  confidence: number;
  tokens_used: number;
  sanitized_prompt: string;
}

export interface ProposalResponse {
  pr_url: string;
  status: string;
  branch: string;
}

export interface BranchInfo {
  branches: string[];
  base: string;
}

export interface MitreMatrixResponse {
  domain: string;
  version: string;
  tactics: MitreTactic[];
  techniques_by_tactic: Record<string, MitreTechnique[]>;
  coverage_stats: any;
}

export interface MitreTactic {
  id: string;
  name: string;
  external_id: string;
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactics: string[];
  platforms: string[];
  rule_count: number;
  url: string;
}

export interface IndexStats {
  total_rules: number;
  index_version: string;
  error_count: number;
  rules_with_attack_tags: number;
  by_product: Record<string, number>;
  by_level: Record<string, number>;
  by_status: Record<string, number>;
  repo_path: string;
  repo_exists: boolean;
}

export interface SchedulerStatus {
  running: boolean;
  jobs: any[];
  timestamp: string;
}

export interface ImportResult {
  status: string;
  git_result?: string;
  index_stats?: IndexStats;
  message?: string;
}

export interface ExportEstimate {
  rule_count: number;
  estimated_size_mb: number;
  mode: string;
  exceeds_limits: boolean;
}
