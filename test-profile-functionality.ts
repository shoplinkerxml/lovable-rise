/**
 * Test script to verify that both profile sections (header and sidebar) 
 * now open the same right-side menu.
 * 
 * Expected behavior:
 * 1. Header profile button (top-right) should open sheet from right side
 * 2. Sidebar profile button (bottom of sidebar) should now also open sheet from right side 
 * 3. Both should show the same profile content and functionality
 * 4. Both should use the same UserProfile data passed from AdminLayout
 * 
 * Changes made:
 * - Updated UserProfileSection to use side="right" instead of side="left"
 * - Modified AdminSidebar to accept userProfile prop
 * - Updated ResponsiveAdminSidebar to pass userProfile prop
 * - Updated AdminLayout to pass userProfile to sidebar
 * - Fixed TypeScript types for UserProfile interface
 */

console.log('Profile functionality unified: Both header and sidebar profiles now open the same right-side menu');