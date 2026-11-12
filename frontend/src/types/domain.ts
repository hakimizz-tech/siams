/**
 * Domain types used by the feature modules. They describe the backend's JSON (Team Alpha
 * serializers; Team Beta shapes follow docs/internship-system-design.md until their schema
 * is published). `api.d.ts` (generated) is the contract; when the two disagree, the generated
 * file wins and these types must be corrected.
 */

export const ROLES = [
    'STUDENT',
    'WORKPLACE_SUPERVISOR',
    'ACADEMIC_SUPERVISOR',
    'COORDINATOR',
] as const;
export type Role = (typeof ROLES)[number];

export const PLACEMENT_STATUSES = [
    'DRAFT',
    'SUBMITTED',
    'RETURNED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'TERMINATED',
] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

export type LogbookStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED';
export type FinalReportStatus = 'SUBMITTED' | 'ACCEPTED' | 'RETURNED';
export type AssessmentStatus = 'DRAFT' | 'SUBMITTED';
export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
export type VisitMode = 'PHONE' | 'VIDEO' | 'ONSITE';
export type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type NoticeAudience = 'ALL' | 'STUDENTS' | 'ACADEMIC_SUPERVISORS' | 'WORKPLACE_SUPERVISORS';
export type CriterionType = 'SCORE' | 'COMMENT';

/** DRF DecimalField values arrive as strings ("60.00"); dashboards use numbers. */
export type DecimalValue = string | number;

// ---- people --------------------------------------------------------------------------
export interface StudentProfile {
    registration_number: string;
    programme: string;
    year_of_study: number | null;
}

export interface SupervisorProfile {
    organization: string | null;
    organization_name: string | null;
    job_title: string;
    department: string;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    role: Role;
    is_active?: boolean;
    created_at?: string;
    student_profile?: StudentProfile | null;
    supervisor_profile?: SupervisorProfile | null;
}

export interface UserSummary {
    id: string;
    full_name: string;
    email: string;
    phone: string;
}

export interface SupervisorOption {
    id: string;
    full_name: string;
    email: string;
    role: Role;
    organization: string | null;
    organization_name: string | null;
}

// ---- placements ----------------------------------------------------------------------
export interface Period {
    id: string;
    name: string;
    type: 'INTERNSHIP' | 'ATTACHMENT';
    start_date: string;
    end_date: string;
    required_hours: number;
    min_visits: number;
    assessment_opens_on: string | null;
    created_at: string;
}

export interface GradeBand {
    min_percent: DecimalValue;
    label: string;
}

export interface Organization {
    id: string;
    name: string;
    address?: string;
    county: string;
    contact_email?: string;
    contact_phone?: string;
    is_verified: boolean;
    created_at: string;
}

export interface Placement {
    id: string;
    status: PlacementStatus;
    student: UserSummary;
    period: Period;
    organization: Organization;
    academic_supervisor: UserSummary | null;
    workplace_supervisor: UserSummary | null;
    role_title: string;
    department: string;
    task_description: string;
    start_date: string;
    end_date: string;
    proposed_supervisor_name: string;
    proposed_supervisor_email: string;
    proposed_supervisor_phone: string;
    coordinator_remarks: string;
    submitted_at: string | null;
    decided_at: string | null;
    created_at: string;
}

export interface TimelineEvent {
    status: PlacementStatus;
    at: string;
    by: string | null;
    remarks: string;
}

// ---- logbook, flags, visits, notices (Team Beta: contract from the design document) ----
export interface DailyActivity {
    id?: string;
    work_date: string;
    hours: DecimalValue;
    approved_hours?: DecimalValue | null;
    description: string;
}

export interface LogbookImage {
    id: string;
    caption: string;
    original_name: string;
    work_date?: string | null;
}

export interface Feedback {
    id: string;
    kind: 'COMMENT' | 'APPROVAL' | 'RETURN';
    comment: string;
    author_name?: string;
    created_at: string;
}

export interface Flag {
    id: string;
    placement: string;
    type: string;
    detail: string;
    resolved: boolean;
    created_at: string;
}

export interface LogbookEntry {
    id: string;
    placement: string;
    week_number: number;
    week_start: string;
    summary: string;
    status: LogbookStatus;
    submitted_at: string | null;
    claimed_hours?: DecimalValue;
    approved_hours?: DecimalValue;
    activities: DailyActivity[];
    images?: LogbookImage[];
    feedback?: Feedback[];
    flags?: Flag[];
}

