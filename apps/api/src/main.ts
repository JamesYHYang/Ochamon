import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CustomValidationPipe } from './common/pipes/custom-validation.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads', 'products');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static files from uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Security: Helmet middleware for HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400,
  });

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Custom validation pipe with formatted errors
  app.useGlobalPipes(new CustomValidationPipe());

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Matcha Trading Platform API')
    .setDescription(
      `## B2B Matcha Trading Platform REST API

### Overview
This API powers the Matcha Trading Platform, a B2B marketplace connecting matcha producers in Japan with international buyers.

### Authentication
Most endpoints require JWT Bearer authentication. Use the /auth/login endpoint to obtain tokens.

### Rate Limits
- Public endpoints: 100 requests per minute
- Authenticated endpoints: 300 requests per minute
- Admin endpoints: 500 requests per minute

### Response Format
All responses follow a consistent format with appropriate HTTP status codes.`,
    )
    .setVersion('1.0.0')
    .setContact('Matcha Trading Platform', 'https://matchatrade.io', 'support@matchatrade.io')
    .setLicense('Proprietary', 'https://matchatrade.io/terms')
    .addServer(process.env.API_URL || 'http://localhost:3001', 'API Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'access-token',
    )
    // Core endpoints
    .addTag('health', 'Health check and status endpoints')
    .addTag('auth', 'Authentication and authorization')
    // User-facing endpoints
    .addTag('marketplace', 'Public marketplace browsing')
    .addTag('search', 'Search and discovery')
    .addTag('library', 'Reference data (regions, grades)')
    // Buyer endpoints
    .addTag('buyer', 'Buyer profile and preferences')
    .addTag('cart', 'Shopping cart management')
    .addTag('rfq', 'Request for Quotation management')
    // Seller endpoints
    .addTag('seller', 'Seller portal and profile')
    .addTag('products', 'Product catalog management')
    .addTag('quotes', 'Quote management for sellers')
    .addTag('inventory', 'Inventory management')
    // Transaction endpoints
    .addTag('orders', 'Order management and fulfillment')
    .addTag('messaging', 'Communication between parties')
    .addTag('logistics', 'Shipping and logistics')
    // Content endpoints
    .addTag('insights', 'Blog and insights content')
    .addTag('trends', 'Market trends and data')
    // Admin endpoints
    .addTag('admin', 'Administrative operations')
    .addTag('compliance', 'Compliance rules and evaluation')
    .addTag('audit', 'Audit logging and history')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        theme: 'monokai',
      },
    },
    customSiteTitle: 'Matcha API Documentation',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Matcha API running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
