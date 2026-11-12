// Generates src/types/api.d.ts from the backend's OpenAPI schema.
// Usage: OPENAPI_URL=http://nginx/api/schema/ npm run api:types
import { spawnSync } from 'node:child_process';

const url = process.env.OPENAPI_URL ?? 'http://localhost/api/schema/';
const out = 'src/types/api.d.ts';
console.log(`Generating ${out} from ${url}`);
const result = spawnSync('npx', ['openapi-typescript', url, '-o', out], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
