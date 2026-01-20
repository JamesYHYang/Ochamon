# Matcha Trading Platform

A comprehensive B2B marketplace for premium matcha trading, connecting Japanese matcha producers with international buyers through streamlined RFQs, intelligent compliance guidance, and AI-powered search.

## Features

### For Buyers
- **Product Discovery**: Browse and search premium matcha products by region, grade, and certifications
- **Smart Cart**: Add products to cart with automatic price tier calculations
- **RFQ System**: Create detailed Requests for Quotation with multiple line items
- **Quote Comparison**: Receive and compare quotes from multiple sellers
- **Compliance Guidance**: Automated compliance checking for international shipments
- **Shortlisting**: Save products for later comparison

### For Sellers
- **Product Management**: Create and manage product listings with SKUs, images, and documents
- **Price Tier System**: Set quantity-based pricing with multiple tiers
- **Inventory Management**: Track available and reserved stock
- **Quote Management**: Respond to RFQs with detailed quotes
- **Order Fulfillment**: Process accepted quotes and manage shipments
- **Verification**: Business verification system for trust and credibility

### For Administrators
- **User Management**: Manage all platform users and roles
- **Compliance Rules**: Create and manage destination-specific compliance rules
- **Content Management**: Publish insights/blog posts and manage market trends
- **Audit Logging**: Track all administrative actions for compliance
- **Analytics**: Monitor platform activity and performance

## Tech Stack

- **Monorepo**: pnpm workspaces for efficient dependency management
- **API**: NestJS + TypeScript + Prisma + PostgreSQL
- **Web**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Shared**: Zod schemas for end-to-end type safety
- **Security**: Helmet, CORS, Rate Limiting, JWT Authentication

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd matcha-platform
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Root .env for Docker
cp .env.example .env

# API .env
cp apps/api/.env.example apps/api/.env

# Web .env
cp apps/web/.env.example apps/web/.env.local
```

> **Important**: Update `JWT_SECRET` and `JWT_REFRESH_SECRET` with secure random values in production.

### 3. Start Database

```bash
docker compose up -d
```

### 4. Run Database Migrations & Seed

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Start both API and Web
pnpm dev

# Or start separately
pnpm dev:api  # http://localhost:3001
pnpm dev:web  # http://localhost:3000
```

## Demo Accounts

After seeding, you can log in with these accounts:

| Role     | Email                      | Password    |
|----------|----------------------------|-------------|
| Admin    | admin@matcha-trade.com     | Admin123!   |
| Seller 1 | seller@kyoto-matcha.com    | Seller123!  |
| Seller 2 | seller@nishio-green.com    | Seller123!  |
| Buyer 1  | buyer@urbantea.com         | Buyer123!   |
| Buyer 2  | buyer@healthybites.com     | Buyer123!   |

## API Documentation

Interactive Swagger UI available at: http://localhost:3001/api/docs

### Key API Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| Auth | `POST /api/auth/login` | User login |
| Auth | `POST /api/auth/register` | User registration |
| Marketplace | `GET /api/marketplace/products` | Browse products |
| Search | `GET /api/search` | Unified search |
| Cart | `GET/POST /api/cart` | Cart management |
| RFQ | `POST /api/rfq` | Create RFQ |
| Quotes | `GET /api/quotes` | View quotes |
| Compliance | `POST /api/compliance/evaluate` | Check compliance |

## Project Structure

