import { z, ZodSchema, ZodObject, ZodRawShape } from 'zod'
import { ValidationError } from '../errors'

/**
 * Validate data against a Zod schema, throwing ValidationError on failure
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.format())
  }

  return result.data
}

/**
 * Validate partial data against a Zod schema (for updates)
 */
export function validatePartial<T extends ZodRawShape>(schema: ZodObject<T>, data: unknown) {
  const partialSchema = schema.partial()
  const result = partialSchema.safeParse(data)

  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.format())
  }

  return result.data
}

/**
 * Common field validators
 */
export const validators = {
  uuid: z.string().uuid(),
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
  positiveInt: z.number().int().positive(),
  nonNegativeInt: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
  url: z.string().url(),
}

/**
 * Pagination query validator
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

/**
 * Validate pagination query parameters
 */
export function validatePagination(searchParams: URLSearchParams): PaginationQuery {
  return validate(PaginationQuerySchema, {
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  })
}
