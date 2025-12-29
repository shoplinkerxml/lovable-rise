# Supabase Edge Functions

<cite>
**Referenced Files in This Document**   
- [auth-me/index.ts](file://supabase/functions/auth-me/index.ts)
- [menu/index.ts](file://supabase/functions/menu/index.ts)
- [menu-content/index.ts](file://supabase/functions/menu-content/index.ts)
- [permissions/index.ts](file://supabase/functions/permissions/index.ts)
- [templates/index.ts](file://supabase/functions/templates/index.ts)
- [users/index.ts](file://supabase/functions/users/index.ts)
- [deno.json](file://supabase/functions/deno.json)
- [config.toml](file://supabase/config.toml)
- [_shared/database-types.ts](file://supabase/functions/_shared/database-types.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive architectural documentation for the Supabase Edge Functions in the lovable-rise application. The Edge Functions are serverless Deno-based functions that handle secure backend operations including authentication, role-based access control, dynamic UI rendering, and user management. These functions serve as the primary API layer between the frontend application and the Supabase database, implementing RESTful design patterns with Bearer token authentication and CORS configuration. The documentation details each function's purpose, API design patterns, environment integration, and deployment considerations.

## Project Structure

```mermaid
graph TD
subgraph "Edge Functions"
auth_me[auth-me]
menu[menu]
menu_content[menu-content]
permissions[permissions]
templates[templates]
users[users]
end
subgraph "Shared Resources"
shared[_shared]
deno[deno.json]
config[config.toml]
end
auth_me --> shared
menu --> shared
menu_content --> shared
permissions --> shared
users --> shared
shared --> database_types[database-types.ts]
deno --> supabase_js["@supabase/supabase-js"]
config --> jwt[JWT Verification]
```

**Diagram sources**
- [supabase/functions](file://supabase/functions)
- [supabase/functions/_shared/database-types.ts](file://supabase/functions/_shared/database-types.ts)
- [supabase/functions/deno.json](file://supabase/functions/deno.json)
- [supabase/config.toml](file://supabase/config.toml)

**Section sources**
- [supabase/functions](file://supabase/functions)
- [supabase/config.toml](file://supabase/config.toml)

## Core Components

The Supabase Edge Functions in the lovable-rise application consist of six primary functions, each serving a distinct purpose in the application architecture. These functions operate in a serverless Deno runtime environment provided by Supabase, enabling fast execution and automatic scaling. The functions are designed to handle specific domains of functionality including authentication validation, menu management, permissions, template operations, and user data management. All functions follow consistent patterns for error handling, CORS configuration, and database interaction through the Supabase client.

**Section sources**
- [supabase/functions/auth-me/index.ts](file://supabase/functions/auth-me/index.ts)
- [supabase/functions/menu/index.ts](file://supabase/functions/menu/index.ts)
- [supabase/functions/menu-content/index.ts](file://supabase/functions/menu-content/index.ts)
- [supabase/functions/permissions/index.ts](file://supabase/functions/permissions/index.ts)
- [supabase/functions/templates/index.ts](file://supabase/functions/templates/index.ts)
- [supabase/functions/users/index.ts](file://supabase/functions/users/index.ts)

## Architecture Overview

```mermaid
graph LR
Frontend[Frontend Application] --> |API Requests| EdgeFunctions[Supabase Edge Functions]
EdgeFunctions --> |Database Operations| SupabaseDB[Supabase Database]
EdgeFunctions --> |Authentication| SupabaseAuth[Supabase Auth]
subgraph "Edge Functions"
AuthMe[auth-me]
Menu[menu]
MenuContent[menu-content]
Permissions[permissions]
Templates[templates]
Users[users]
end
AuthMe --> SupabaseAuth
Menu --> SupabaseDB
MenuContent --> SupabaseDB
Permissions --> SupabaseDB
Templates --> SupabaseDB
Users --> SupabaseDB
Users --> SupabaseAuth
style AuthMe fill:#4CAF50,stroke:#388E3C
style Menu fill:#2196F3,stroke:#1976D2
style MenuContent fill:#2196F3,stroke:#1976D2
style Permissions fill:#FF9800,stroke:#F57C00
style Templates fill:#9C27B0,stroke:#7B1FA2
style Users fill:#F44336,stroke:#D32F2F
```

**Diagram sources**
- [supabase/functions/auth-me/index.ts](file://supabase/functions/auth-me/index.ts)
- [supabase/functions/menu/index.ts](file://supabase/functions/menu/index.ts)
- [supabase/functions/menu-content/index.ts](file://supabase/functions/menu-content/index.ts)
- [supabase/functions/permissions/index.ts](file://supabase/functions/permissions/index.ts)
- [supabase/functions/templates/index.ts](file://supabase/functions/templates/index.ts)
- [supabase/functions/users/index.ts](file://supabase/functions/users/index.ts)

## Detailed Component Analysis

### auth-me Function Analysis
The auth-me function handles session validation and returns user profile information. It accepts requests with Bearer token authentication or API key and validates the user's session through Supabase Auth. Upon successful authentication, it retrieves the user's profile from the database and returns a combined response with both authentication and profile data.

```mermaid
sequenceDiagram
participant Frontend
participant AuthMe
participant SupabaseAuth
participant Database
Frontend->>AuthMe : GET /auth-me (Authorization : Bearer token)
AuthMe->>SupabaseAuth : getUser() with token
SupabaseAuth-->>AuthMe : User data or error
alt User authenticated
AuthMe->>Database : SELECT from profiles WHERE id = user.id
Database-->>AuthMe : Profile data
AuthMe-->>Frontend : 200 OK {user, profile}
else Authentication failed
AuthMe-->>Frontend : 401 Unauthorized
end
```

**Diagram sources**
- [supabase/functions/auth-me/index.ts](file://supabase/functions/auth-me/index.ts#L1-L130)

**Section sources**
- [supabase/functions/auth-me/index.ts](file://supabase/functions/auth-me/index.ts#L1-L130)

### menu Function Analysis
The menu function manages hierarchical menu structures for dynamic UI rendering. It supports retrieving menu items with role-based filtering, creating new menu items, updating existing items, and deactivating items. Non-admin users receive only menu items they have permission to view, while admins have full CRUD capabilities.

```mermaid
flowchart TD
Start([Request]) --> AuthCheck{Authentication}
AuthCheck --> |Valid| RoleCheck{Admin?}
RoleCheck --> |Yes| CRUDOperations[CRUD Operations]
RoleCheck --> |No| PermissionFilter[Filter by user_permissions]
PermissionFilter --> StructureMenu[Structure Hierarchical Menu]
CRUDOperations --> DatabaseOps[Database Operations]
DatabaseOps --> Response[Return JSON]
StructureMenu --> Response
AuthCheck --> |Invalid| Unauthorized[401 Unauthorized]
```

**Diagram sources**
- [supabase/functions/menu/index.ts](file://supabase/functions/menu/index.ts#L1-L303)

**Section sources**
- [supabase/functions/menu/index.ts](file://supabase/functions/menu/index.ts#L1-L303)

### menu-content Function Analysis
The menu-content function handles detailed menu item content and page templates. It provides endpoints for retrieving menu items by path, managing content data, and accessing available page templates. This function enables dynamic UI rendering by providing the frontend with complete information about page structure and available templates.

```mermaid
graph TD
A[Request] --> B{Endpoint}
B --> |by-path| C[Get menu item by path]
B --> |item/:id| D[Get specific menu item]
B --> |item| E[Create menu item]
B --> |item/:id| F[Update menu item]
B --> |templates| G[Get available templates]
C --> H[Check permissions]
D --> I[Return menu item]
E --> J[Admin check]
F --> J
G --> K[Return template list]
H --> |Allowed| I
H --> |Denied| L[403 Forbidden]
J --> |Admin| M[Process request]
J --> |Not Admin| L
```

**Diagram sources**
- [supabase/functions/menu-content/index.ts](file://supabase/functions/menu-content/index.ts#L1-L355)

**Section sources**
- [supabase/functions/menu-content/index.ts](file://supabase/functions/menu-content/index.ts#L1-L355)

### permissions Function Analysis
The permissions function implements role-based access control by managing user permissions for menu items. Only administrators can access this function, which provides CRUD operations for user_permissions records. This function ensures that users can only access menu items they have been explicitly granted permission to view.

```mermaid
classDiagram
class PermissionsFunction {
+checkAdminPermission()
+GET /permissions/ : userId
+POST /permissions/ : userId
+PATCH /permissions/ : userId/ : menuItemId
+DELETE /permissions/ : userId/ : menuItemId
}
class Database {
+profiles table
+menu_items table
+user_permissions table
}
PermissionsFunction --> Database : queries
PermissionsFunction --> SupabaseAuth : authentication
```

**Diagram sources**
- [supabase/functions/permissions/index.ts](file://supabase/functions/permissions/index.ts#L1-L264)

**Section sources**
- [supabase/functions/permissions/index.ts](file://supabase/functions/permissions/index.ts#L1-L264)

### templates Function Analysis
The templates function manages XML template operations, specifically providing functionality to delete templates. This function requires admin authentication and uses the service role key to perform soft deletes on store_templates records, setting the is_active flag to false rather than permanently removing records.

```mermaid
sequenceDiagram
participant Frontend
participant Templates
participant SupabaseAuth
participant Database
Frontend->>Templates : DELETE /templates/ : id (Bearer token)
Templates->>SupabaseAuth : getUser() with token
SupabaseAuth-->>Templates : User data
Templates->>Database : SELECT role from profiles
Database-->>Templates : Role data
alt User is admin
Templates->>Database : UPDATE store_templates SET is_active=false
Database-->>Templates : Success
Templates-->>Frontend : 200 OK {success : true}
else User is not admin
Templates-->>Frontend : 403 Forbidden
end
```

**Diagram sources**
- [supabase/functions/templates/index.ts](file://supabase/functions/templates/index.ts#L1-L127)

**Section sources**
- [supabase/functions/templates/index.ts](file://supabase/functions/templates/index.ts#L1-L127)

### users Function Analysis
The users function provides comprehensive user management capabilities. It supports listing users with pagination, retrieving individual user profiles, creating new users, updating user information, and deleting users. Admin authentication is required for all operations except retrieving the current user's profile.

```mermaid
flowchart LR
A[Request] --> B{Method}
B --> |GET /users| C[Get users with pagination]
B --> |GET /users/:id| D[Get user profile]
B --> |POST| E[Create user]
B --> |PATCH| F[Update user]
B --> |DELETE| G[Delete user]
C --> H[Apply filters and pagination]
E --> I[Admin check]
F --> I
G --> I
I --> |Admin| J[Process operation]
I --> |Not Admin| K[403 Forbidden]
H --> L[Query database]
J --> L
L --> M[Return response]
```

**Diagram sources**
- [supabase/functions/users/index.ts](file://supabase/functions/users/index.ts#L1-L490)

**Section sources**
- [supabase/functions/users/index.ts](file://supabase/functions/users/index.ts#L1-L490)

## Dependency Analysis

```mermaid
graph TD
auth_me --> supabase_js["@supabase/supabase-js"]
menu --> supabase_js
menu_content --> supabase_js
permissions --> supabase_js
templates --> supabase_js
users --> supabase_js
auth_me --> database_types
menu --> database_types
menu_content --> database_types
permissions --> database_types
templates --> database_types
users --> database_types
all_functions --> deno_json
auth_me --> config_toml
menu --> config_toml
permissions --> config_toml
users --> config_toml
style supabase_js fill:#FFEB3B,stroke:#FDD835
style database_types fill:#4CAF50,stroke:#388E3C
style deno_json fill:#2196F3,stroke:#1976D2
style config_toml fill:#9C27B0,stroke:#7B1FA2
```

**Diagram sources**
- [supabase/functions/deno.json](file://supabase/functions/deno.json)
- [supabase/config.toml](file://supabase/config.toml)
- [supabase/functions/_shared/database-types.ts](file://supabase/functions/_shared/database-types.ts)

**Section sources**
- [supabase/functions/deno.json](file://supabase/functions/deno.json)
- [supabase/config.toml](file://supabase/config.toml)
- [supabase/functions/_shared/database-types.ts](file://supabase/functions/_shared/database-types.ts)

## Performance Considerations
The Edge Functions are designed with performance in mind, leveraging Deno's V8 engine for fast startup times and efficient execution. The functions implement several optimization patterns including batch database operations, efficient query structuring, and proper indexing. The users function, for example, optimizes subscription retrieval by using a single query with the IN operator rather than multiple individual queries. All functions include comprehensive error handling and logging to facilitate monitoring and troubleshooting. Cold start implications are minimized by Supabase's edge runtime, which maintains function instances for rapid subsequent invocations. Monitoring strategies should include tracking function execution times, error rates, and database query performance.

## Troubleshooting Guide
When troubleshooting Edge Function issues, consider the following common scenarios:
- Authentication failures: Verify the Authorization header format (Bearer token) and token validity
- Permission errors: Confirm user roles and ensure admin operations are performed by users with the 'admin' role
- CORS issues: Ensure the frontend includes proper headers and the functions return correct CORS headers
- Database query errors: Check parameter validation and ensure proper filtering conditions
- Environment variable issues: Verify SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are correctly configured
- Payload size limits: Be aware of Deno's memory and execution time limits for large requests

**Section sources**
- [supabase/functions/auth-me/index.ts](file://supabase/functions/auth-me/index.ts)
- [supabase/functions/users/index.ts](file://supabase/functions/users/index.ts)
- [supabase/config.toml](file://supabase/config.toml)

## Conclusion
The Supabase Edge Functions in the lovable-rise application provide a robust, secure, and scalable backend architecture. By leveraging Deno's serverless runtime and Supabase's integrated services, these functions efficiently handle authentication, authorization, user management, and dynamic content delivery. The consistent API design patterns, comprehensive error handling, and role-based access control create a maintainable and secure foundation for the application. The functions are well-structured with clear separation of concerns, making them easy to extend and maintain as the application evolves.