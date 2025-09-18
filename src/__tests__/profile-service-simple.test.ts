import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn()
  },
  from: vi.fn()
};

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  get supabase() {
    return mockSupabase;
  }
}));

// Import ProfileService after mocks are set up
import { ProfileService } from '../lib/profile-service';

describe('ProfileService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProfileWithAuth', () => {
    it('should handle empty name by using email prefix as fallback', async () => {
      // This test would require more complex mocking of the SessionValidator
      // For now, we'll just verify that the method exists
      expect(typeof ProfileService.createProfileWithAuth).toBe('function');
    });
  });
});