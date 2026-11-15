import { ErrorPage } from './error-page';

export default function ForbiddenPage() {
  return <ErrorPage title="Not allowed" text="Your role does not have access to this page." />;
}
