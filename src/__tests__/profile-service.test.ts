import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileOperationError, ProfileErrorCode } from '../lib/error-handler';

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

// Mock SessionValidator
vi.mock('../lib/session-validation', () => ({
  SessionValidator: {
    ensureValidSession: vi.fn(),
    logSessionDebugInfo: vi.fn(),
    validateRLSContext: vi.fn()
  }
}));

// Import ProfileService after mocks are set up
import { ProfileService } from '../lib/profile-service';

describe('ProfileService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockSupabase.from.mockReturnValue({
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    
    // Mock SessionValidator
    const mockSessionValidation = {
      isValid: true,
      session: {},
      user: { id: 'user123' },
      accessToken: 'token123',
      refreshToken: 'refresh123',
      expiresAt: Date.now() + 3600000,
      timeUntilExpiry: 3600000,
      needsRefresh: false
    };
    
    require('../lib/session-validation').SessionValidator.ensureValidSession.mockResolvedValue(mockSessionValidation);
    require('../lib/session-validation').SessionValidator.logSessionDebugInfo.mockResolvedValue(undefined);
    require('../lib/session-validation').SessionValidator.validateRLSContext.mockResolvedValue({ isValid: true, userId: 'user123' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProfileWithAuth', () => {
    it('should validate and log profile data with name fallback', async () => {
      const mockProfileData = {
        id: 'user123',
        email: 'test@example.com',
        name: '' // Empty name to test fallback
      };
      
      const mockResponse = {
        data: {
          id: 'user123',
          email: 'test@example.com',
          name: 'test', // Should use email prefix as fallback
          role: 'user',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      };
      
      // Mock the Supabase upsert response
      const mockUpsert = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      };
      
      mockSupabase.from.mockReturnValue(mockUpsert);
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await ProfileService.createProfileWithAuth(mockProfileData);
      
      // Verify that a warning was logged for missing name
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ProfileService] Profile name is missing, using fallback');
      
      // Verify that the name was set to the email prefix
      expect(result.name).toBe('test');
      
      // Verify that the upsert was called with the corrected data
      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        {
          id: 'user123',
          email: 'test@example.com',
          name: 'test'
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false
        }
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should log profile creation data for debugging', async () => {
      const mockProfileData = {
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe'
      };
      
      const mockResponse = {
        data: {
          id: 'user123',
          email: 'test@example.com',
          name: 'John Doe',
          role: 'user',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      };
      
      // Mock the Supabase upsert response
      const mockUpsert = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      };
      
      mockSupabase.from.mockReturnValue(mockUpsert);
      
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await ProfileService.createProfileWithAuth(mockProfileData);
      
      // Verify that profile data was logged
      expect(consoleLogSpy).toHaveBeenCalledWith('[ProfileService] Creating profile with data:', {
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe'
      });
      
      consoleLogSpy.mockRestore();
    });

    it('should throw ProfileOperationError when required fields are missing', async () => {
      const mockProfileData = {
        id: 'user123',
        email: '', // Missing email
        name: 'John Doe'
      };
      
      await expect(ProfileService.createProfileWithAuth(mockProfileData))
        .rejects
        .toBeInstanceOf(ProfileOperationError);
    });
  });
});