# Deployment Guide

<cite>
**Referenced Files in This Document**   
- [package.json](file://package.json)
- [vite.config.ts](file://vite.config.ts)
- [.env](file://.env)
- [deno.json](file://deno.json)
- [supabase/config.toml](file://supabase/config.toml)
- [src/integrations/supabase/client.ts](file://src/integrations/supabase/client.ts)
</cite>

## Table of Contents
1. [Development Setup Requirements](#development-setup-requirements)
2. [Build Process with Vite Configuration](#build-process-with-vite-configuration)
3. [Deployment Workflow for Frontend and Backend](#deployment-workflow-for-frontend-and-backend)
4. [Environment Configuration and Supabase Setup](#environment-configuration-and-supabase-setup)
5. [Package Scripts and Build Triggers](#package-scripts-and-build-triggers)
6. [Common Deployment Issues and Solutions](#common-deployment-issues-and-solutions)
7. [Performance Considerations for Production](#performance-considerations-for-production)

## Development Setup Requirements

The lovable-rise application requires a modern JavaScript runtime environment to support both frontend and backend components. The project is configured to work with Node.js as the primary runtime for development and build processes. Additionally, Deno is used for Supabase Edge Functions, enabling serverless execution of backend logic in TypeScript without the need for traditional Node.js packages.

Node.js version 18 or higher is required, as specified in the Vite package dependencies. This ensures compatibility with the latest ES modules and modern JavaScript features used throughout the codebase. The project also supports Bun as an alternative runtime, though the primary development and deployment workflows are optimized for Node.js.

For Deno-based functions, the project includes a `deno.json` configuration file that defines imports, tasks, and compiler options. The Deno environment is used exclusively for Supabase Edge Functions located in the `supabase/functions` directory, where each function operates as a standalone Deno server with JWT verification enabled for security.

**Section sources**
- [package.json](file://package.json#L0-L102)
- [deno.json](file://deno.json#L0-L10)
- [supabase/config.toml](file://supabase/config.toml#L0-L12)

## Build Process with Vite Configuration

The build process for the lovable-rise application is managed by Vite, a modern frontend build tool that provides fast development server startup and optimized production builds. The Vite configuration is defined in `vite.config.ts`, which sets up essential plugins and resolution aliases for the project.

The configuration includes the `@vitejs/plugin-react-swc` plugin to enable React support with SWC for faster transpilation. A custom plugin, `lovable-tagger`, is conditionally applied in development mode to assist with component tagging and debugging. The server is configured to listen on all network interfaces (`host: "::"`) and port 8080, allowing access from external devices during development.

A path alias is defined for the `@` symbol, resolving to the `src` directory. This enables cleaner import statements throughout the codebase, such as `import { supabase } from "@/integrations/supabase/client"`. The build output is optimized for modern browsers and includes code splitting, minification, and asset handling through Vite's default production settings.

**Section sources**
- [vite.config.ts](file://vite.config.ts#L0-L21)

## Deployment Workflow for Frontend and Backend

The deployment workflow for lovable-rise separates frontend and backend concerns while maintaining integration through Supabase. The frontend is built using Vite's production build command, which outputs static assets to a `dist` directory. These assets can be served through any static hosting provider or CDN.

The backend consists of Supabase Edge Functions written in Deno and deployed to the Supabase platform. Each function in the `supabase/functions` directory represents a serverless endpoint that handles specific API requests, such as user authentication, menu retrieval, and permission checks. These functions are written in TypeScript and use the `@supabase/supabase-js` client to interact with the database.

During development, the Deno functions can be served locally using the `supabase functions serve` command, which reads environment variables from the `.env` file. This allows full-stack development with live-reload capabilities for both frontend and backend components. In production, the functions are deployed alongside the database using the Supabase CLI or integrated CI/CD pipelines.

**Section sources**
- [supabase/config.toml](file://supabase/config.toml#L0-L12)
- [deno.json](file://deno.json#L0-L10)
- [package.json](file://package.json#L0-L102)

## Environment Configuration and Supabase Setup

Environment configuration for the lovable-rise application is managed through a `.env` file that contains Supabase-specific variables used during development and deployment. The file defines three critical environment variables: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_URL`.

These variables are consumed by the Vite build process and injected into the frontend application at compile time. The `VITE_` prefix ensures that these variables are exposed to the client-side code, allowing the Supabase client to establish a connection to the database. The publishable key provides anonymous access to public data, while row-level security (RLS) policies enforce data access restrictions at the database level.

The Supabase project is configured with JWT verification enabled for all Edge Functions, ensuring that only authenticated requests can access sensitive endpoints. The `config.toml` file specifies this security setting for functions such as `auth-me`, `users`, `menu`, and `permissions`. This configuration prevents unauthorized access to backend logic while maintaining a secure authentication flow.

**Section sources**
- [.env](file://.env#L0-L3)
- [supabase/config.toml](file://supabase/config.toml#L0-L12)
- [src/integrations/supabase/client.ts](file://src/integrations/supabase/client.ts#L0-L30)

## Package Scripts and Build Triggers

The deployment process is orchestrated through npm scripts defined in the `package.json` file. These scripts provide a consistent interface for development, testing, and production builds. The primary scripts include `dev` for starting the development server, `build` for creating a production build, and `preview` for locally testing the built application.

The `build` script executes `vite build`, which processes all source files through the Vite pipeline, applying optimizations such as tree-shaking, minification, and asset compression. A secondary script, `build:dev`, allows for development-mode builds by passing the `--mode development` flag to Vite. This is useful for debugging production-specific issues without minification.

Additional scripts support code quality and testing workflows, including `lint` for ESLint checks and `test` for running unit tests with Vitest. These scripts ensure code consistency and reliability before deployment. The `dev` script starts the Vite development server, while the Deno functions are served separately using the `supabase functions serve` command defined in the `deno.json` tasks.

**Section sources**
- [package.json](file://package.json#L0-L102)
- [deno.json](file://deno.json#L0-L10)

## Common Deployment Issues and Solutions

Several common deployment issues may arise when setting up the lovable-rise application, particularly related to environment variable management and runtime compatibility. One frequent issue is incorrect Supabase URL or publishable key configuration, which prevents the frontend from connecting to the database. This can be resolved by verifying the values in the `.env` file and ensuring they match the target Supabase project.

Another potential issue is mismatched Deno or Node.js versions, which can cause runtime errors in Edge Functions or during the build process. The project requires Node.js 18+ for Vite compatibility and Deno 1.30+ for Edge Functions. Developers should verify their runtime versions using `node --version` and `deno --version` before deployment.

Authentication-related issues may occur if JWT verification is misconfigured in the `supabase/config.toml` file. Ensuring that `verify_jwt = true` is set for all protected functions prevents unauthorized access while allowing legitimate requests to proceed. Additionally, developers should confirm that the Supabase client is properly initialized with the correct URL and publishable key.

**Section sources**
- [.env](file://.env#L0-L3)
- [supabase/config.toml](file://supabase/config.toml#L0-L12)
- [src/integrations/supabase/client.ts](file://src/integrations/supabase/client.ts#L0-L30)

## Performance Considerations for Production

Production deployment of the lovable-rise application requires attention to performance optimization and monitoring. The Vite build process automatically optimizes assets through code splitting, lazy loading, and minification, reducing initial load times and improving runtime performance.

For backend performance, the Supabase Edge Functions are designed to be lightweight and stateless, enabling horizontal scaling and low-latency responses. Developers should monitor query performance using Supabase's built-in analytics and optimize database queries to minimize execution time. The `rls-monitor.ts` service provides health checks and performance metrics for row-level security policies, helping identify slow or failing queries.

Caching strategies should be implemented for frequently accessed data, such as user profiles and menu structures. The application can leverage browser caching for static assets and Supabase's real-time subscriptions for efficient data synchronization. Monitoring tools should be integrated to track error rates, response times, and user engagement, enabling proactive optimization and issue resolution.

**Section sources**
- [vite.config.ts](file://vite.config.ts#L0-L21)
- [src/lib/rls-monitor.ts](file://src/lib/rls-monitor.ts#L351-L441)
- [package.json](file://package.json#L0-L102)