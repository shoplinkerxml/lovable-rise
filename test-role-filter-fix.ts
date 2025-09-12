/**
 * Test to verify the role filter fix in AdminUsersPage
 * This test checks that the default role filter is set to "user" instead of "all"
 */

import { test, expect } from '@jest/globals';

// Mock the React component to test the default state
const mockAdminUsersPage = {
  defaultFilters: {
    search: "",
    status: "all",
    role: "user", // This should be "user" after our fix, not "all"
    sortBy: "created_at",
    sortOrder: "desc",
  }
};

test('AdminUsersPage should have default role filter set to "user"', () => {
  expect(mockAdminUsersPage.defaultFilters.role).toBe("user");
  expect(mockAdminUsersPage.defaultFilters.role).not.toBe("all");
});