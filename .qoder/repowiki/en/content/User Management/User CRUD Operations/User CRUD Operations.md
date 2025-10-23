# User CRUD Operations

<cite>
**Referenced Files in This Document**   
- [user-service.ts](file://src/lib/user-service.ts)
- [CreateUserDialog.tsx](file://src/components/admin/CreateUserDialog.tsx)
- [EditUserDialog.tsx](file://src/components/admin/EditUserDialog.tsx)
- [useUsers.ts](file://src/hooks/useUsers.ts)
- [index.ts](file://supabase/functions/users/index.ts)
- [client.ts](file://src/integrations/supabase/client.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core CRUD Operations](#core-crud-operations)
3. [UI Components](#ui-components)
4. [Data Flow and Integration](#data-flow-and-integration)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

## Introduction

The lovable-rise application implements a comprehensive user management system with full CRUD (Create, Read, Update, Delete) operations. This documentation details the implementation of user management functionality, focusing on the UserService class methods and their integration with UI components and backend services. The system follows a layered architecture with React components, React Query hooks for state management, a service layer for business logic, and Supabase Edge Functions for backend operations.

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts#L81-L311)

## Core CRUD Operations

The UserService class provides static methods for all user management operations, implementing a clean and consistent API for user data manipulation. Each method handles authentication, error management, and communication with the backend service.

### Create Operation

The `createUser` method creates a new user account with validation and proper error handling. It requires essential user information including email, password, and name.

**Parameters:**
- `userData`: Object containing user information (email, password, name, phone, role, notify_by_email)

**Return Value:**
- `UserProfile`: Object containing the created user's information

**Error Conditions:**
- Missing required fields (400)
- Invalid session (401)
- Backend service errors (500)

```mermaid
sequenceDiagram
participant UI as CreateUserDialog
participant Hook as useCreateUser
participant Service as UserService
participant Edge as Supabase Edge Function
UI->>Hook : mutateAsync(userData)
Hook->>Service : createUser(userData)
Service->>Service : Validate session
Service->>Service : Get auth headers
Service->>Edge : POST /users
Edge-->>Service : 201 Created
Service-->>Hook : UserProfile
Hook-->>UI : Success
```

**Diagram sources**
- [user-service.ts](file://src/lib/user-service.ts#L125-L168)
- [index.ts](file://supabase/functions/users/index.ts#L250-L310)

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts#L125-L168)

### Read Operations

The UserService provides two methods for reading user data: `getUsers` for retrieving multiple users with filtering and pagination, and `getUser` for retrieving a single user by ID.

**Parameters for getUsers:**
- `filters`: Object for filtering users by search, status, role, etc.
- `pagination`: Object specifying page number and limit

**Return Value:**
- `UsersResponse`: Object containing users array, total count, current page, and limit

```mermaid
sequenceDiagram
participant UI as UsersTable
participant Hook as useUsers
participant Service as UserService
participant Edge as Supabase Edge Function
UI->>Hook : Query with filters
Hook->>Service : getUsers(filters, pagination)
Service->>Service : Validate session
Service->>Service : Build query parameters
Service->>Edge : GET /users?params
Edge-->>Service : 200 OK with users
Service-->>Hook : UsersResponse
Hook-->>UI : Display users
```

**Diagram sources**
- [user-service.ts](file://src/lib/user-service.ts#L81-L123)
- [index.ts](file://supabase/functions/users/index.ts#L100-L140)

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts#L81-L123)

### Update Operation

The `updateUser` method modifies existing user information with partial updates. It accepts only the fields that need to be changed.

**Parameters:**
- `id`: User ID to update
- `data`: Object containing fields to update (name, phone, status)

**Return Value:**
- `UserProfile`: Object containing the updated user's information

**Error Conditions:**
- Missing user ID (400)
- No fields provided for update (400)
- Invalid session (401)
- Backend service errors (500)

```mermaid
sequenceDiagram
participant UI as EditUserDialog
participant Hook as useUpdateUser
participant Service as UserService
participant Edge as Supabase Edge Function
UI->>Hook : mutateAsync({id, data})
Hook->>Service : updateUser(id, data)
Service->>Service : Validate session
Service->>Service : Clean data (remove undefined)
Service->>Service : Get auth headers
Service->>Edge : PATCH /users/{id}
Edge-->>Service : 200 OK
Service-->>Hook : Updated UserProfile
Hook-->>UI : Success
```

**Diagram sources**
- [user-service.ts](file://src/lib/user-service.ts#L170-L215)
- [index.ts](file://supabase/functions/users/index.ts#L312-L380)

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts#L170-L215)

### Delete Operation

The `deleteUser` method removes a user account from both the authentication system and profile database.

**Parameters:**
- `id`: User ID to delete

**Return Value:**
- Object indicating success status and which components were deleted (auth, profile)

**Error Conditions:**
- Missing user ID (400)
- Invalid session (401)
- Backend service errors (500)

```mermaid
sequenceDiagram
participant UI as DeleteUserDialog
participant Hook as useDeleteUser
participant Service as UserService
participant Edge as Supabase Edge Function
UI->>Hook : mutateAsync(id)
Hook->>Service : deleteUser(id)
Service->>Service : Validate session
Service->>Service : Get auth headers
Service->>Edge : DELETE /users/{id}
Edge-->>Service : 200 OK
Service-->>Hook : Deletion result
Hook-->>UI : Success
```

**Diagram sources**
- [user-service.ts](file://src/lib/user-service.ts#L265-L311)
- [index.ts](file://supabase/functions/users/index.ts#L382-L450)

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts#L265-L311)

## UI Components

The user management interface is implemented through dialog components that provide a clean and intuitive user experience with proper form validation and state management.

### CreateUserDialog

The CreateUserDialog component provides a form for creating new user accounts with comprehensive validation.

**Key Features:**
- Form validation using Zod schema
- Password visibility toggle
- Loading state during submission
- Success callback on completion

```mermaid
flowchart TD
Start([Dialog Open]) --> ValidateForm["Validate Form Input"]
ValidateForm --> FieldsValid{"All Fields Valid?"}
FieldsValid --> |No| ShowErrors["Show Validation Errors"]
FieldsValid --> |Yes| Submit["Submit to useCreateUser"]
Submit --> Processing["Processing Request"]
Processing --> Success["Show Success Toast"]
Processing --> Error["Show Error Toast"]
Success --> ResetForm["Reset Form"]
ResetForm --> CloseDialog["Close Dialog"]
Error --> CloseDialog
CloseDialog --> End([Dialog Closed])
```

**Diagram sources**
- [CreateUserDialog.tsx](file://src/components/admin/CreateUserDialog.tsx#L46-L257)
- [useUsers.ts](file://src/hooks/useUsers.ts#L80-L99)

**Section sources**
- [CreateUserDialog.tsx](file://src/components/admin/CreateUserDialog.tsx#L46-L257)

### EditUserDialog

The EditUserDialog component allows administrators to modify existing user information.

**Key Features:**
- Pre-populated form with existing user data
- Email field is readonly
- Form reset on dialog close
- Loading state during submission

```mermaid
flowchart TD
Open([Dialog Open]) --> LoadData["Load User Data"]
LoadData --> PopulateForm["Populate Form Fields"]
PopulateForm --> ValidateForm["Validate Form Input"]
ValidateForm --> FieldsValid{"All Fields Valid?"}
FieldsValid --> |No| ShowErrors["Show Validation Errors"]
FieldsValid --> |Yes| Submit["Submit to useUpdateUser"]
Submit --> Processing["Processing Request"]
Processing --> Success["Show Success Toast"]
Processing --> Error["Show Error Toast"]
Success --> ResetForm["Reset Form"]
ResetForm --> CloseDialog["Close Dialog"]
Error --> CloseDialog
CloseDialog --> End([Dialog Closed])
```

**Diagram sources**
- [EditUserDialog.tsx](file://src/components/admin/EditUserDialog.tsx#L54-L202)
- [useUsers.ts](file://src/hooks/useUsers.ts#L101-L122)

**Section sources**
- [EditUserDialog.tsx](file://src/components/admin/EditUserDialog.tsx#L54-L202)

## Data Flow and Integration

The user CRUD operations follow a consistent data flow pattern from UI components through service layers to the backend and back.

### Architecture Overview

```mermaid
graph TD
subgraph "Frontend"
A[CreateUserDialog] --> B[useCreateUser]
C[EditUserDialog] --> D[useUpdateUser]
B --> E[UserService]
D --> E
E --> F[Supabase Client]
end
subgraph "Backend"
F --> G[Supabase Edge Function]
G --> H[Supabase Auth]
G --> I[Profiles Table]
end
style A fill:#f9f,stroke:#333
style C fill:#f9f,stroke:#333
style G fill:#bbf,stroke:#333
```

**Diagram sources**
- [user-service.ts](file://src/lib/user-service.ts)
- [index.ts](file://supabase/functions/users/index.ts)
- [client.ts](file://src/integrations/supabase/client.ts)

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts)
- [index.ts](file://supabase/functions/users/index.ts)

### Authentication Flow

The system implements a secure authentication flow for all CRUD operations:

1. Session validation before each operation
2. Bearer token authentication headers
3. Admin permission checks for write operations
4. Error handling for invalid or expired sessions

```mermaid
sequenceDiagram
participant Client as "Frontend"
participant Service as "UserService"
participant Edge as "Edge Function"
Client->>Service : Call CRUD method
Service->>Service : Validate session
alt Session invalid
Service-->>Client : 401 Unauthorized
else Session valid
Service->>Service : Get auth headers
Service->>Edge : Send request with Bearer token
Edge->>Edge : Verify admin permissions
alt Not admin
Edge-->>Service : 403 Forbidden
else Is admin
Edge-->>Service : Process request
Service-->>Client : Return result
end
end
```

**Diagram sources**
- [user-service.ts](file://src/lib/user-service.ts#L85-L88)
- [index.ts](file://supabase/functions/users/index.ts#L40-L80)

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts#L81-L311)
- [index.ts](file://supabase/functions/users/index.ts#L40-L489)

## Error Handling

The system implements comprehensive error handling at multiple levels to provide a robust user experience.

### Client-Side Error Handling

Each CRUD operation includes validation and error handling:

- Input validation before API calls
- Session validation before operations
- Proper error messages for different failure scenarios
- User-friendly toast notifications

```mermaid
flowchart TD
Operation([CRUD Operation]) --> ValidateInput["Validate Input"]
ValidateInput --> InputValid{"Input Valid?"}
InputValid --> |No| HandleInputError["Return 400 Error"]
InputValid --> |Yes| ValidateSession["Validate Session"]
ValidateSession --> SessionValid{"Session Valid?"}
SessionValid --> |No| HandleAuthError["Return 401 Error"]
SessionValid --> |Yes| CallAPI["Call Edge Function"]
CallAPI --> APIResponse{"API Response OK?"}
APIResponse --> |No| HandleAPIError["Parse and Return Error"]
APIResponse --> |Yes| ReturnSuccess["Return Success Result"]
```

**Diagram sources**
- [user-service.ts](file://src/lib/user-service.ts)
- [useUsers.ts](file://src/hooks/useUsers.ts)

**Section sources**
- [user-service.ts](file://src/lib/user-service.ts)
- [useUsers.ts](file://src/hooks/useUsers.ts)

### Common Issues and Solutions

**Validation Failures:**
- Ensure all required fields are provided
- Check password length requirements (minimum 8 characters)
- Verify email format is valid

**Network Errors:**
- Check internet connection
- Verify Supabase service availability
- Implement retry logic for transient failures

**Authentication Issues:**
- Ensure user has valid session
- Verify admin role for write operations
- Check token expiration and refresh if necessary

## Best Practices

### State Management

The application uses React Query for efficient state management:

- Automatic caching of user data
- Background refetching for stale data
- Optimistic updates for better UX
- Error boundaries and retry mechanisms

### Security Considerations

- All write operations require admin authentication
- Passwords are never exposed in client code
- Bearer tokens are used for authentication
- Input validation on both client and server

### Performance Optimization

- Pagination for user lists
- Selective field updates
- Caching with appropriate stale times
- Prefetching of user data

### User Experience

- Loading states during operations
- Success and error toast notifications
- Form validation with clear error messages
- Confirmation dialogs for destructive operations