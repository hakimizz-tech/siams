import { z } from 'zod';

export const resolveFlagSchema = z.object({ note: z.string().trim().min(1, 'Add a note') });
