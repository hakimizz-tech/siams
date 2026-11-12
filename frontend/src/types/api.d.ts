/* eslint-disable */
// PLACEHOLDER. Replace with the real contract once the backend is running:
//   make fe-types   (or: OPENAPI_URL=http://localhost/api/schema/ npm run api:types)
// Until then every path is accepted by the compiler. After generation, any wrong path or
// method used in src/features/**/api.ts becomes a compile error.
export interface paths {
  [path: string]: any;
}
export interface components {
  schemas: Record<string, any>;
}
export type operations = Record<string, any>;
