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
      throw new Error(errorBody.detail || `HTTP Error ${response.status}`);
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

  async getRulesByAttackTechnique(technique_id: string, page = 1, page_size = 20): Promise<SearchResponse> {
    const q = new URLSearchParams({ page: String(page), page_size: String(page_size) }).toString();
    return this.request<SearchResponse>(`/dashboard/attack/${encodeURIComponent(technique_id)}?${q}`);
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