export interface LogbookTimelineItem {
    week_start: string;
    week_number: number;
    status: LogbookStatus | 'MISSING';
    entry_id: string | null;
}

export interface Visit {
    id: string;
    placement: string;
    mode: VisitMode;
    scheduled_at: string;
    status: VisitStatus;
    notes: string;
    meeting_link?: string;
}

export interface Notice {
    id: string;
    title: string;
    body: string;
    audience: NoticeAudience;
    period: string | null;
    pinned: boolean;
    publish_at: string | null;
    expires_at: string | null;
    send_email: boolean;
    created_at?: string;
}

// ---- assessments, final report, result -------------------------------------------------
export interface Criterion {
    id: string;
    code: string;
    section: string;
    name: string;
    type: CriterionType;
    max_score: number | null;
    weight: DecimalValue;
    required: boolean;
    position: number;
}

export interface AssessmentForm {
    id: string;
    period: string;
    name: string;
    assessor_role: Extract<Role, 'WORKPLACE_SUPERVISOR' | 'ACADEMIC_SUPERVISOR'>;
    version: number;
    weight_percent: DecimalValue;
    is_active: boolean;
    is_locked: boolean;
    criteria: Criterion[];
}

export interface AssessmentScore {
    criterion: string;
    criterion_code: string;
    criterion_name: string;
    score: number | null;
    remark: string;
}

export interface Assessment {
    id: string;
    placement: string;
    form: string;
    form_name: string;
    form_version: number;
    assessor: string;
    assessor_name: string;
    status: AssessmentStatus;
    comment: string;
    percent: DecimalValue | null;
    submitted_at: string | null;
    scores: AssessmentScore[];
}

export interface FinalReport {
    id: string;
    placement: string;
    title: string;
    original_name: string;
    size_bytes: number;
    status: FinalReportStatus;
    feedback: string;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
    download_url: string;
}

export interface ResultBreakdownItem {
    form_id: string;
    name: string;
    version: number;
    assessor_role: Role;
    weight_percent: string;
    status?: string;
    percent: string | null;
}

export interface PlacementResult {
    placement: string;
    finalized: boolean;
    total_percent: DecimalValue | null;
    grade: string | null;
    breakdown: ResultBreakdownItem[];
    finalized_at: string | null;
    missing: string[];
    ready: boolean;
}

// ---- dashboards and reports -----------------------------------------------------------------
export interface ActionItem {
    type: string;
    message: string;
    count: number;
}

export interface DashboardNotice {
    id?: string;
    title: string;
    body?: string;
    pinned?: boolean;
    publish_at?: string | null;
}

export interface DashboardEnvelope<W = Record<string, unknown>> {
    role: Role;
    generated_at: string;
    widgets: W;
    action_items: ActionItem[];
    notices: DashboardNotice[];
    /** Names of backend selectors not delivered yet. Shown in development only. */
    unavailable: string[];
}

export interface WeeksSummary {
    approved: number;
    submitted: number;
    returned: number;
    missing: number;
    expected: number;
}

export interface SummaryRow {
    placement_id: string;
    student_id: string;
    student: string;
    registration_number: string;
    organization: string;
    status: PlacementStatus;
    academic_supervisor: string | null;
    workplace_supervisor: string | null;
    required_hours: number;
    approved_hours: number;
    weeks: WeeksSummary;
    visits_done: number;
    visits_required: number;
    workplace_percent: DecimalValue | null;
    academic_percent: DecimalValue | null;
    final_report: FinalReportStatus | null;
    total_percent: DecimalValue | null;
    grade: string | null;
}

export interface PlacementSummary extends SummaryRow {
    timeline: TimelineEvent[];
    open_flags: Array<Record<string, unknown>>;
    unavailable: string[];
}

export interface PeriodSummary {
    period: { id: string; name: string; required_hours: number; min_visits: number };
    count: number;
    unavailable: string[];
    results: SummaryRow[];
}

// ---- jobs ----------------------------------------------------------------------------------------
export interface JobStart {
    job_id: string;
    status: JobStatus;
}

export interface ImportJob {
    job_id: string;
    status: JobStatus;
    created?: number;
    errors?: Array<{ row: number; email: string; error: string }>;
    error?: string;
}

export interface ExportJob {
    job_id: string;
    status: JobStatus;
    filename?: string;
    download_url?: string;
    error?: string;
}
