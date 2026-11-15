import { ROUTES } from '@/config/routes';

/** One place that maps an action item `type` to a link target. */
export function actionTarget(type: string): string | undefined {
  const map: Record<string, unknown> = {
    submit_placement: ROUTES.placement,
    complete_placement: ROUTES.placement,
    fix_placement: ROUTES.placement,
    fix_returned_weeks: ROUTES.logbook,
    submit_missing_weeks: ROUTES.logbook,
    upload_final_report: ROUTES.finalReport,
    fix_final_report: ROUTES.finalReport,
    review_weeks: ROUTES.reviews,
    pending_reviews: ROUTES.reviews,
    evaluate_interns: ROUTES.evaluations,
    evaluations_due: ROUTES.evaluations,
    schedule_visit: ROUTES.visits,
    review_final_report: ROUTES.finalReports,
    assessments_due: ROUTES.students,
    approve_placements: ROUTES.placements,
    awaiting_approval: ROUTES.placements,
    assign_supervisors: ROUTES.placements,
    finalize_results: ROUTES.results,
    ready_to_finalize: ROUTES.results,
  };
  return map[type] as string | undefined;
}
