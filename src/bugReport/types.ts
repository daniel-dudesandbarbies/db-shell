export interface BugReportConfig {
  /** `${VITE_SUPABASE_URL}/functions/v1/report-bug` appky, co widget používá. */
  submitUrl: string
  /** Identifikuje appku v hlášeních ('central-auth' | 'homepage' | 'internal-platform-oz'). */
  appName: string
  userEmail?: string | null
  /** Appka dodává čerstvý access_token (typicky `supabase.auth.getSession()`). */
  getAccessToken: () => Promise<string | null>
}
