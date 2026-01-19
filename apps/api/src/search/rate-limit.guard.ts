import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Simple in-memory rate limiter
// For production, use Redis or a dedicated rate limiting service
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  limit: number; // Max requests
  windowMs: number; // Time window in milliseconds
}

/**
 * Decorator to apply rate limiting to a route
 */
export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
    return descriptor;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      handler,
    );

    // If no rate limit options, allow request
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Get user identifier (user ID if authenticated, IP otherwise)
    const userId = request.user?.sub || request.user?.id;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const identifier = userId || ip;

    // Create rate limit key
    const key = `${handler.name}:${identifier}`;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // First request or window expired - reset
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }

    if (entry.count >= options.limit) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    entry.count++;
    return true;
  }
}
