/**
 * Contract tests for every API function the features expose. Each call must reach the right
 * method + path (with trailing slash) and carry the right query/body. Together with the
 * generated `api.d.ts`, this is what stops the frontend calling the wrong endpoint.
 */
import { describe, expect, it } from 'vitest';
import * as assessmentsApi from '@/features/assessments/api';
import * as authApi from '@/features/auth/api';
import * as dashboardsApi from '@/features/dashboards/api';
import * as reportApi from '@/features/final-report/api';
import * as flagsApi from '@/features/flags/api';
import * as logbookApi from '@/features/logbook/api';
import * as noticesApi from '@/features/notices/api';
import * as organizationsApi from '@/features/organizations/api';
import * as periodsApi from '@/features/periods/api';
import * as placementsApi from '@/features/placements/api';
import * as reportsApi from '@/features/reports/api';
import * as usersApi from '@/features/users/api';
import * as visitsApi from '@/features/visits/api';
import { fetchMe, logoutRequest } from '@/lib/auth/session-api';
import { captureApi } from './capture';

interface Case {
    label: string;
    call: () => Promise<unknown>;
    method: string;
    path: string;
}

const id = 'abc';
const file = () => new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });

const cases: Case[] = [
    // ---- auth
    {
        label: 'requestPasswordReset',
        call: () => authApi.requestPasswordReset('a@b.co'),
        method: 'POST',
        path: '/api/v1/auth/password/reset/',
    },
    {
        label: 'confirmPasswordReset',
        call: () =>
            authApi.confirmPasswordReset({
                uid: 'u',
                token: 't',
                new_password1: 'x',
                new_password2: 'x',
            }),
        method: 'POST',
        path: '/api/v1/auth/password/reset/confirm/',
    },
    {
        label: 'changePassword',
        call: () => authApi.changePassword({ new_password1: 'x', new_password2: 'x' }),
        method: 'POST',
        path: '/api/v1/auth/password/change/',
    },
    {
        label: 'updateMe',
        call: () => authApi.updateMe({ full_name: 'N' }),
        method: 'PATCH',
        path: '/api/v1/users/me/',
    },
    { label: 'fetchMe', call: () => fetchMe(), method: 'GET', path: '/api/v1/users/me/' },
    {
        label: 'logoutRequest',
        call: () => logoutRequest(),
        method: 'POST',
        path: '/api/v1/auth/logout/',
    },

    // ---- dashboards (one per role)
    {
        label: 'dashboard student',
        call: () => dashboardsApi.getDashboard('STUDENT'),
        method: 'GET',
        path: '/api/v1/dashboard/student/',
    },
    {
        label: 'dashboard workplace supervisor',
        call: () => dashboardsApi.getDashboard('WORKPLACE_SUPERVISOR'),
        method: 'GET',
        path: '/api/v1/dashboard/workplace-supervisor/',
    },
    {
        label: 'dashboard academic supervisor',
        call: () => dashboardsApi.getDashboard('ACADEMIC_SUPERVISOR'),
        method: 'GET',
        path: '/api/v1/dashboard/academic-supervisor/',
    },
    {
        label: 'dashboard coordinator',
        call: () => dashboardsApi.getDashboard('COORDINATOR'),
        method: 'GET',
        path: '/api/v1/dashboard/coordinator/',
    },

    // ---- placements
    {
        label: 'listPlacements',
        call: () => placementsApi.listPlacements(),
        method: 'GET',
        path: '/api/v1/placements/',
    },
    {
        label: 'getMyPlacement',
        call: () => placementsApi.getMyPlacement(),
        method: 'GET',
        path: '/api/v1/placements/me/',
    },
    {
        label: 'getPlacement',
        call: () => placementsApi.getPlacement(id),
        method: 'GET',
        path: '/api/v1/placements/abc/',
    },
    {
        label: 'getPlacementTimeline',
        call: () => placementsApi.getPlacementTimeline(id),
        method: 'GET',
        path: '/api/v1/placements/abc/timeline/',
    },
    {
        label: 'createPlacement',
        call: () =>
            placementsApi.createPlacement({
                period: 'p',
                organization: 'o',
                start_date: '2026-09-08',
                end_date: '2026-10-08',
            }),
        method: 'POST',
        path: '/api/v1/placements/',
    },
    {
        label: 'updatePlacement',
        call: () => placementsApi.updatePlacement(id, { role_title: 'X' }),
        method: 'PATCH',
        path: '/api/v1/placements/abc/',
    },
    {
        label: 'submitPlacement',
        call: () => placementsApi.submitPlacement(id),
        method: 'POST',
        path: '/api/v1/placements/abc/submit/',
    },
    {
        label: 'approvePlacement',
        call: () =>
            placementsApi.approvePlacement(id, {
                academic_supervisor: 'a',
                invite_workplace_supervisor: true,
            }),
        method: 'POST',
        path: '/api/v1/placements/abc/approve/',
    },
    {
        label: 'returnPlacement',
        call: () => placementsApi.returnPlacement(id, 'fix'),
        method: 'POST',
        path: '/api/v1/placements/abc/return/',
    },
    {
        label: 'rejectPlacement',
        call: () => placementsApi.rejectPlacement(id, 'no'),
        method: 'POST',
        path: '/api/v1/placements/abc/reject/',
    },
    {
        label: 'assignSupervisors',
        call: () => placementsApi.assignSupervisors(id, { academic_supervisor: 'a' }),
        method: 'POST',
        path: '/api/v1/placements/abc/assign-supervisors/',
    },
    {
        label: 'completePlacement',
        call: () => placementsApi.completePlacement(id),
        method: 'POST',
        path: '/api/v1/placements/abc/complete/',
    },
    {
        label: 'terminatePlacement',
        call: () => placementsApi.terminatePlacement(id, 'left'),
        method: 'POST',
        path: '/api/v1/placements/abc/terminate/',
    },

    // ---- organizations
    {
        label: 'listOrganizations',
        call: () => organizationsApi.listOrganizations({ search: 'ac' }),
        method: 'GET',
        path: '/api/v1/organizations/',
    },
    {
        label: 'createOrganization',
        call: () => organizationsApi.createOrganization({ name: 'Acme' }),
        method: 'POST',
        path: '/api/v1/organizations/',
    },
    {
        label: 'updateOrganization',
        call: () => organizationsApi.updateOrganization(id, { county: 'X' }),
        method: 'PATCH',
        path: '/api/v1/organizations/abc/',
    },
    {
        label: 'verifyOrganization',
        call: () => organizationsApi.verifyOrganization(id),
        method: 'POST',
        path: '/api/v1/organizations/abc/verify/',
    },

    // ---- periods
    {
        label: 'listPeriods',
        call: () => periodsApi.listPeriods(),
        method: 'GET',
        path: '/api/v1/periods/',
    },
    {
        label: 'getPeriod',
        call: () => periodsApi.getPeriod(id),
        method: 'GET',
        path: '/api/v1/periods/abc/',
    },
    {
        label: 'createPeriod',
        call: () =>
            periodsApi.createPeriod({
                name: 'P',
                type: 'ATTACHMENT',
                start_date: '2026-09-01',
                end_date: '2026-12-01',
                required_hours: 400,
                min_visits: 2,
            }),
        method: 'POST',
        path: '/api/v1/periods/',
    },
    {
        label: 'updatePeriod',
        call: () => periodsApi.updatePeriod(id, { name: 'Q' }),
        method: 'PATCH',
        path: '/api/v1/periods/abc/',
    },
    {
        label: 'getGradeBands',
        call: () => periodsApi.getGradeBands(id),
        method: 'GET',
        path: '/api/v1/periods/abc/grade-bands/',
    },
    {
        label: 'setGradeBands',
        call: () => periodsApi.setGradeBands(id, [{ min_percent: 0, label: 'F' }]),
        method: 'PUT',
        path: '/api/v1/periods/abc/grade-bands/',
    },

    // ---- users
    {
        label: 'listUsers',
        call: () => usersApi.listUsers({ role: 'STUDENT' }),
        method: 'GET',
        path: '/api/v1/users/',
    },
    {
        label: 'createUser',
        call: () => usersApi.createUser({ email: 'a@b.co', full_name: 'A', role: 'COORDINATOR' }),
        method: 'POST',
        path: '/api/v1/users/',
    },
    {
        label: 'updateUser',
        call: () => usersApi.updateUser(id, { phone: '1' }),
        method: 'PATCH',
        path: '/api/v1/users/abc/',
    },
    {
        label: 'listSupervisors',
        call: () => usersApi.listSupervisors('ACADEMIC_SUPERVISOR'),
        method: 'GET',
        path: '/api/v1/supervisors/',
    },
    {
        label: 'importUsers',
        call: () => usersApi.importUsers(new File(['email,full_name,role'], 'u.csv'), false),
        method: 'POST',
        path: '/api/v1/users/import/',
    },
    {
        label: 'getImportJob',
        call: () => usersApi.getImportJob(id),
        method: 'GET',
        path: '/api/v1/users/import/abc/',
    },

    // ---- logbook (Team Beta contract)
    {
        label: 'listLogbook',
        call: () => logbookApi.listLogbook(id),
        method: 'GET',
        path: '/api/v1/placements/abc/logbook/',
    },
    {
        label: 'getLogbookTimeline',
        call: () => logbookApi.getLogbookTimeline(id),
        method: 'GET',
        path: '/api/v1/placements/abc/logbook/timeline/',
    },
    {
        label: 'createWeek',
        call: () => logbookApi.createWeek(id, { week_start: '2026-11-09', activities: [] }),
        method: 'POST',
        path: '/api/v1/placements/abc/logbook/',
    },
    {
        label: 'getEntry',
        call: () => logbookApi.getEntry(id),
        method: 'GET',
        path: '/api/v1/logbook/abc/',
    },
    {
        label: 'updateWeek',
        call: () => logbookApi.updateWeek(id, { summary: 's' }),
        method: 'PATCH',
        path: '/api/v1/logbook/abc/',
    },
    {
        label: 'submitWeek',
        call: () => logbookApi.submitWeek(id),
        method: 'POST',
        path: '/api/v1/logbook/abc/submit/',
    },
    {
        label: 'approveWeek',
        call: () => logbookApi.approveWeek(id, { comment: 'ok' }),
        method: 'POST',
        path: '/api/v1/logbook/abc/approve/',
    },
    {
        label: 'returnWeek',
        call: () => logbookApi.returnWeek(id, 'fix'),
        method: 'POST',
        path: '/api/v1/logbook/abc/return/',
    },
    {
        label: 'reopenWeek',
        call: () => logbookApi.reopenWeek(id, 'why'),
        method: 'POST',
        path: '/api/v1/logbook/abc/reopen/',
    },
    {
        label: 'listFeedback',
        call: () => logbookApi.listFeedback(id),
        method: 'GET',
        path: '/api/v1/logbook/abc/feedback/',
    },
    {
        label: 'addFeedback',
        call: () => logbookApi.addFeedback(id, 'nice'),
        method: 'POST',
        path: '/api/v1/logbook/abc/feedback/',
    },
    {
        label: 'listPendingReviews',
        call: () => logbookApi.listPendingReviews(),
        method: 'GET',
        path: '/api/v1/logbook/pending/',
    },
    {
        label: 'uploadImage',
        call: () =>
            logbookApi.uploadImage(id, new File(['x'], 'a.png', { type: 'image/png' }), {
                caption: 'c',
            }),
        method: 'POST',
        path: '/api/v1/logbook/abc/images/',
    },
    {
        label: 'deleteImage',
        call: () => logbookApi.deleteImage('img1'),
        method: 'DELETE',
        path: '/api/v1/logbook/images/img1/',
    },

    // ---- flags, visits
    {
        label: 'listFlags',
        call: () => flagsApi.listFlags({ resolved: false }),
        method: 'GET',
        path: '/api/v1/flags/',
    },
    {
        label: 'resolveFlag',
        call: () => flagsApi.resolveFlag(id, 'done'),
        method: 'POST',
        path: '/api/v1/flags/abc/resolve/',
    },
    {
        label: 'listVisits',
        call: () => visitsApi.listVisits(),
        method: 'GET',
        path: '/api/v1/visits/',
    },
    {
        label: 'listPlacementVisits',
        call: () => visitsApi.listPlacementVisits(id),
        method: 'GET',
        path: '/api/v1/placements/abc/visits/',
    },
    {
        label: 'scheduleVisit',
        call: () =>
            visitsApi.scheduleVisit(id, { mode: 'VIDEO', scheduled_at: '2026-11-20T10:00:00Z' }),
        method: 'POST',
        path: '/api/v1/placements/abc/visits/',
    },
    {
        label: 'updateVisit',
        call: () => visitsApi.updateVisit(id, { notes: 'n' }),
        method: 'PATCH',
        path: '/api/v1/visits/abc/',
    },
    {
        label: 'completeVisit',
        call: () => visitsApi.completeVisit(id, 'findings'),
        method: 'POST',
        path: '/api/v1/visits/abc/complete/',
    },

    // ---- assessments, final report, results
    {
        label: 'listForms',
        call: () => assessmentsApi.listForms(id),
        method: 'GET',
        path: '/api/v1/periods/abc/assessment-forms/',
    },
    {
        label: 'createForm',
        call: () =>
            assessmentsApi.createForm(id, {
                name: 'F',
                assessor_role: 'WORKPLACE_SUPERVISOR',
                weight_percent: 60,
                criteria: [],
            }),
        method: 'POST',
        path: '/api/v1/periods/abc/assessment-forms/',
    },
    {
        label: 'importForm',
        call: () =>
            assessmentsApi.importForm({
                period: id,
                name: 'F',
                assessor_role: 'ACADEMIC_SUPERVISOR',
                weight_percent: 40,
                criteria: [],
            }),
        method: 'POST',
        path: '/api/v1/assessment-forms/import/',
    },
    {
        label: 'getForm',
        call: () => assessmentsApi.getForm(id),
        method: 'GET',
        path: '/api/v1/assessment-forms/abc/',
    },
    {
        label: 'replaceForm',
        call: () =>
            assessmentsApi.replaceForm(id, {
                name: 'F',
                assessor_role: 'WORKPLACE_SUPERVISOR',
                weight_percent: 60,
                criteria: [],
            }),
        method: 'PUT',
        path: '/api/v1/assessment-forms/abc/',
    },
    {
        label: 'patchForm',
        call: () => assessmentsApi.patchForm(id, { is_active: true }),
        method: 'PATCH',
        path: '/api/v1/assessment-forms/abc/',
    },
    {
        label: 'newFormVersion',
        call: () => assessmentsApi.newFormVersion(id),
        method: 'POST',
        path: '/api/v1/assessment-forms/abc/new-version/',
    },
    {
        label: 'listAssessments',
        call: () => assessmentsApi.listAssessments(id),
        method: 'GET',
        path: '/api/v1/placements/abc/assessments/',
    },
    {
        label: 'createAssessment',
        call: () => assessmentsApi.createAssessment(id, { form: 'f', scores: [] }),
        method: 'POST',
        path: '/api/v1/placements/abc/assessments/',
    },
    {
        label: 'getAssessment',
        call: () => assessmentsApi.getAssessment(id),
        method: 'GET',
        path: '/api/v1/assessments/abc/',
    },
    {
        label: 'updateAssessment',
        call: () => assessmentsApi.updateAssessment(id, { comment: 'c' }),
        method: 'PATCH',
        path: '/api/v1/assessments/abc/',
    },
    {
        label: 'submitAssessment',
        call: () => assessmentsApi.submitAssessment(id),
        method: 'POST',
        path: '/api/v1/assessments/abc/submit/',
    },
    {
        label: 'getResult',
        call: () => assessmentsApi.getResult(id),
        method: 'GET',
        path: '/api/v1/placements/abc/result/',
    },
    {
        label: 'finalizeResult',
        call: () => assessmentsApi.finalizeResult(id),
        method: 'POST',
        path: '/api/v1/placements/abc/finalize/',
    },
    {
        label: 'getFinalReport',
        call: () => reportApi.getFinalReport(id),
        method: 'GET',
        path: '/api/v1/placements/abc/final-report/',
    },
    {
        label: 'uploadFinalReport',
        call: () => reportApi.uploadFinalReport(id, file(), { title: 'T' }),
        method: 'POST',
        path: '/api/v1/placements/abc/final-report/',
    },
    {
        label: 'acceptReport',
        call: () => reportApi.acceptReport(id),
        method: 'POST',
        path: '/api/v1/final-reports/abc/accept/',
    },
    {
        label: 'returnReport',
        call: () => reportApi.returnReport(id, 'redo'),
        method: 'POST',
        path: '/api/v1/final-reports/abc/return/',
    },

    // ---- notices
    {
        label: 'listNotices',
        call: () => noticesApi.listNotices(),
        method: 'GET',
        path: '/api/v1/notices/',
    },
    {
        label: 'getNotice',
        call: () => noticesApi.getNotice(id),
        method: 'GET',
        path: '/api/v1/notices/abc/',
    },
    {
        label: 'createNotice',
        call: () => noticesApi.createNotice({ title: 'T', body: 'B', audience: 'ALL' }),
        method: 'POST',
        path: '/api/v1/notices/',
    },
    {
        label: 'updateNotice',
        call: () => noticesApi.updateNotice(id, { pinned: true }),
        method: 'PATCH',
        path: '/api/v1/notices/abc/',
    },
    {
        label: 'archiveNotice',
        call: () => noticesApi.archiveNotice(id),
        method: 'DELETE',
        path: '/api/v1/notices/abc/',
    },

    // ---- reports
    {
        label: 'getPlacementSummary',
        call: () => reportsApi.getPlacementSummary(id),
        method: 'GET',
        path: '/api/v1/placements/abc/summary/',
    },
    {
        label: 'getPeriodSummary',
        call: () => reportsApi.getPeriodSummary(id),
        method: 'GET',
        path: '/api/v1/reports/periods/abc/summary/',
    },
    {
        label: 'startExport',
        call: () => reportsApi.startExport(id),
        method: 'POST',
        path: '/api/v1/reports/export/',
    },
    {
        label: 'getExportJob',
        call: () => reportsApi.getExportJob(id),
        method: 'GET',
        path: '/api/v1/reports/export/abc/',
    },
];

