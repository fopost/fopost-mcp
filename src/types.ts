import type { z } from 'zod';

/**
 * Internal shape used by tool modules. We keep our own shape (rather
 * than the SDK's `Tool` type) because we want a strongly-typed
 * `execute` callback driven by the Zod input schema.
 */
export type ToolDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: S;
  execute: (input: z.infer<S>) => Promise<unknown>;
};
