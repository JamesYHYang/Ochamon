import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle HttpException (NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as Record<string, unknown>;
        const result: ErrorResponse = {
          statusCode: status,
          message: (response.message as string) || exception.message,
          error: (response.error as string) || HttpStatus[status],
          timestamp,
          path,
        };
        if (response.details) {
          result.details = response.details as Record<string, unknown>;
        }
        return result;
      }

      return {
        statusCode: status,
        message: exceptionResponse as string,
        error: HttpStatus[status],
        timestamp,
        path,
      };
    }

    // Handle Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database validation error',
        error: 'Bad Request',
        timestamp,
        path,
      };
    }

    // Handle unknown errors
    const message =
      exception instanceof Error ? exception.message : 'An unexpected error occurred';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
      error: 'Internal Server Error',
      timestamp,
      path,
    };
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
  ): ErrorResponse {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'Conflict',
          timestamp,
          path,
          details: {
            field: (exception.meta?.target as string[])?.join(', '),
          },
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
          timestamp,
          path,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
          error: 'Bad Request',
          timestamp,
          path,
        };
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'The change you are trying to make would violate a required relation',
          error: 'Bad Request',
          timestamp,
          path,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          error: 'Internal Server Error',
          timestamp,
          path,
        };
    }
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { method, url, body, headers } = request;
    const userId = (request as Request & { user?: { sub?: string } }).user?.sub;

    const logContext = {
      method,
      url,
      statusCode: errorResponse.statusCode,
      userId,
      userAgent: headers['user-agent'],
      ip: request.ip,
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${errorResponse.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
        logContext,
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(`${method} ${url} - ${errorResponse.statusCode}`, logContext);
    }
  }
}