describe('API functions call the right endpoint', () => {
    it.each(cases)('$label: $method $path', async ({ call, method, path }) => {
        const calls = captureApi();
        await call();
        expect(calls).toHaveLength(1);
        expect(calls[0]?.method).toBe(method);
        expect(calls[0]?.path).toBe(path);
    });
});

describe('request details', () => {
    it('sends filters as clean query parameters', async () => {
        const calls = captureApi();
        await placementsApi.listPlacements({
            status: 'APPROVED',
            period: 'p1',
            search: '',
            page: 2,
        });
        const query = new URLSearchParams(calls[0]?.search);
        expect(query.get('status')).toBe('APPROVED');
        expect(query.get('period')).toBe('p1');
        expect(query.get('page')).toBe('2');
        expect(query.has('search')).toBe(false);
    });

    it('asks for the whole supervisor list in one page', async () => {
        const calls = captureApi();
        await usersApi.listSupervisors('ACADEMIC_SUPERVISOR');
        const query = new URLSearchParams(calls[0]?.search);
        expect(query.get('role')).toBe('ACADEMIC_SUPERVISOR');
        expect(query.get('page_size')).toBe('100');
    });

    it('passes the period to the coordinator dashboard', async () => {
        const calls = captureApi();
        await dashboardsApi.getDashboard('COORDINATOR', { period: 'p1' });
        expect(new URLSearchParams(calls[0]?.search).get('period')).toBe('p1');
    });

    it('sends the approve decision with the invite flag', async () => {
        const calls = captureApi();
        await placementsApi.approvePlacement('p1', {
            academic_supervisor: 'a1',
            invite_workplace_supervisor: true,
            remarks: 'Welcome',
        });
        expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
            academic_supervisor: 'a1',
            invite_workplace_supervisor: true,
            remarks: 'Welcome',
        });
    });

    it('sends the remarks/reason/feedback each endpoint expects', async () => {
        const calls = captureApi();
        await placementsApi.returnPlacement('p', 'R1');
        await placementsApi.terminatePlacement('p', 'R2');
        await logbookApi.returnWeek('e', 'R3');
        await reportApi.returnReport('r', 'R4');
        await flagsApi.resolveFlag('f', 'R5');
        const bodies = calls.map((c) => JSON.parse(c.body) as Record<string, string>);
        expect(bodies).toEqual([
            { remarks: 'R1' },
            { reason: 'R2' },
            { comment: 'R3' },
            { feedback: 'R4' },
            { note: 'R5' },
        ]);
    });

    it('replaces grade bands with the raw list', async () => {
        const calls = captureApi();
        await periodsApi.setGradeBands('p', [
            { min_percent: '70', label: 'A' },
            { min_percent: 0, label: 'F' },
        ]);
        expect(JSON.parse(calls[0]?.body ?? '[]')).toEqual([
            { min_percent: '70', label: 'A' },
            { min_percent: 0, label: 'F' },
        ]);
    });

    it('starts an export for the chosen period', async () => {
        const calls = captureApi();
        await reportsApi.startExport('per1');
        expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
            report: 'period_summary',
            period: 'per1',
        });
    });

    it('sends uploads as multipart/form-data with the field names the backend expects', async () => {
        const calls = captureApi();
        await reportApi.uploadFinalReport('p', file(), { title: 'My report' });
        await logbookApi.uploadImage('e', new File(['x'], 'a.png', { type: 'image/png' }), {
            caption: 'cap',
            workDate: '2026-11-10',
        });
        await usersApi.importUsers(new File(['x'], 'u.csv'), true);
        for (const call of calls) expect(call.contentType).toContain('multipart/form-data');
        expect(calls[0]?.body).toContain('name="document"');
        expect(calls[0]?.body).toContain('name="title"');
        expect(calls[1]?.body).toContain('name="image"');
        expect(calls[1]?.body).toContain('name="caption"');
        expect(calls[1]?.body).toContain('name="work_date"');
        expect(calls[2]?.body).toContain('name="file"');
        expect(calls[2]?.body).toContain('name="send_invites"');
    });

    it('builds the private file URLs through the API', () => {
        expect(logbookApi.imageFileUrl('i1')).toBe('/api/v1/logbook/images/i1/file/');
        expect(reportApi.reportFileUrl('r1')).toBe('/api/v1/final-reports/r1/file/');
        expect(reportsApi.exportFileUrl('j1')).toBe('/api/v1/reports/export/j1/file/');
    });
});

// ---------------------------------------------------------------------------------------------
// Static guard over the SOURCE of every feature api.ts: Django needs the trailing slash (a
// missing one becomes a redirect that drops the POST body), and parameters must be {name}.
// ---------------------------------------------------------------------------------------------
const sources = import.meta.glob<string>('/src/features/*/api.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
});

describe('endpoint paths written in the feature api modules', () => {
    const literals = Object.entries(sources).flatMap(([file, source]) =>
        [...source.matchAll(/'(\/api\/v1\/[^']*)'/g)].map((match) => ({
            file,
            path: match[1] ?? '',
        })),
    );

    it('finds the paths', () => {
        expect(literals.length).toBeGreaterThan(80);
    });

    it.each(literals)('$path ($file) is well formed', ({ path }) => {
        expect(path.endsWith('/')).toBe(true);
        expect(path).not.toMatch(/\/\//);
        expect(path).not.toMatch(/\s/);
        for (const parameter of path.matchAll(/\{([^}]*)\}/g)) {
            expect(parameter[1]).toMatch(/^[a-z_]+$/);
        }
    });
});
