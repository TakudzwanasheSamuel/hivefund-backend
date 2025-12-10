# HiveFund API

The backend service for the HiveFund financial inclusion platform. It handles the core logic for digitizing savings circles (Mukando), calculating credit scores based on transactional behavior, managing the temporal liquidity pool for micro-loans, and processing payments via EcoCash.

## System Overview

The HiveFund API is a robust backend service designed to empower financial inclusion. It digitizes traditional savings circles, enabling seamless management of contributions, rotations, and payouts. A sophisticated credit scoring engine assesses user creditworthiness based on their transactional history and participation within circles. Furthermore, it manages a temporal liquidity pool, facilitating micro-loans and ensuring efficient fund allocation.

## Architecture

The HiveFund API is built as a NestJS modular monolith, designed to be microservices-ready for future scaling. Key feature modules include:

*   **Auth Module:** Manages user authentication and authorization, utilizing a JWT strategy to validate tokens issued by Supabase.
*   **Circles Module:** Implements the core logic for savings circles, including cycle management, member rotation, and payout processing.
*   **Payments Module:** Handles all payment-related operations, integrating with the EcoCash API for recurring contributions and disbursements.
*   **Credit Module:** Houses the credit scoring engine, which calculates user credit scores based on payment consistency, participation, and other behavioral metrics.
*   **Loans Module:** Manages the liquidity pool calculations and the entire lifecycle of micro-loans.
*   **Marketplace Module:** Facilitates gig booking and manages escrow logic for services offered within the platform.

## Technical Stack

*   **Framework:** NestJS (Node.js)
*   **Language:** TypeScript
*   **Database:** PostgreSQL 16 (Managed via Supabase or Local Docker)
*   **ORM:** TypeORM
*   **Authentication:** Supabase Auth (JWT Validation Strategy)
*   **Caching/Queues:** Redis & Bull
*   **Integrations:** EcoCash API (Payments), Supabase (Auth/DB)

## Prerequisites

Ensure you have the following installed on your development machine:

*   Docker Desktop (for local PostgreSQL and Redis setup)
*   Node.js (v18 or higher)
*   npm (Node Package Manager)

## Environment Configuration

Create a `.env` file in the project root based on the template below and populate it with your specific configuration values.

```
DATABASE_URL="postgresql://user:password@host:port/database"
SUPABASE_URL="https://your-supabase-url.supabase.co"
SUPABASE_KEY="your-supabase-anon-key"
ECOCASH_MERCHANT_ID="your-ecocash-merchant-id"
REDIS_HOST="localhost"
```

## Installation

To set up the project locally, navigate to the project root and run:

```bash
npm install
```

## Running the Application

*   **Local Development:**
    To run the application in development mode with hot-reloading:

    ```bash
    npm run start:dev
    ```

*   **Production Mode:**
    To run the application in production mode:

    ```bash
    npm run start:prod
    ```

## Database & Migrations

For development, TypeORM is configured with `synchronize: true`, which automatically syncs your entity changes with the database schema. For production environments, a proper migration strategy should be implemented.

## API Documentation

Once the server is running, the API documentation, powered by Swagger UI, is available at:

```
http://localhost:3000/api
```

(Assuming your application runs on port 3000)

## Testing

To run the unit and end-to-end tests:

```bash
# Run all tests
npm run test

# Run unit tests
npm run test:unit

# Run e2e tests
npm run test:e2e
```