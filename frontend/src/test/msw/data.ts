import type { Page } from '@/lib/api/pagination';
import type {
    DashboardEnvelope,
    Organization,
    Period,
    Placement,
    Role,
    User,
    UserSummary,
} from '@/types/domain';

let counter = 0;
const next = () => ++counter;

export function user(role: Role = 'STUDENT', overrides: Partial<User> = {}): User {
    const n = next();
    return {
        id: `user-${n}`,
        email: `${role.toLowerCase()}${n}@example.com`,
        full_name: `Test ${role}`,
        phone: '',
        role,
        is_active: true,
        student_profile:
            role === 'STUDENT'
                ? { registration_number: `REG-${n}`, programme: 'BSc', year_of_study: 3 }
                : null,
        supervisor_profile: null,
        ...overrides,
    };
}

export const userSummary = (overrides: Partial<UserSummary> = {}): UserSummary => {
    const n = next();
    return {
        id: `u-${n}`,
        full_name: `Person ${n}`,
        email: `p${n}@example.com`,
        phone: '',
        ...overrides,
    };
};

export const page = <T>(results: T[]): Page<T> => ({
    count: results.length,
    next: null,
    previous: null,
    results,
});

export function period(overrides: Partial<Period> = {}): Period {
    const n = next();
    return {
        id: `period-${n}`,
        name: `Period ${n}`,
        type: 'ATTACHMENT',
        start_date: '2026-09-01',
        end_date: '2026-12-31',
        required_hours: 400,
        min_visits: 2,
        assessment_opens_on: null,
        created_at: '2026-08-01T00:00:00Z',
        ...overrides,
    };
}

export function organization(overrides: Partial<Organization> = {}): Organization {
    const n = next();
    return {
        id: `org-${n}`,
        name: `Acme ${n}`,
        county: 'Nairobi',
        is_verified: true,
        created_at: '2026-08-01T00:00:00Z',
        ...overrides,
    };
}

export function placement(overrides: Partial<Placement> = {}): Placement {
    const n = next();
    return {
        id: `placement-${n}`,
        status: 'DRAFT',
        student: userSummary(),
        period: period(),
        organization: organization(),
        academic_supervisor: null,
        workplace_supervisor: null,
        role_title: 'Intern',
        department: 'IT',
        task_description: 'Build tools.',
        start_date: '2026-09-08',
        end_date: '2026-12-24',
        proposed_supervisor_name: 'Jane Mentor',
        proposed_supervisor_email: 'jane@example.com',
        proposed_supervisor_phone: '',
        coordinator_remarks: '',
        submitted_at: null,
        decided_at: null,
        created_at: '2026-08-01T00:00:00Z',
        ...overrides,
    };
}

export function dashboard<W>(role: Role, widgets: W): DashboardEnvelope<W> {
    return {
        role,
        generated_at: '2026-11-09T08:00:00Z',
        widgets,
        action_items: [],
        notices: [],
        unavailable: [],
    };
}
