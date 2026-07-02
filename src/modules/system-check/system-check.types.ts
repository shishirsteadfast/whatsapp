export type SystemCheckStatus = 'ok' | 'fail';

export interface SystemCheckItem {
  key: string;
  status: SystemCheckStatus;
  detail?: string;
}

export interface SystemCheckResult {
  checks: SystemCheckItem[];
  hasIssues: boolean;
  checkedAt: string;
}
