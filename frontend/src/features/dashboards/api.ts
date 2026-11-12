import { get, type PathsWith } from '@/lib/api/endpoints';
import type {
    DashboardEnvelope,
    FinalReportStatus,
    PlacementStatus,
    Role,
    SummaryRow,
    TimelineEvent,
    WeeksSummary,
} from '@/types/domain';

type Loose = Array<Record<string, unknown>>;

export interface StudentWidgets {
    placement: {
        id: string;
        status: PlacementStatus;
        remarks: string;
        period: string;
        organization: string;
        start_date: string;
        end_date: string;
        academic_supervisor: string | null;
        workplace_supervisor: string | null;
    } | null;
    timeline: TimelineEvent[];
    progress: { required_hours: number; approved_hours: number; weeks: WeeksSummary } | null;
    recent_feedback: Loose;
    upcoming_visits: Loose;
    final_report: { id: string; status: FinalReportStatus; feedback: string } | null;
    result: { total_percent: number | string; grade: string | null; finalized_at: string } | null;
}

export interface WorkplaceWidgets {
    interns: Array<{
        placement_id: string;
        student: string;
        approved_hours: number;
        required_hours: number;
        weeks: WeeksSummary;
    }>;
    pending_reviews: Loose;
    overdue_reviews: number;
    evaluations_due: Array<{ placement_id: string; student: string }>;
}

export interface AcademicWidgets {
    students: Array<SummaryRow & { flags: number; indicator: 'on_track' | 'behind' | 'flagged' }>;
    logbook_monitor: Array<{ placement_id: string; student: string } & WeeksSummary>;
    visits: {
        upcoming: Loose;
        due: Array<{ placement_id: string; student: string; done: number; required: number }>;
    };
    assessments_due: Array<{ placement_id: string; student: string }>;
    final_reports: Array<{ report_id: string; placement_id: string; student: string }>;
    flags: Loose;
}

export interface CoordinatorWidgets {
    period: { id: string; name: string } | null;
    pipeline?: {
        counts: Record<PlacementStatus, number>;
        awaiting_approval: Array<{
            placement_id: string;
            student: string;
            organization: string;
            submitted_at: string | null;
        }>;
    };
    supervisor_assignment?: {
        pending_assignment: number;
        workload: Array<{ supervisor: string | null; students: number }>;
    };
    progress?: {
        approved_hours: number;
        required_hours: number;
        weeks_approved: number;
        weeks_expected: number;
        logbook_compliance_percent: number | null;
        visits_done: number;
        visits_required: number;
    };
    flags?: { total: number; by_type: Record<string, number> };
    assessments?: { submitted: number; expected: number };
    final_reports?: Record<FinalReportStatus, number>;
    results?: {
        ready_to_finalize: Array<{ placement_id: string; student: string }>;
        finalized: number;
    };
}

const PATHS: Record<Role, PathsWith<'get'>> = {
    STUDENT: '/api/v1/dashboard/student/',
    WORKPLACE_SUPERVISOR: '/api/v1/dashboard/workplace-supervisor/',
    ACADEMIC_SUPERVISOR: '/api/v1/dashboard/academic-supervisor/',
    COORDINATOR: '/api/v1/dashboard/coordinator/',
};

export const getDashboard = <W>(role: Role, params: object = {}, signal?: AbortSignal) =>
    get<DashboardEnvelope<W>>(PATHS[role], { query: params, signal });
