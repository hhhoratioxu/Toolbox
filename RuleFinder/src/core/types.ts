export type ClientId = 'loon';
export type Verdict = 'match' | 'no-match' | 'unknown';
export type SourceKind = 'local' | 'plugin' | 'subscription';
export type SourceFormat = 'loon-config' | 'loon-rules' | 'loon-plugin' | 'unsupported';
export type SourceStatus = 'ready' | 'loading' | 'error' | 'unsupported';
export type RuleCategory = 'domain' | 'ip' | 'other' | 'final' | 'unknown';
export type ErrorKind = 'http' | 'cors-or-network' | 'network' | 'timeout' | 'size' | 'cancelled' | 'format';
export interface Diagnostic { line: number; message: string; severity: 'warning' | 'error' }
export interface Rule {
  id: string; sourceId: string; raw: string; line: number; type: string; value: string;
  policy?: string; params: string[]; category: RuleCategory; supported: boolean;
  issue?: string; position: number; section: string;
}
export interface Reference {
  id: string; sourceId: string; line: number; raw: string; url: string; policy?: string;
  kind: 'plugin' | 'subscription'; enabled: boolean; position: number; issue?: string;
}
export interface PolicyGroup { name: string; type: string; members: string[]; line: number }
export interface Source {
  id: string; name: string; client: ClientId; format: SourceFormat; kind: SourceKind;
  origin: 'paste' | 'file' | 'remote' | 'demo'; filename?: string; url?: string;
  content: string; rules: Rule[]; references: Reference[]; groups: PolicyGroup[];
  diagnostics: Diagnostic[]; enabled: boolean; status: SourceStatus; loadedAt?: string;
  error?: { kind: ErrorKind; message: string }; demo: boolean; modified?: boolean;
  catalog?: { repository: string; path: string; sha: string; commit: string; state?: 'current' | 'removed' };
}
export interface SourceDraft {
  id: string; name: string; content: string; origin: Source['origin']; filename?: string;
  url?: string; kind?: SourceKind; demo?: boolean; formatHint?: 'config' | 'plugin' | 'auto';
}
export interface Conditions { ips?: string; port?: string; transport?: '' | 'TCP' | 'UDP'; dnsComplete?: boolean }
export interface Target {
  raw: string; normalized: string; hostname?: string; ip?: string; ips: string[];
  port?: number; url?: string; scheme?: string; transport?: 'TCP' | 'UDP';
  dnsComplete: boolean; conditionsChanged: boolean;
}
export interface TraceStep { sourceId: string; name: string; line: number; url?: string; label: string }
export interface Evaluation {
  id: string; rule: Rule; verdict: Verdict; reason: string; policy?: string;
  trace: TraceStep[]; priority: number[]; disposition?: 'effective' | 'candidate' | 'shadowed' | 'blocker' | 'library';
  synthetic?: boolean;
}
export interface QueryResult {
  target: Target; mode: 'library' | 'simulate'; rows: Evaluation[]; checked: number;
  noMatch: number; certainty: 'certain' | 'uncertain' | 'library' | 'no-config' | 'none';
  effectiveId?: string; candidateId?: string; policy?: string; missing: string[];
  elapsed: number; modified: boolean; incomplete: boolean; groups: PolicyGroup[]; configId?: string;
}
export interface Adapter {
  id: ClientId; name: string; parse(draft: SourceDraft): Source;
  evaluate(rule: Rule, target: Target): { verdict: Verdict; reason: string };
  priority(rule: Rule, kind: SourceKind, target: Target, path: number[]): number[];
}
