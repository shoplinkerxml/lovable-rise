# Contribution Guidelines

<cite>
**Referenced Files in This Document**   
- [eslint.config.js](file://eslint.config.js)
- [package.json](file://package.json)
- [src/components/data-table.tsx](file://src/components/data-table.tsx)
- [src/pages/admin/AdminTariffNew.tsx](file://src/pages/admin/AdminTariffNew.tsx)
- [src/pages/admin/AdminTariffEdit.tsx](file://src/pages/admin/AdminTariffEdit.tsx)
- [src/pages/admin/AdminTariffFeatures.tsx](file://src/pages/admin/AdminTariffFeatures.tsx)
- [src/pages/TariffPage.tsx](file://src/pages/TariffPage.tsx)
- [src/app/dashboard/data.json](file://src/app/dashboard/data.json)
- [vite.config.ts](file://vite.config.ts)
- [vitest.config.ts](file://vitest.config.ts)
- [tsconfig.json](file://tsconfig.json)
- [supabase/functions/tsconfig.json](file://supabase/functions/tsconfig.json)
</cite>

## Table of Contents
1. [Code Style and ESLint Configuration](#code-style-and-eslint-configuration)
2. [Pull Request Process](#pull-request-process)
3. [Issue Tracking System](#issue-tracking-system)
4. [Development Environment Setup](#development-environment-setup)
5. [Performance Considerations](#performance-considerations)
6. [Code Formatting and Documentation Examples](#code-formatting-and-documentation-examples)

## Code Style and ESLint Configuration

The lovable-rise application enforces consistent code style through ESLint configuration defined in `eslint.config.js`. The configuration extends recommended rules from JavaScript, TypeScript, React Hooks, and React Refresh plugins. It targets all `.ts` and `.tsx` files across the codebase and follows modern ECMAScript standards (ES2020). The setup includes browser globals and integrates React-specific linting rules to ensure best practices in component development.

Notably, the `@typescript-eslint/no-unused-vars` rule is disabled, likely due to framework patterns or dynamic typing scenarios where variables may be intentionally unused. The React Refresh plugin enforces export of only components with a warning-level rule, supporting fast refresh during development. This configuration ensures code quality while allowing flexibility for common React patterns.

**Section sources**
- [eslint.config.js](file://eslint.config.js#L1-L30)

## Pull Request Process

Contributors should follow a structured pull request workflow to maintain code quality and consistency. Branch names should follow the convention `feature/descriptive-name`, `fix/issue-description`, or `docs/update-topic` to clearly indicate the purpose. For example, a new tariff feature addition would use `feature/tariff-management-ui`.

Commit messages must be clear and descriptive using the format: `type(scope): description` where type is one of `feat`, `fix`, `docs`, `style`, `refactor`, `test`, or `chore`. The scope should reference the affected component or page (e.g., `feat(tariff): add feature management interface`).

All pull requests require at least one approval from a core team member before merging. The CI pipeline automatically runs linting, testing, and type checking via the scripts defined in `package.json`. Contributors must ensure their changes pass all checks, particularly the `lint` and `test` scripts which validate code style and functionality.

**Section sources**
- [package.json](file://package.json#L6-L15)

## Issue Tracking System

The project uses an internal JSON-based issue tracking system visible in `src/app/dashboard/data.json`, which contains structured data for various tasks, features, and documentation items. Each entry includes an ID, header, type, status, target, limit, and reviewer assignment. This system appears to track documentation and development tasks with statuses like "In Process" and "Done".

Issues are categorized by type including "Technical content", "Narrative", "Planning", "Research", "Legal", and "Financial". The tracking system supports assignment of reviewers and has defined workflows for task completion. New issues should follow this structure when added to the system, maintaining consistency in format and metadata.

For bug reporting, contributors should create entries with type "Bug" and status "In Process", including detailed reproduction steps. Feature requests should use type "Feature Request" with a clear description of the proposed functionality and its benefits.

**Section sources**
- [src/app/dashboard/data.json](file://src/app/dashboard/data.json#L0-L74)

## Development Environment Setup

To set up the development environment, ensure Node.js version 18 or higher is installed, as specified in the project's dependencies. After cloning the repository, install dependencies using `bun install` (given the presence of `bun.lockb`) or `npm install`. The application uses Vite as the build tool with configuration in `vite.config.ts` that sets up React with SWC and component tagging in development mode.

The development server runs on port 8080 as configured in `vite.config.ts`. Environment variables should be configured in the `.env` file at the root directory. The project uses TypeScript with path aliases configured in `tsconfig.json` where `@/*` maps to `./src/*`, enabling clean import statements throughout the codebase.

For testing, Vitest is configured in `vitest.config.ts` with jsdom environment and setup files. Run tests with `npm run test` or `npm run test:watch` for continuous testing during development. The setup includes React testing utilities and proper module resolution.

**Section sources**
- [vite.config.ts](file://vite.config.ts#L0-L21)
- [vitest.config.ts](file://vitest.config.ts#L0-L20)
- [tsconfig.json](file://tsconfig.json#L0-L18)
- [.env](file://.env)

## Performance Considerations

Contributed code must consider both bundle size and runtime performance. The application uses several performance-sensitive libraries including React Flow, Recharts, and React Window for virtualized rendering. When adding new dependencies, evaluate their bundle impact using tools like `bundlephobia` and prefer tree-shakable imports.

The codebase already implements virtualization in components like `data-table.tsx` which handles large datasets efficiently. New list or table implementations should follow this pattern using virtualized rendering to maintain performance. Avoid unnecessary re-renders by implementing proper React memoization and leveraging React Query for efficient data fetching and caching.

For UI components, minimize the use of heavy libraries and prefer lightweight alternatives. The application uses Tailwind CSS for styling, so new components should leverage existing utility classes rather than adding custom CSS. Monitor the impact of new features on initial load time and runtime performance, particularly in data-intensive areas like the admin dashboard and tariff management interfaces.

**Section sources**
- [src/components/data-table.tsx](file://src/components/data-table.tsx#L54-L135)
- [package.json](file://package.json#L30-L102)

## Code Formatting and Documentation Examples

The codebase demonstrates consistent formatting patterns visible in tariff management components. In `AdminTariffNew.tsx` and `AdminTariffEdit.tsx`, form components follow a structured layout with proper labeling, input handling, and accessibility features like tooltips and ARIA labels. The use of ShadCN UI components ensures visual consistency and accessibility compliance.

Form controls consistently use the `Label` component paired with inputs, and boolean values are managed with `Switch` components. Icon buttons use descriptive tooltips, as seen with the Plus and Trash2 icons for add and delete operations. The code uses proper state management with `useState` and event handlers that update state immutably using spread operators.

Internationalization is implemented through the `t()` function for text content, allowing for multilingual support. Component organization follows a clear structure with logical grouping of related functionality. The `getFeatureIcon` function in `TariffPage.tsx` demonstrates a clean pattern for mapping feature names to appropriate icons based on keywords.

Documentation practices are evident in the structured data model used in the dashboard, where each item has clearly defined properties with consistent naming conventions. Type safety is enforced through Zod schemas, as seen in the `schema` definition in `data-table.tsx`, which validates the structure of data objects.

**Section sources**
- [src/pages/admin/AdminTariffNew.tsx](file://src/pages/admin/AdminTariffNew.tsx#L534-L604)
- [src/pages/admin/AdminTariffEdit.tsx](file://src/pages/admin/AdminTariffEdit.tsx#L892-L959)
- [src/pages/admin/AdminTariffFeatures.tsx](file://src/pages/admin/AdminTariffFeatures.tsx#L338-L423)
- [src/pages/TariffPage.tsx](file://src/pages/TariffPage.tsx#L165-L186)
- [src/components/data-table.tsx](file://src/components/data-table.tsx#L54-L135)