# Dynamic Menu Pages Implementation

## Overview

This implementation resolves 400 routing errors when navigating to menu items stored in the database by creating a dynamic routing system that can handle any menu path and render appropriate content based on the menu item's configuration.

## Features Implemented

### 1. Database Schema Enhancement
- Added new columns to `menu_items` table:
  - `page_type`: Enum ('content', 'form', 'dashboard', 'list', 'custom')
  - `content_data`: JSONB for page-specific configuration
  - `template_name`: String for custom component names
  - `meta_data`: JSONB for additional metadata

### 2. Dynamic Routing System
- **DynamicMenuPage**: Main component that handles all dynamic routes
- **ContentRenderer**: Renders appropriate content based on page_type
- **ErrorBoundary**: Catches and handles rendering errors gracefully
- **NotFoundFallback**: User-friendly 404 pages with helpful suggestions

### 3. Page Type Components
- **ContentPage**: Static content with HTML rendering
- **FormPage**: Dynamic form generation with validation
- **DashboardPage**: Widget-based dashboard layouts
- **ListPage**: Data tables with search, sort, and pagination
- **CustomPage**: Framework for custom component integration

### 4. Enhanced Error Handling
- Graceful degradation for missing content
- Comprehensive error boundaries
- User-friendly error messages
- Development vs production error displays

## Implementation Files

### Core Components
```
src/pages/
├── DynamicMenuPage.tsx          # Main dynamic page handler
├── ContentRenderer.tsx          # Page type router
└── page-types/
    ├── ContentPage.tsx          # Static content pages
    ├── FormPage.tsx             # Dynamic forms
    ├── DashboardPage.tsx        # Widget dashboards
    ├── ListPage.tsx             # Data tables
    └── CustomPage.tsx           # Custom components

src/components/
├── ErrorBoundary.tsx            # Error handling wrapper
└── NotFoundFallback.tsx         # 404 fallback component
```

### Database
```
supabase/migrations/
└── 20250909000000_add_dynamic_menu_content.sql

supabase/functions/
└── menu-content/
    └── index.ts                 # Enhanced menu API
```

### Configuration
```
src/App.tsx                      # Updated routing config
src/components/AdminSidebar.tsx  # Updated menu navigation
```

## Usage

### 1. Apply Database Migration
```bash
# In your Supabase dashboard or CLI
psql -f supabase/migrations/20250909000000_add_dynamic_menu_content.sql
```

### 2. Create Menu Items
```typescript
// Example: Creating a content page
const contentPage = {
  title: "About Us",
  path: "/about",
  page_type: "content",
  content_data: {
    html_content: "<h1>About Us</h1><p>Company information...</p>"
  }
};

// Example: Creating a form page
const formPage = {
  title: "Contact",
  path: "/contact", 
  page_type: "form",
  content_data: {
    title: "Contact Us",
    form_config: {
      fields: [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "email", label: "Email", type: "email", required: true }
      ]
    }
  }
};
```

### 3. Navigation
Menu items automatically generate routes at `/admin{item.path}`. For example:
- Database path: `/about` → Route: `/admin/about`
- Database path: `/contact` → Route: `/admin/contact`

## Page Types Guide

### Content Pages
For static content with rich text:
```json
{
  "page_type": "content",
  "content_data": {
    "html_content": "<div class='prose'>...</div>"
  }
}
```

### Form Pages
For dynamic forms:
```json
{
  "page_type": "form",
  "content_data": {
    "title": "Form Title",
    "description": "Form description",
    "form_config": {
      "fields": [
        {
          "id": "field_name",
          "label": "Field Label", 
          "type": "text|email|textarea|select|number",
          "required": true,
          "placeholder": "Optional placeholder",
          "options": ["Option 1", "Option 2"] // For select fields
        }
      ],
      "submitText": "Submit Button Text"
    }
  }
}
```

### Dashboard Pages
For widget-based dashboards:
```json
{
  "page_type": "dashboard",
  "content_data": {
    "widgets": [
      {
        "type": "stats|chart|progress|list",
        "title": "Widget Title",
        "data": {
          // Widget-specific configuration
        }
      }
    ]
  }
}
```

### List Pages
For data tables:
```json
{
  "page_type": "list",
  "content_data": {
    "title": "Table Title",
    "table_config": {
      "columns": [
        {
          "key": "column_key",
          "label": "Column Label",
          "type": "text|number|date|badge|boolean",
          "sortable": true
        }
      ],
      "itemsPerPage": 10
    },
    "data": [
      // Array of data objects
    ]
  }
}
```

### Custom Pages
For custom components:
```json
{
  "page_type": "custom",
  "template_name": "CustomComponentName",
  "content_data": {
    // Component-specific props
  }
}
```

## API Endpoints

### Menu Content API
New Supabase function: `/functions/v1/menu-content`

- `GET /menu-content/by-path?path=/about` - Get menu item by path
- `GET /menu-content/item/:id` - Get menu item by ID
- `PUT /menu-content/item/:id` - Update menu item (admin only)
- `POST /menu-content/item` - Create menu item (admin only)
- `GET /menu-content/templates` - Get available templates

## Error Handling

### Client-Side Errors
- **ErrorBoundary**: Catches JavaScript errors during rendering
- **NotFoundFallback**: Handles missing pages gracefully
- **Loading States**: Skeleton loaders during data fetching

### Server-Side Errors
- **Database Errors**: Graceful degradation with error messages
- **Permission Errors**: Clear access denied messages
- **Network Errors**: Retry mechanisms and offline handling

## Testing

### Manual Testing
1. Run the development server: `npm run dev`
2. Navigate to admin section: `http://localhost:8081/admin-auth`
3. Test different menu items and page types
4. Verify error handling with invalid routes

### Automated Testing
```typescript
// Use the test helper
import { testDynamicMenuImplementation } from './src/test-dynamic-menu';
await testDynamicMenuImplementation();
```

## Migration Path

### Phase 1: Basic Implementation ✅
- Database schema updates
- Core routing system
- Basic page types
- Error handling

### Phase 2: Content Management (Future)
- Admin interface for managing menu content
- Rich text editor integration
- Template management system
- Content versioning

### Phase 3: Advanced Features (Future)
- Caching and performance optimization
- Advanced widget system
- Custom component registry
- Analytics and monitoring

## Security Considerations

- **Permission Checks**: Menu items respect user permissions
- **Input Validation**: All content data is validated
- **XSS Protection**: HTML content is sanitized appropriately
- **SQL Injection**: Using Supabase's safe query methods

## Performance Optimizations

- **Code Splitting**: Page types loaded on demand
- **Caching**: Menu items cached in browser
- **Lazy Loading**: Components loaded when needed
- **Error Boundaries**: Prevent cascade failures

## Troubleshooting

### Common Issues

1. **"Page not found" errors**
   - Check if migration has been applied
   - Verify menu item paths don't have `/admin` prefix
   - Ensure menu items are active (`is_active = true`)

2. **TypeScript errors**
   - Regenerate Supabase types after migration
   - Check import paths for new components

3. **Rendering errors**
   - Check browser console for ErrorBoundary logs
   - Verify content_data structure matches page type requirements

### Debug Mode
Set `NODE_ENV=development` to see detailed error information in ErrorBoundary fallbacks.

## Contributing

When adding new page types:
1. Create component in `src/pages/page-types/`
2. Add case in `ContentRenderer.tsx`
3. Update type definitions
4. Add tests and documentation

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database migration status
3. Test with simple content first
4. Check component imports and paths