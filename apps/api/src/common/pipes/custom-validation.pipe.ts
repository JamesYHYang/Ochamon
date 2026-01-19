import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

interface FormattedError {
  field: string;
  constraints: string[];
}

@Injectable()
export class CustomValidationPipe implements PipeTransform<unknown> {
  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: {
        target: false,
        value: false,
      },
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: {
          errors: formattedErrors,
          summary: this.createErrorSummary(formattedErrors),
        },
      });
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): FormattedError[] {
    const formattedErrors: FormattedError[] = [];

    for (const error of errors) {
      if (error.constraints) {
        formattedErrors.push({
          field: error.property,
          constraints: Object.values(error.constraints),
        });
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatNestedErrors(error.children, error.property);
        formattedErrors.push(...nestedErrors);
      }
    }

    return formattedErrors;
  }

  private formatNestedErrors(
    errors: ValidationError[],
    parentPath: string,
  ): FormattedError[] {
    const formattedErrors: FormattedError[] = [];

    for (const error of errors) {
      const fieldPath = `${parentPath}.${error.property}`;

      if (error.constraints) {
        formattedErrors.push({
          field: fieldPath,
          constraints: Object.values(error.constraints),
        });
      }

      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatNestedErrors(error.children, fieldPath);
        formattedErrors.push(...nestedErrors);
      }
    }

    return formattedErrors;
  }

  private createErrorSummary(errors: FormattedError[]): string {
    const fieldNames = errors.map((e) => e.field);
    if (fieldNames.length === 1) {
      return `Validation failed for field: ${fieldNames[0]}`;
    }
    if (fieldNames.length <= 3) {
      return `Validation failed for fields: ${fieldNames.join(', ')}`;
    }
    return `Validation failed for ${fieldNames.length} fields`;
  }
}
