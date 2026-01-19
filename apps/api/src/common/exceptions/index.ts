import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessRuleException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message,
        error: 'Business Rule Violation',
        ...(details && { details }),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: 'Not Found',
        details: { resource, identifier },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateResourceException extends HttpException {
  constructor(resource: string, field: string, value?: string) {
    const message = value
      ? `${resource} with ${field} '${value}' already exists`
      : `${resource} with this ${field} already exists`;
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
        details: { resource, field, value },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class UnauthorizedAccessException extends HttpException {
  constructor(message = 'You are not authorized to perform this action') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Forbidden',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class TokenExpiredException extends HttpException {
  constructor(tokenType: 'access' | 'refresh' = 'access') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} token has expired`,
        error: 'Unauthorized',
        details: { tokenType },
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class RateLimitExceededException extends HttpException {
  constructor(retryAfter?: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests, please try again later',
        error: 'Too Many Requests',
        ...(retryAfter && { details: { retryAfter } }),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class FileUploadException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'File Upload Error',
        ...(details && { details }),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ExternalServiceException extends HttpException {
  constructor(service: string, message?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: message || `Failed to communicate with ${service}`,
        error: 'Bad Gateway',
        details: { service },
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