```
matcha-platform/
├── apps/
│   ├── api/                     # NestJS API
│   │   ├── prisma/              # Database schema & migrations
│   │   └── src/
│   │       ├── audit/           # Audit logging module
│   │       ├── auth/            # Authentication & authorization
│   │       ├── buyer/           # Buyer profile & shortlist
│   │       ├── cart/            # Shopping cart
│   │       ├── common/          # Shared filters, pipes, exceptions
│   │       ├── compliance/      # Compliance rules & evaluation
│   │       ├── health/          # Health check endpoint
│   │       ├── insights/        # Blog/content management
│   │       ├── library/         # Reference data (regions, grades)
│   │       ├── logistics/       # Shipping & fulfillment
│   │       ├── marketplace/     # Public product browsing
│   │       ├── messaging/       # In-app messaging
│   │       ├── order/           # Order management
│   │       ├── prisma/          # Database service
│   │       ├── quote/           # Quote management
│   │       ├── rfq/             # RFQ management
│   │       ├── search/          # Unified search
│   │       ├── seller/          # Seller portal
│   │       ├── taxonomy/        # Categories & tags
│   │       └── trends/          # Market trends data
│   └── web/                     # Next.js Web App
│       └── src/
│           ├── app/             # App router pages
│           │   ├── (public)/    # Public pages
│           │   ├── dashboard/   # Authenticated dashboard
│           │   └── login/       # Auth pages
│           ├── components/      # UI components
│           ├── lib/             # Utilities & API client
│           └── providers/       # React context providers
├── packages/
│   └── shared/                  # Shared Zod schemas & types
├── docker-compose.yml           # PostgreSQL & Redis
├── .env.example                 # Environment template
└── pnpm-workspace.yaml
```

## Available Scripts

```bash
# Development
pnpm dev              # Start all apps in parallel
pnpm dev:api          # Start API only (port 3001)
pnpm dev:web          # Start Web only (port 3000)

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with demo data
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:reset         # Reset and re-seed database

# Build & Production
pnpm build            # Build all apps for production
pnpm start            # Start production servers

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:cov         # Run tests with coverage

# Code Quality
pnpm lint             # Lint all apps
pnpm format           # Format code with Prettier
pnpm typecheck        # Run TypeScript type checking
```

## Environment Variables

### Root `.env`

| Variable           | Description              | Default          |
|--------------------|--------------------------|------------------|
| POSTGRES_USER      | PostgreSQL username      | matcha           |
| POSTGRES_PASSWORD  | PostgreSQL password      | matcha_secret    |
| POSTGRES_DB        | PostgreSQL database name | matcha_db        |
| POSTGRES_PORT      | PostgreSQL port          | 5432             |

### API `apps/api/.env`

| Variable              | Description                | Default/Required |
|-----------------------|----------------------------|------------------|
| DATABASE_URL          | PostgreSQL connection URL  | Required         |
| JWT_SECRET            | JWT signing secret         | Required         |
| JWT_EXPIRES_IN        | Access token expiry        | 1h               |
| JWT_REFRESH_SECRET    | Refresh token secret       | Required         |
| JWT_REFRESH_EXPIRES_IN| Refresh token expiry       | 7d               |
| PORT                  | API server port            | 3001             |
| CORS_ORIGIN           | Allowed CORS origins       | http://localhost:3000 |
| THROTTLE_TTL          | Rate limit window (ms)     | 60000            |
| THROTTLE_LIMIT        | Rate limit max requests    | 100              |

### Web `apps/web/.env.local`

| Variable             | Description        | Default                    |
|----------------------|--------------------|----------------------------|
| NEXT_PUBLIC_API_URL  | API base URL       | http://localhost:3001/api  |

## Deployment

### Docker Production Build

```bash
# Build production images
docker build -t matcha-api -f apps/api/Dockerfile .
docker build -t matcha-web -f apps/web/Dockerfile .

# Run with docker-compose
docker compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. **Build the applications**:
   ```bash
   pnpm build
   ```

2. **Run migrations in production**:
   ```bash
   cd apps/api && pnpm db:migrate:prod
   ```

3. **Start the servers**:
   ```bash
   # API
   cd apps/api && pnpm start:prod

   # Web (with PM2 or similar)
   cd apps/web && pnpm start
   ```

### Environment Checklist for Production

- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` values
- [ ] Configure proper `CORS_ORIGIN` for your domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure rate limiting appropriately
- [ ] Set up HTTPS with proper certificates
- [ ] Configure database connection pooling
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database

## Security Features

- **Authentication**: JWT-based with access and refresh tokens
- **Authorization**: Role-based access control (BUYER, SELLER, ADMIN)
- **Rate Limiting**: Configurable throttling to prevent abuse
- **Input Validation**: Zod schemas for all API inputs
- **XSS Prevention**: Content sanitization for user inputs
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for HTTP responses
- **Audit Logging**: Track all administrative actions

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- compliance.service.spec.ts

# Run with coverage
pnpm test:cov

# Watch mode for development
pnpm test:watch
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

