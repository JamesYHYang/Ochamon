import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod Validation Pipe
 * 
 * Validates request bodies, query parameters, and route parameters using Zod schemas.
 * Provides detailed error messages that match the frontend validation behavior.
 * 
 * Usage in controller:
 * ```
 * @Post()
 * create(@Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductInput) {
 *   // dto is now validated and typed
 * }
 * ```
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      // Parse and validate using the Zod schema
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        // Format errors for consistent API response
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
          statusCode: 400,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}

/**
 * Factory function for creating a ZodValidationPipe
 * 
 * Usage:
 * ```
 * @Body(zodPipe(CreateProductSchema)) dto: CreateProductInput
 * ```
 */
export function zodPipe<T extends ZodSchema>(schema: T) {
  return new ZodValidationPipe(schema);
}
