# Tariff Service

<cite>
**Referenced Files in This Document**   
- [tariff-service.ts](file://src/lib/tariff-service.ts)
- [tariff-cache.ts](file://src/lib/tariff-cache.ts)
- [AdminTariffManagement.tsx](file://src/pages/admin/AdminTariffManagement.tsx)
- [AdminTariffNew.tsx](file://src/pages/admin/AdminTariffNew.tsx)
- [AdminTariffEdit.tsx](file://src/pages/admin/AdminTariffEdit.tsx)
- [AdminTariffFeatures.tsx](file://src/pages/admin/AdminTariffFeatures.tsx)
- [client.ts](file://src/integrations/supabase/client.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Responsibilities](#core-responsibilities)
3. [Key Methods](#key-methods)
4. [Integration with Admin UI Components](#integration-with-admin-ui-components)
5. [Error Handling](#error-handling)
6. [Caching Mechanism](#caching-mechanism)
7. [Usage Examples](#usage-examples)
8. [Currency and Pricing Configuration](#currency-and-pricing-configuration)

## Introduction
The TariffService class in the lovable-rise application is responsible for managing subscription plans and tariff configurations. It provides a comprehensive interface for creating, editing, deleting, and retrieving tariff plans, along with their associated features and limits. The service interacts with Supabase Edge Functions through authenticated HTTP requests and enforces session validation before performing any operations. This documentation details the implementation, functionality, and integration points of the TariffService class.

**Section sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L39-L739)

## Core Responsibilities
The TariffService class handles the complete lifecycle of tariff management within the application. Its primary responsibilities include:

- **Tariff Creation**: Creating new subscription plans with specified pricing, duration, and features
- **Tariff Modification**: Updating existing tariff plans with new configurations
- **Tariff Deletion**: Removing tariff plans from the system
- **Feature Management**: Configuring features associated with each tariff plan
- **Limit Configuration**: Setting usage limits for various system resources
- **Currency Management**: Handling multiple currency configurations for pricing
- **Data Retrieval**: Fetching tariff plans with all associated details

The service ensures data consistency by validating operations and maintaining relationships between tariffs, features, and limits. It also implements proper error handling for validation failures and server errors.

**Section sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L39-L739)

## Key Methods
The TariffService class exposes several static methods for managing tariff operations:

### createTariff
Creates a new tariff plan with the specified configuration. The method accepts a TariffInsert object containing all necessary tariff details and returns the created tariff with associated currency data.

```mermaid
flowchart TD
A["createTariff(tariffData)"] --> B["Insert tariff into database"]
B --> C{"Currency field valid?"}
C --> |Yes| D["Fetch currency data"]
D --> E["Combine tariff and currency data"]
E --> F["Return enhanced tariff object"]
C --> |No| G["Return tariff without currency data"]
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L198-L238)

### updateTariff
Updates an existing tariff plan with new configuration data. The method takes a tariff ID and a TariffUpdate object, performs the update operation, and returns the updated tariff with currency information.

```mermaid
flowchart TD
A["updateTariff(id, tariffData)"] --> B["Update tariff in database"]
B --> C{"Update successful?"}
C --> |No| D["Throw error"]
C --> |Yes| E{"Currency field valid?"}
E --> |Yes| F["Fetch currency data"]
F --> G["Combine updated tariff and currency data"]
G --> H["Return enhanced tariff object"]
E --> |No| I["Return updated tariff without currency data"]
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L240-L288)

### deleteTariff
Removes a tariff plan from the system by its ID. This operation is permanent and cannot be undone.

```mermaid
flowchart TD
A["deleteTariff(id)"] --> B["Execute delete operation"]
B --> C{"Error occurred?"}
C --> |Yes| D["Throw error"]
C --> |No| E["Return success status"]
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L290-L303)

### fetchTariffPlans
Retrieves all tariff plans from the database, with options to include inactive plans. The method optimizes data loading by making separate queries for tariffs, currencies, features, and limits, then combining them into a comprehensive response.

```mermaid
flowchart TD
A["getAllTariffs(includeInactive)"] --> B["Query tariffs from database"]
B --> C{"Tariffs found?"}
C --> |No| D["Return empty array"]
C --> |Yes| E["Extract tariff and currency IDs"]
E --> F["Query currencies in bulk"]
F --> G["Query features in bulk"]
G --> H["Query limits in bulk"]
H --> I["Combine all data into tariff objects"]
I --> J["Return complete tariff list"]
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L41-L156)

## Integration with Admin UI Components
The TariffService is tightly integrated with several admin interface components that provide a user-friendly way to manage tariff plans:

### AdminTariffManagement
This component displays a comprehensive list of all tariff plans and provides actions for editing, deleting, and duplicating plans. It uses the TariffService to fetch tariff data and perform operations.

```mermaid
sequenceDiagram
participant UI as AdminTariffManagement
participant Service as TariffService
participant DB as Supabase Database
UI->>Service : getAllTariffs(true)
Service->>DB : SELECT * FROM tariffs
DB-->>Service : Return tariff data
Service->>DB : SELECT * FROM currencies WHERE id IN (...)
DB-->>Service : Return currency data
Service->>DB : SELECT * FROM tariff_features WHERE tariff_id IN (...)
DB-->>Service : Return feature data
Service->>DB : SELECT * FROM tariff_limits WHERE tariff_id IN (...)
DB-->>Service : Return limit data
Service-->>UI : Return complete tariff list
```

**Diagram sources**
- [AdminTariffManagement.tsx](file://src/pages/admin/AdminTariffManagement.tsx#L99-L110)

### AdminTariffNew
This component provides a form interface for creating new tariff plans. It uses the TariffService.createTariff method to save new plans and related features/limits.

```mermaid
sequenceDiagram
participant UI as AdminTariffNew
participant Service as TariffService
participant DB as Supabase Database
UI->>Service : createTariff(tariffData)
Service->>DB : INSERT INTO tariffs
DB-->>Service : Return created tariff
Service->>DB : SELECT * FROM currencies
DB-->>Service : Return currency data
Service-->>UI : Return enhanced tariff object
UI->>Service : addTariffFeature(featureData)
Service->>DB : INSERT INTO tariff_features
DB-->>Service : Return created feature
Service-->>UI : Feature created
```

**Diagram sources**
- [AdminTariffNew.tsx](file://src/pages/admin/AdminTariffNew.tsx#L229-L239)

### AdminTariffEdit
This component allows editing existing tariff plans. It uses TariffService.updateTariff to save changes and provides real-time updates to features and limits.

```mermaid
sequenceDiagram
participant UI as AdminTariffEdit
participant Service as TariffService
participant DB as Supabase Database
UI->>Service : getTariffById(id)
Service->>DB : SELECT * FROM tariffs WHERE id = ?
DB-->>Service : Return tariff data
Service->>DB : SELECT * FROM currencies
DB-->>Service : Return currency data
Service->>DB : SELECT * FROM tariff_features
DB-->>Service : Return feature data
Service->>DB : SELECT * FROM tariff_limits
DB-->>Service : Return limit data
Service-->>UI : Return complete tariff data
UI->>Service : updateTariff(id, tariffData)
Service->>DB : UPDATE tariffs SET ... WHERE id = ?
DB-->>Service : Return updated tariff
Service-->>UI : Return success status
```

**Diagram sources**
- [AdminTariffEdit.tsx](file://src/pages/admin/AdminTariffEdit.tsx#L202-L202)

### AdminTariffFeatures
This component manages features and limits for tariff plans. It uses various TariffService methods to add, update, and delete features and limits.

```mermaid
sequenceDiagram
participant UI as AdminTariffFeatures
participant Service as TariffService
participant DB as Supabase Database
UI->>Service : getTariffById(id)
Service->>DB : SELECT * FROM tariffs WHERE id = ?
DB-->>Service : Return tariff data
Service->>DB : SELECT * FROM tariff_features
DB-->>Service : Return feature data
Service->>DB : SELECT * FROM tariff_limits
DB-->>Service : Return limit data
Service-->>UI : Return complete tariff data
UI->>Service : addTariffFeature(featureData)
Service->>DB : INSERT INTO tariff_features
DB-->>Service : Return created feature
Service-->>UI : Feature added
UI->>Service : updateTariffFeature(id, featureData)
Service->>DB : UPDATE tariff_features SET ... WHERE id = ?
DB-->>Service : Return updated feature
Service-->>UI : Feature updated
```

**Diagram sources**
- [AdminTariffFeatures.tsx](file://src/pages/admin/AdminTariffFeatures.tsx#L92-L108)

## Error Handling
The TariffService implements comprehensive error handling for both validation failures and server errors:

### Validation Errors
The service validates input data before performing operations and throws descriptive errors for invalid inputs:

- Missing required fields
- Invalid currency references
- Negative price or duration values
- Non-existent tariff IDs for updates/deletes

### Server Errors
The service handles database-level errors and provides meaningful feedback:

- Database connection issues
- Row Level Security (RLS) violations
- Constraint violations
- Authentication failures

Error handling is implemented consistently across all methods, with detailed logging for debugging purposes and user-friendly error messages for the UI components.

```mermaid
flowchart TD
A["Operation Execution"] --> B{"Error occurred?"}
B --> |No| C["Return success result"]
B --> |Yes| D["Log error details"]
D --> E["Determine error type"]
E --> F{"Validation error?"}
F --> |Yes| G["Return user-friendly message"]
F --> |No| H{"Server error?"}
H --> |Yes| I["Return generic error message"]
H --> |No| J["Return specific error message"]
G --> K["Display in UI"]
I --> K
J --> K
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L39-L739)

## Caching Mechanism
The TariffService integrates with a caching system to optimize performance and reduce database load:

### TariffCache Implementation
The caching mechanism is implemented in tariff-cache.ts as a singleton pattern with a 5-minute expiration period.

```mermaid
classDiagram
class TariffCache {
-cache : Tariff[] | null
-cacheTimestamp : number | null
-CACHE_DURATION : 300000
+getInstance() : TariffCache
+set(tariffs : Tariff[]) : void
+get() : Tariff[] | null
+clear() : void
+isValid() : boolean
}
```

**Diagram sources**
- [tariff-cache.ts](file://src/lib/tariff-cache.ts#L1-L46)

### Cache Usage Pattern
The AdminTariffManagement component implements a sophisticated caching strategy:

1. Check for valid cached data
2. If cache is valid, use it immediately
3. If cache is expired or empty, fetch fresh data
4. Update the cache with new data
5. Implement periodic background refreshes

This approach ensures a responsive user interface while maintaining data freshness.

```mermaid
flowchart TD
A["fetchTariffs(useCache)"] --> B{"Use cache?"}
B --> |Yes| C["Check TariffCache.get()"]
C --> D{"Cache valid?"}
D --> |Yes| E["Use cached data"]
D --> |No| F["Fetch fresh data"]
B --> |No| F
F --> G["Update TariffCache.set()"]
G --> H["Return data"]
```

**Diagram sources**
- [AdminTariffManagement.tsx](file://src/pages/admin/AdminTariffManagement.tsx#L100-L110)

## Usage Examples
The TariffService is used throughout the admin interface for various tariff management operations:

### Creating Sample Data
The service includes a createSampleData method that generates test tariff plans with appropriate features and limits:

```mermaid
flowchart TD
A["createSampleData()"] --> B["Check for currencies"]
B --> C["Create sample tariffs"]
C --> D["Add features based on tariff type"]
D --> E["Add limits based on tariff type"]
E --> F["Return success status"]
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L549-L549)

### Duplicating Tariffs
The duplicateTariff method creates a copy of an existing tariff with all its features and limits:

```mermaid
sequenceDiagram
participant Service as TariffService
participant DB as Supabase Database
Service->>DB : getTariffById(originalId)
DB-->>Service : Return original tariff
Service->>DB : createTariff(copyData)
DB-->>Service : Return new tariff
Service->>DB : addTariffFeature() for each feature
DB-->>Service : Return created features
Service->>DB : addTariffLimit() for each limit
DB-->>Service : Return created limits
Service-->>Caller : Return duplicated tariff
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L627-L627)

## Currency and Pricing Configuration
The TariffService provides comprehensive support for currency and pricing configuration in the AdminTariffFeatures component:

### Currency Management
The service retrieves all active currencies and associates them with tariff plans:

```mermaid
flowchart TD
A["getAllCurrencies()"] --> B["SELECT * FROM currencies"]
B --> C{"Status active?"}
C --> |Yes| D["Include in results"]
C --> |No| E["Exclude from results"]
D --> F["Order by code"]
F --> G["Return currency list"]
```

**Diagram sources**
- [tariff-service.ts](file://src/lib/tariff-service.ts#L526-L537)

### Pricing Configuration
The AdminTariffFeatures component allows administrators to configure pricing with proper validation:

- Free plans have null prices
- Paid plans require valid price values
- Currency selection affects price display
- Price formatting follows international standards

The component enforces business rules such as:
- Free tariffs cannot have price values
- Lifetime access tariffs cannot have duration days
- All tariffs must have a name and currency

```mermaid
flowchart TD
A["handleInputChange()"] --> B{"Field is 'is_free'?"}
B --> |Yes| C{"Value is true?"}
C --> |Yes| D["Set prices to null"]
C --> |No| E["Allow price editing"]
B --> |No| F{"Field is 'is_lifetime'?"}
F --> |Yes| G{"Value is true?"}
G --> |Yes| H["Set duration to null"]
G --> |No| I["Allow duration editing"]
F --> |No| J["Update field normally"]
```

**Diagram sources**
- [AdminTariffNew.tsx](file://src/pages/admin/AdminTariffNew.tsx#L229-L239)