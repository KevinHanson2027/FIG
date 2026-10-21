// Row shapes for the Supabase tables (see supabase/schema.sql).

export type Role =
  | 'admin'
  | 'portfolio_manager'
  | 'marketing'
  | 'ppg_member'
  | 'ppg_manager'
  | 'recruiting'
  | 'donor_relations'

export type RoleGrant = { role: Role; sector: string | null }

export type MemberStatus = 'pending' | 'active' | 'alumni'

export type Member = {
  id: string
  user_id: string | null
  name: string
  title: string | null
  sector: string
  email: string | null
  linkedin_url: string | null
  bio: string | null
  headshot_url: string | null
  status: MemberStatus
  is_public: boolean
  class_year: number | null
  sort_order: number
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export type MemberRoleRow = RoleGrant & {
  id: string
  member_id: string
  granted_by: string | null
  created_at: string
}

export type MemberInternal = {
  member_id: string
  abroad_term: string | null
  leadership_interest: boolean
  leadership_note: string | null
  notes: string | null
  updated_at: string
}

export type SectorKind = 'investment' | 'leadership' | 'operations'

export type Sector = {
  name: string
  slug: string
  kind: SectorKind
  benchmark: string | null
  sort_order: number
  is_active: boolean
}

export type RequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled'

export type RoleRequest = {
  id: string
  member_id: string
  role: Exclude<Role, 'admin'>
  sector: string | null
  note: string | null
  status: RequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
}

export type ProfileFields = Partial<Pick<Member, 'name' | 'bio' | 'headshot_url' | 'linkedin_url' | 'sector'>>

export type ProfileChange = {
  id: string
  member_id: string
  changes: ProfileFields
  status: RequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
}

export type TaskKind =
  | 'earnings_report'
  | 'one_pager'
  | 'stock_pitch'
  | 'research'
  | 'presentation'
  | 'ppg_report'
  | 'other'

export type TaskStatus = 'todo' | 'in_progress' | 'submitted' | 'done'
export type TaskTeam = 'sector' | 'ppg' | 'general'

export type Task = {
  id: string
  title: string
  description: string | null
  kind: TaskKind
  team: TaskTeam
  sector: string | null
  ticker: string | null
  batch_id: string | null
  assigned_to: string
  assigned_by: string | null
  due_date: string | null
  status: TaskStatus
  submission_url: string | null
  feedback: string | null
  submitted_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type MeetingKind = 'general' | 'sector' | 'ppg' | 'event'

export type Meeting = {
  id: string
  title: string
  meeting_date: string
  kind: MeetingKind
  sector: string | null
  checkin_code: string | null
  checkin_open: boolean
  created_by: string | null
  created_at: string
}

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent'

export type Attendance = {
  meeting_id: string
  member_id: string
  status: AttendanceStatus
  note: string | null
  recorded_by: string | null
  recorded_at: string
}

export type AssetType = 'equity' | 'etf' | 'bond' | 'fund' | 'other'

export type Holding = {
  id: string
  ticker: string | null
  name: string
  sector: string | null
  asset_type: AssetType
  shares: number
  cost_basis: number | null
  manual_value: number | null
  purchased_on: string | null
  thesis_url: string | null
  notes: string | null
  is_active: boolean
  sold_on: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type Snapshot = {
  snapshot_date: string
  total_value: number
  invested_value: number
  cash: number
  benchmark_close: number | null
  by_sector: Record<string, number>
}

export type ReportKind = 'monthly' | 'quarterly' | 'annual' | 'newsletter' | 'other'

export type Report = {
  id: string
  title: string
  kind: ReportKind
  period_date: string | null
  file_url: string
  summary: string | null
  is_published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Audience = 'all' | 'sector' | 'ppg' | 'pm'

export type Resource = {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  storage_path: string | null
  audience: Audience
  sector: string | null
  uploaded_by: string | null
  created_at: string
}

export type Announcement = {
  id: string
  title: string
  body: string
  audience: Audience
  sector: string | null
  pinned: boolean
  created_by: string | null
  created_at: string
}

export type CandidateStage =
  | 'interested'
  | 'invited'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export type CandidateSource = 'interest_form' | 'referral' | 'application' | 'event' | 'other'

export type Candidate = {
  id: string
  name: string
  email: string
  class_year: number | null
  major: string | null
  source: CandidateSource
  referred_by: string | null
  referral_note: string | null
  sector_interest: string | null
  stage: CandidateStage
  application: Record<string, string> | null
  resume_path: string | null
  resume_url: string | null
  linkedin_url: string | null
  notes: string | null
  member_id: string | null
  cycle: string
  applied_at: string | null
  created_at: string
  updated_at: string
}

export type InterviewStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled'
export type Recommendation = 'strong_yes' | 'yes' | 'maybe' | 'no'

export type Interview = {
  id: string
  candidate_id: string
  interviewer_id: string
  scheduled_at: string | null
  location: string | null
  status: InterviewStatus
  rating: number | null
  recommendation: Recommendation | null
  feedback: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Donation = {
  id: string
  direction: 'in' | 'out'
  party: string
  amount: number
  txn_date: string
  method: string | null
  designation: string | null
  ein: string | null
  acknowledged_on: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export type ActivityEntry = {
  id: number
  actor_id: string | null
  action: string
  table_name: string
  record_id: string | null
  label: string | null
  data: Record<string, unknown> | null
  created_at: string
}

export type Quote = {
  symbol: string
  name: string | null
  price: number | null
  previousClose: number | null
  change: number | null
  changePct: number | null
  high52: number | null
  low52: number | null
}

// settings table values
export type TermSettings = { name: string; starts_on: string }
export type RecruitingSettings = {
  cycle: string
  applications_open: boolean
  deadline: string | null
  intro: string
}
export type PortfolioSettings = { cash: number; risk_free_rate: number; benchmark: string }
export type DonationSettings = {
  rate: number
  fy_start_month: number
  asset_bases: Record<string, number>
}
export type SignupSettings = { open: boolean; domains: string[] }
export type SettingsMap = {
  term: TermSettings
  recruiting: RecruitingSettings
  portfolio: PortfolioSettings
  donations: DonationSettings
  signup: SignupSettings
}
