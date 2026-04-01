import { API_BASE_URL } from '../constants';
import { 
  LoginResponse, 
  User, 
  DashboardSummary, 
  SearchResponse, 
  GenerateRuleResponse, 
  ProposalResponse,
  BranchInfo,
  MitreMatrixResponse,
  IndexStats,
  SchedulerStatus,
  RuleDetail,
  FilterOptions,
  ImportResult,
  ExportEstimate
} from '../types';

// --- Phase B+C Types ---
export interface GitRepoSource {
  id: number;
  name: string;
  repo_url: string;
  branch: string;
  rules_subpath: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_commit_hash: string | null;
  rule_count: number;
  created_at: string;
}

export type ServiceStatus = 'implemented' | 'not_implemented' | 'na' | 'planned' | 'in_progress';

export interface ProductStatusEntry {
  status: ServiceStatus;
  services: Record<string, ServiceStatus>;
}

/** Per-rule override: analyst can set a status different from the auto-inferred one */
export interface RuleOverride {
  status: ServiceStatus;
  note?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface ClientProfile {
  id: number;
  name: string;
  description: string | null;
  filters: Record<string, any>;
  is_active: boolean;
  rule_count: number;
  created_at: string;
  updated_at: string | null;
}

/** Resolves the effective status of a rule based on product_status config */
export function resolveRuleStatus(
  rule: { logsource_product?: string | null; logsource_service?: string | null },
  productStatus: Record<string, ProductStatusEntry>,
  overrides: Record<string, RuleOverride>,
  ruleId: string | number,
): { status: ServiceStatus; source: 'override' | 'service' | 'product' | 'default' } {
  // 1. Check override first
  const ov = overrides[String(ruleId)];
  if (ov) return { status: ov.status, source: 'override' };

  const product = (rule.logsource_product || '').toLowerCase();
  const service = (rule.logsource_service || '').toLowerCase();
  const entry = productStatus[product];

  if (!entry) return { status: 'not_implemented', source: 'default' };

  // 2. Check service-level status
  if (service && entry.services[service] !== undefined) {
    return { status: entry.services[service], source: 'service' };
  }

  // 3. Fall back to product-level
  return { status: entry.status, source: 'product' };
}

export interface ClientCoverage {
  client_id: number;
  client_name: string;
  domain: string;
  version: string;
  total_techniques: number;
  total_with_subtechniques: number;
  covered_techniques: number;
  coverage_percentage: number;
  by_tactic: Record<string, { total: number; covered: number; percentage: number }>;
  uncovered_count: number;
}

export interface ClientGaps {
  client_id: number;
  client_name: string;
  total_gaps: number;
  gaps_by_tactic: Record<string, {
    id: string; name: string; tactics: string[]; url: string;
    priority: 'high' | 'medium' | 'low';
    covered_subtechniques: number; total_subtechniques: number;
  }[]>;
  priority_summary: { high: number; medium: number; low: number };
}

export interface ClientCompare {
  client_id: number;
  client_name: string;
  client_coverage: number;
  global_coverage: number;
  delta: number;
  only_in_global_count: number;
  only_in_global: string[];
  shared_techniques: number;
  recommendation: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private getHeaders() {
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.hash = '#/login';
      }
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorBody.detail || `HTTP Error ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    // Handle file downloads or non-JSON responses if necessary, 
    // but for this standard API wrapper we assume JSON unless handled specifically.
    return response.json();
  }

  // Health
  async health(): Promise<any> {
    return this.request<any>('/health');
  }

  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Dev-only: reset a user's password directly (backend must enable DAC_ALLOW_DEV_PASSWORD_RESET)
  async devResetPassword(email: string, password: string): Promise<any> {
    return this.request<any>('/auth/dev-reset', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Dashboard & Rules
  async getSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard/summary');
  }

  async getFilters(): Promise<FilterOptions> {
    return this.request<FilterOptions>('/dashboard/filters');
  }

  async searchRules(params: Record<string, any>): Promise<SearchResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    return this.request<SearchResponse>(`/dashboard/search?${query.toString()}`);
  }

  async getRuleDetails(ruleId: string): Promise<RuleDetail> {
    return this.request<RuleDetail>(`/dashboard/rules/${ruleId}`);
  }

  async getRulesByAttackTechnique(
    technique_id: string,
    page = 1,
    page_size = 50,
    product?: string,
  ): Promise<SearchResponse> {
    const q = new URLSearchParams({ page: String(page), page_size: String(page_size) });
    if (product) q.set('product', product);
    return this.request<SearchResponse>(`/dashboard/attack/${encodeURIComponent(technique_id)}?${q.toString()}`);
  }

  // Export
  async estimateExport(params: Record<string, any>): Promise<ExportEstimate> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    return this.request<ExportEstimate>(`/export/estimate?${query.toString()}`);
  }

  async downloadExport(params: Record<string, any>): Promise<void> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    
    // Manual fetch for blob download
    const response = await fetch(`${API_BASE_URL}/export/download?${query.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!response.ok) throw new Error("Export failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dac_export_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async exportAsync(params: Record<string, any>): Promise<any> {
    const payload: Record<string, any> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') payload[key] = value;
    });

