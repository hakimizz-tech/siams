import { ErrorPage } from './error-page';

// Same text for "does not exist" and "not yours": the API answers 404 for both.
export default function NotFoundPage() {
  return <ErrorPage title="Page not found" text="We could not find that page. It may not exist, or you may not have access to it." />;
}
