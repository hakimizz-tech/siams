import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { ROUTES } from '@/config/routes';
import { AssessmentEditor } from '../components/assessment-editor';

export default function EvaluationPage() {
  const { placementId = '' } = useParams();
  return (
    <>
      <PageHeader title="Evaluation" breadcrumbs={[{ label: 'Evaluations', to: ROUTES.evaluations as string }, { label: 'Form' }]} />
      <AssessmentEditor placementId={placementId} />
    </>
  );
}
