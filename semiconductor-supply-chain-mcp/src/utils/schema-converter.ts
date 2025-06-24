import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function convertZodToJsonSchema(schema: z.ZodType<any>) {
  return zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none'
  });
}