    return this.request<any>('/export/async', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getExportStatus(job_id: string): Promise<any> {
    return this.request<any>(`/export/status/${encodeURIComponent(job_id)}`);
  }

  async downloadExportJob(job_id: string, filename?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/export/download/${encodeURIComponent(job_id)}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });

    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `dac_export_${job_id}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async exportByIds(payload: { rule_ids: string[]; filters_applied?: any; index_version?: string }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/export/by-ids`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Export by ids failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sigma_rules_export_selected_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Generator
  async generateRule(prompt: string): Promise<GenerateRuleResponse> {
    return this.request<GenerateRuleResponse>('/generate-rule', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async createProposal(
    yaml_code: string,
    branch_name?: string,
    reuse_branch?: boolean
  ): Promise<ProposalResponse> {
    return this.request<ProposalResponse>('/proposal', {
      method: 'POST',
      body: JSON.stringify({ yaml_code, branch_name, reuse_branch }),
    });
  }

  async getBranches(): Promise<BranchInfo> {
    return this.request<BranchInfo>('/branches');
  }

  async mergeBranch(branch_name: string): Promise<any> {
    return this.request<any>(`/branches/${encodeURIComponent(branch_name)}/merge`, { method: 'POST' });
  }

  async deleteBranch(branch_name: string): Promise<any> {
    return this.request<any>(`/branches/${encodeURIComponent(branch_name)}`, { method: 'DELETE' });
  }

  // MITRE
  async getMitreVersions(): Promise<any[]> {
    return this.request<any[]>('/mitre/versions');
  }

  async getMitreCoverage(domain = 'enterprise'): Promise<any> {
    return this.request<any>(`/mitre/coverage?domain=${domain}`);
  }

  async getMitreMatrix(domain = 'enterprise'): Promise<MitreMatrixResponse> {
    return this.request<MitreMatrixResponse>(`/mitre/matrix?domain=${domain}`);
  }

  async getMitreTechnique(technique_id: string, domain = 'enterprise'): Promise<any> {
    return this.request<any>(`/mitre/techniques/${encodeURIComponent(technique_id)}?domain=${domain}`);
  }

  async listMitreTechniques(params: {
    domain?: string;
    tactic?: string;
    covered_only?: boolean;
    uncovered_only?: boolean;
  } = {}): Promise<any[]> {
    const q = new URLSearchParams();
    if (params.domain) q.set('domain', params.domain);
    if (params.tactic) q.set('tactic', params.tactic);
    if (params.covered_only) q.set('covered_only', 'true');
    if (params.uncovered_only) q.set('uncovered_only', 'true');
    const qs = q.toString();
    return this.request<any[]>(`/mitre/techniques${qs ? `?${qs}` : ''}`);
  }

  async listMitreTactics(domain = 'enterprise'): Promise<any[]> {
    return this.request<any[]>(`/mitre/tactics?domain=${domain}`);
  }

  async updateMitre(domain = 'enterprise', force = false): Promise<any> {
    const qs = new URLSearchParams({ domain });
    if (force) qs.set('force', 'true');
    return this.request(`/mitre/update?${qs.toString()}`, { method: 'POST' });
  }

  // Admin Users
  async getUsers(skip = 0, limit = 50): Promise<{users: User[], total: number}> {
    return this.request<{users: User[], total: number}>(`/admin/users?skip=${skip}&limit=${limit}`);
  }

  async createUser(data: Partial<User> & {password: string}): Promise<User> {
    return this.request<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return this.request<User>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  // Admin Import & Index
  async getIndexStats(): Promise<IndexStats> {
    return this.request<IndexStats>('/admin/index/stats');
  }

  async getIndexErrors(params: { index_version?: string; limit?: number } = {}): Promise<{errors: any[], total: number}> {
    const q = new URLSearchParams();
    if (params.index_version) q.set('index_version', params.index_version);
    q.set('limit', String(params.limit ?? 100));
    return this.request<{errors: any[], total: number}>(`/admin/index/errors?${q.toString()}`);
  }

  async downloadIndexErrorsExport(params: { index_version?: string; limit?: number; fmt?: 'json' | 'csv' } = {}): Promise<void> {
    const q = new URLSearchParams();
    if (params.index_version) q.set('index_version', params.index_version);
    if (typeof params.limit === 'number') q.set('limit', String(params.limit));
    q.set('fmt', params.fmt || 'json');

    const response = await fetch(`${API_BASE_URL}/admin/index/errors/export?${q.toString()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });

    if (!response.ok) throw new Error('Index errors export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ext = (params.fmt || 'json') === 'csv' ? 'csv' : 'json';
    const iv = params.index_version ? params.index_version.substring(0, 8) : 'unknown';
    a.href = url;
    a.download = `dac_index_errors_${iv}_${new Date().toISOString().slice(0,10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async triggerReindex(full: boolean): Promise<any> {
    return this.request('/admin/index/reindex', {
      method: 'POST',
      body: JSON.stringify({ full })
    });
  }

  async getScheduler(): Promise<SchedulerStatus> {
    return this.request<SchedulerStatus>('/admin/index/scheduler');
  }

  async triggerSchedulerJob(job_id: 'reindex_job' | 'mitre_update_job'): Promise<any> {
    return this.request<any>(`/admin/index/scheduler/trigger/${job_id}`, { method: 'POST' });
  }

  async getImportStatus(): Promise<any> {
    return this.request<any>('/admin/import/status');
  }

  async importSigmaHQ(branch = 'master'): Promise<ImportResult> {
    return this.request<ImportResult>(`/admin/import/sigmahq?branch=${encodeURIComponent(branch)}`, { method: 'POST' });
  }

  async importGit(repoUrl: string, branch?: string, rules_subpath?: string): Promise<ImportResult> {
    return this.request<ImportResult>('/admin/import/git', {
      method: 'POST',
      body: JSON.stringify({ repo_url: repoUrl, branch, rules_subpath })
    });
  }

  async importZip(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    // Manual fetch for Multipart
    const response = await fetch(`${API_BASE_URL}/admin/import/zip`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Import failed");
    }
    return response.json();
  }

  async importSync(): Promise<ImportResult> {
    return this.request<ImportResult>('/admin/import/sync', { method: 'POST' });
  }

  // --- Phase A: Persistence ---
  async rebuildFilesystem(): Promise<{ restored: number; total_in_db: number; errors: { path: string; error: string }[] }> {
    return this.request('/admin/import/rebuild', { method: 'POST' });
  }

  // --- Phase B: Multi-Repo ---
  async probeRepo(repo_url: string): Promise<{
    accessible: boolean;
    branches: string[];
    default_branch: string | null;
    error?: string;
    already_registered: boolean;
    existing_source_id: number | null;
  }> {
    return this.request('/admin/repos/probe', {
      method: 'POST',
      body: JSON.stringify({ repo_url }),
    });
  }

  async listRepos(): Promise<{ items: GitRepoSource[]; total: number }> {
    return this.request('/admin/repos');
  }

  async createRepo(data: { name: string; repo_url: string; branch: string; rules_subpath: string }): Promise<GitRepoSource> {
    return this.request('/admin/repos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRepo(id: number): Promise<GitRepoSource> {
    return this.request(`/admin/repos/${id}`);
  }

  async deleteRepo(id: number): Promise<void> {
    return this.request(`/admin/repos/${id}`, { method: 'DELETE' });
  }

  async syncRepo(id: number): Promise<{ status: string; git_result?: string; index_stats: Record<string, any> }> {
    return this.request(`/admin/repos/${id}/sync`, { method: 'POST' });
  }

  // --- Phase C: Client Profiles ---
  async listClients(): Promise<{ items: ClientProfile[]; total: number }> {
    return this.request('/clients');
  }

  async createClient(data: { name: string; description?: string; filters: Record<string, any> }): Promise<ClientProfile> {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClient(id: number): Promise<ClientProfile> {
    return this.request(`/clients/${id}`);
  }

  async updateClient(id: number, data: { name?: string; description?: string; filters?: Record<string, any>; is_active?: boolean }): Promise<ClientProfile> {
    return this.request(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number): Promise<void> {
    return this.request(`/clients/${id}`, { method: 'DELETE' });
  }

  async getClientCoverage(id: number, domain = 'enterprise'): Promise<ClientCoverage> {
    return this.request<ClientCoverage>(`/clients/${id}/coverage?domain=${domain}`);
  }

  async getClientRules(id: number, page = 1, pageSize = 20): Promise<{
    client_id: number; client_name: string; total: number; page: number; page_size: number;
    items: { id: number; path: string; title: string; level: string; status: string; product: string; category: string; attack_ids: string }[];
  }> {
    return this.request(`/clients/${id}/rules?page=${page}&page_size=${pageSize}`);
  }

  async getClientGaps(id: number, domain = 'enterprise'): Promise<ClientGaps> {
    return this.request<ClientGaps>(`/clients/${id}/gaps?domain=${domain}`);
  }

  async getClientCompare(id: number, domain = 'enterprise'): Promise<ClientCompare> {
    return this.request<ClientCompare>(`/clients/${id}/compare?domain=${domain}`);
  }

  // Sigma Converter
  async getSigmaTargets(): Promise<{ name: string; description: string }[]> {
    return this.request('/sigma/targets');
  }

  async getSigmaFormats(target?: string): Promise<{ name: string; description: string; target?: string }[]> {
    const qs = target ? `?target=${encodeURIComponent(target)}` : '';
    return this.request(`/sigma/formats${qs}`);
  }

  async getSigmaPipelines(target?: string): Promise<{ name: string; targets: string[] }[]> {
    const qs = target ? `?target=${encodeURIComponent(target)}` : '';
    return this.request(`/sigma/pipelines${qs}`);
  }

  async convertSigmaRule(payload: {
    rule: string;
    target: string;
    format?: string;
    pipeline?: string[];
    pipeline_yaml?: string;
    html_escape?: boolean;
  }): Promise<{ result: string }> {
    return this.request('/sigma/convert', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Rule Picker endpoints (SPEC-CONV-001) ---

  async searchSigmaRules(params: {
    q?: string;
    page?: number;
    page_size?: number;
    level?: string;
    product?: string;
  }): Promise<{
    items: {
      id: number;
      title: string;
      level: string | null;
      status: string | null;
      logsource_product: string | null;
      logsource_category: string | null;
      tags: string[] | null;
    }[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return this.request(`/sigma/rules/search?${q.toString()}`);
  }

  async getSigmaRuleYaml(ruleId: number): Promise<{
    id: number;
    title: string;
    yaml_content: string;
  }> {
    return this.request(`/sigma/rules/${ruleId}/yaml`);
  }

  async convertSigmaRuleById(payload: {
    rule_id: number;
    target: string;
    format?: string;
    pipeline?: string[];
    pipeline_yaml?: string;
    html_escape?: boolean;
  }): Promise<{ result: string }> {
    return this.request('/sigma/convert-rule', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin Local Rules (custom / IA)
  async listLocalRules(params: { page?: number; page_size?: number; q?: string } = {}): Promise<any> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const qs = query.toString();
    return this.request<any>(`/admin/rules/local${qs ? `?${qs}` : ''}`);
  }

  async createLocalRule(
    path: string,
    yaml_content: string,
    overwrite = false,
    auto_index = true
  ): Promise<any> {
    return this.request<any>('/admin/rules/local', {
      method: 'POST',
      body: JSON.stringify({ path, yaml_content, overwrite, auto_index }),
    });
  }

  async updateLocalRule(ruleId: string, yaml_content: string, auto_index = true): Promise<any> {
    return this.request<any>(`/admin/rules/local/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ yaml_content, auto_index }),
    });
  }

  async deleteLocalRule(ruleId: string): Promise<any> {
    return this.request<any>(`/admin/rules/local/${ruleId}`, { method: 'DELETE' });
  }
}

export const api = new ApiService();