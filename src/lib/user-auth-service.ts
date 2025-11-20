import { supabase } from "@/integrations/supabase/client";
import { ProfileService } from "./profile-service";
import { UserExistenceService, UserExistenceCheck } from "./user-existence-service";
import { 
  RegistrationData, 
  LoginData, 
  ResetPasswordData, 
  AuthResponse, 
  UserAuthError,
  UserProfile,
  AuthorizationError,
  SessionContext
} from "./user-auth-schemas";
import { AuthorizationErrorHandler } from "./error-handler";
import { SessionValidator, isAuthenticationError } from "./session-validation";

/**
 * Configuration options for registration with session management
 */
interface RegistrationOptions {
  maxRetries: number;
  sessionTimeout: number;
  profileCreationDelay: number;
  retryDelay: number;
}



/**
 * Registration performance and monitoring metrics
 */
interface RegistrationMetrics {
  startTime: number;
  steps: { [key: string]: { startTime: number; endTime?: number; duration?: number; success?: boolean; error?: any } };
  totalDuration?: number;
  success: boolean;
  finalError?: any;
}

/**
 * Enhanced logging service for registration flow monitoring
 */
class RegistrationLogger {
  private static metrics: Map<string, RegistrationMetrics> = new Map();
  
  static startRegistration(email: string): RegistrationMetrics {
    const metrics: RegistrationMetrics = {
      startTime: Date.now(),
      steps: {},
      success: false
    };
    
    this.metrics.set(email, metrics);
    console.log(`🚀 Registration started for ${email}`, {
      timestamp: new Date().toISOString(),
      email
    });
    
    return metrics;
  }
  
  static logStep(email: string, stepName: string, data?: any): void {
    const metrics = this.metrics.get(email);
    if (!metrics) return;
    
    if (!metrics.steps[stepName]) {
      metrics.steps[stepName] = { startTime: Date.now() };
      console.log(`📝 Registration step started: ${stepName}`, {
        email,
        step: stepName,
        timestamp: new Date().toISOString(),
        data
      });
    } else {
      metrics.steps[stepName].endTime = Date.now();
      metrics.steps[stepName].duration = metrics.steps[stepName].endTime! - metrics.steps[stepName].startTime;
      metrics.steps[stepName].success = !data?.error;
      if (data?.error) {
        metrics.steps[stepName].error = data.error;
      }
      
      console.log(`✅ Registration step completed: ${stepName}`, {
        email,
        step: stepName,
        duration: metrics.steps[stepName].duration,
        success: metrics.steps[stepName].success,
        timestamp: new Date().toISOString(),
        data
      });
    }
  }
  
  static finishRegistration(email: string, success: boolean, error?: any): void {
    const metrics = this.metrics.get(email);
    if (!metrics) return;
    
    metrics.totalDuration = Date.now() - metrics.startTime;
    metrics.success = success;
    if (error) {
      metrics.finalError = error;
    }
    
    console.log(`🏁 Registration completed for ${email}`, {
      email,
      success,
      totalDuration: metrics.totalDuration,
      steps: Object.keys(metrics.steps).length,
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(metrics)
    });
    
    // Keep metrics for analysis
    setTimeout(() => this.metrics.delete(email), 300000); // Clean up after 5 minutes
  }
  
  static logError(email: string, stepName: string, error: any, context?: any): void {
    console.error(`❌ Registration error in ${stepName}`, {
      email,
      step: stepName,
      error: {
        message: error.message,
        code: error.code,
        status: error.status || error.statusCode,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });
    
    this.logStep(email, stepName, { error });
  }
  
  static logWarning(email: string, stepName: string, message: string, data?: any): void {
    console.warn(`⚠️ Registration warning in ${stepName}`, {
      email,
      step: stepName,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  private static generateSummary(metrics: RegistrationMetrics): any {
    const stepSummary = Object.entries(metrics.steps).map(([name, step]) => ({
      name,
      duration: step.duration || 0,
      success: step.success !== false
    }));
    
    return {
      totalSteps: stepSummary.length,
      successfulSteps: stepSummary.filter(s => s.success).length,
      longestStep: stepSummary.reduce((prev, current) => 
        (prev.duration > current.duration) ? prev : current, { name: '', duration: 0 }
      )
    };
  }
  
  static getMetrics(email: string): RegistrationMetrics | undefined {
    return this.metrics.get(email);
  }
}

/**
 * Default configuration for registration process
 */
const DEFAULT_REGISTRATION_OPTIONS: RegistrationOptions = {
  maxRetries: 3,
  sessionTimeout: 10000, // 10 seconds
  profileCreationDelay: 1000, // 1 second
  retryDelay: 500 // 0.5 seconds
};

export class UserAuthService {
  private static authMeCache: { timestamp: number; data: { user: UserProfile | null; subscription: any | null; tariffLimits: Array<{ limit_name: string; value: number }> } } | null = null;
  private static authMeInFlight: Promise<{ user: UserProfile | null; subscription: any | null; tariffLimits: Array<{ limit_name: string; value: number }> }> | null = null;
  private static readonly AUTH_ME_TTL_MS = 15000;
  /**
   * Register a new user with email confirmation flow
   * Following Supabase email confirmation workflow:
   * 1. Registration creates user but no token until email confirmed
   * 2. User receives email with confirmation link
   * 3. After confirmation, user can login to get access token
   */
  static async register(data: RegistrationData, options: Partial<RegistrationOptions> = {}): Promise<AuthResponse> {
    const config = { ...DEFAULT_REGISTRATION_OPTIONS, ...options };
    const metrics = RegistrationLogger.startRegistration(data.email);
    
    try {
      RegistrationLogger.logStep(data.email, 'validation');
      console.log('Starting user registration for:', data.email);
      RegistrationLogger.logStep(data.email, 'validation', { completed: true });
      
      // Step 1: Check user existence through profile (more reliable)
      RegistrationLogger.logStep(data.email, 'existence_check');
      const existingProfile = await ProfileService.getProfileByEmail(data.email);
      
      if (existingProfile) {
        RegistrationLogger.logStep(data.email, 'existence_check', { exists: true, profile: existingProfile.id });
        RegistrationLogger.finishRegistration(data.email, false, UserAuthError.EMAIL_EXISTS);
        console.log('User profile already exists:', data.email);
        return {
          user: null,
          session: null,
          error: UserAuthError.EMAIL_EXISTS
        };
      }
      
      RegistrationLogger.logStep(data.email, 'existence_check', { exists: false });
      console.log('User does not exist, proceeding with registration');
      
      // Step 2: Supabase Auth signup - this creates user but NO session/token until email confirmed
      RegistrationLogger.logStep(data.email, 'auth_signup');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: data.name,
            full_name: data.name  // Alternative field for redundancy
          }
        }
      });

      if (signUpError || !authData.user) {
        RegistrationLogger.logError(data.email, 'auth_signup', signUpError || 'No user data returned');
        RegistrationLogger.finishRegistration(data.email, false, signUpError);
        console.error('Registration signup error:', signUpError);
        return {
          user: null,
          session: null,
          error: UserAuthService.mapSupabaseError(signUpError)
        };
      }

      RegistrationLogger.logStep(data.email, 'auth_signup', { 
        userId: authData.user.id, 
        hasSession: !!authData.session,
        emailConfirmed: authData.user.email_confirmed_at !== null
      });
      console.log('User created in auth:', {
        userId: authData.user.id,
        emailConfirmed: authData.user.email_confirmed_at !== null,
        hasSession: !!authData.session
      });
      
      // Step 3: According to Supabase flow - no session/token until email is confirmed
      // We should NOT create profile here if email requires confirmation
      if (!authData.session && !authData.user.email_confirmed_at) {
        RegistrationLogger.finishRegistration(data.email, true, 'Email confirmation required');
        console.log('Registration successful, email confirmation required before login');
        
        // Clear existence cache for correct subsequent checks
        UserExistenceService.clearExistenceCache(data.email);
        
        return {
          user: null,
          session: null,
          error: UserAuthError.EMAIL_CONFIRMATION_REQUIRED
        };
      }
      
      // If we somehow got a session immediately (email confirmation disabled in settings)
      if (authData.session) {
        RegistrationLogger.logStep(data.email, 'profile_creation_immediate');
        
        // Create profile since user is immediately authenticated
        let profile: UserProfile;
        try {
          profile = await ProfileService.createProfileWithAuth({
            id: authData.user.id,
            email: data.email,
            name: data.name
          }, authData.session.access_token);

          
          RegistrationLogger.logStep(data.email, 'profile_creation_immediate', {
            profileId: profile.id
          });
          console.log('Profile created immediately (email confirmation disabled)');
        } catch (profileError) {
          console.error('Profile creation failed:', profileError);
          RegistrationLogger.finishRegistration(data.email, false, profileError);
          return {
            user: null,
            session: null,
            error: UserAuthError.PROFILE_CREATION_FAILED
          };
        }
        
        UserExistenceService.clearExistenceCache(data.email);
        RegistrationLogger.finishRegistration(data.email, true);
        
        return {
          user: profile,
          session: authData.session,
          error: null
        };
      }
      
      // For email confirmation flow, we don't attempt to create profile immediately
      // Profile will be created when user confirms email and logs in
      UserExistenceService.clearExistenceCache(data.email);
      RegistrationLogger.finishRegistration(data.email, true);
      
      return {
        user: null,
        session: null,
        error: UserAuthError.EMAIL_CONFIRMATION_REQUIRED
      };
      
    } catch (error) {
      RegistrationLogger.logError(data.email, 'general', error);
      RegistrationLogger.finishRegistration(data.email, false, error);
      console.error('Registration error:', error);
      
      // Enhanced error handling for authorization issues
      if (this.isAuthorizationError(error)) {
        return {
          user: null,
          session: null,
          error: UserAuthError.INSUFFICIENT_PERMISSIONS
        };
      }
      
      return {
        user: null,
        session: null,
        error: UserAuthError.REGISTRATION_FAILED
      };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: UserAuthService.mapSupabaseError(error)
        };
      }

      // OAuth redirect, no immediate response
      return { user: null, session: null, error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return {
        user: null,
        session: null,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Sign in with Facebook OAuth
   */
  static async signInWithFacebook(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: UserAuthService.mapSupabaseError(error)
        };
      }

      // OAuth redirect, no immediate response
      return { user: null, session: null, error: null };
    } catch (error) {
      console.error('Facebook sign-in error:', error);
      return {
        user: null,
        session: null,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Handle OAuth callback and ensure proper role assignment
   * Also handles email confirmation callback
   */
  static async handleOAuthCallback(): Promise<AuthResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return {
          user: null,
          session: null,
          error: 'oauth_callback_failed'
        };
      }

      // Check if profile exists, if not create it (for OAuth users or email confirmed users)
      let profile = await ProfileService.getProfile(session.user.id);
      
      if (!profile) {
        console.log('Creating profile for authenticated user:', session.user.id);
        // Enhanced name extraction with fallbacks
        const userName = session.user.user_metadata?.name || 
                        session.user.user_metadata?.full_name ||
                        session.user.email?.split('@')[0] || 
                        'User';
        
        // Create profile if it doesn't exist
        try {
          profile = await ProfileService.createProfileWithAuth({
            id: session.user.id,
            email: session.user.email || '',
            name: userName
          }, session.access_token);
          
          console.log('Profile created successfully for authenticated user');
        } catch (profileError) {
          console.error('Profile creation in callback failed:', profileError);
          return {
            user: null,
            session: null,
            error: UserAuthError.PROFILE_CREATION_FAILED
          };
        }
      }

      // Check role and redirect appropriately
      if (profile && profile.role !== 'user') {
        return {
          user: null,
          session: session,
          error: 'redirect_to_admin'
        };
      }

      return {
        user: profile,
        session: session,
        error: null
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        user: null,
        session: null,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Login user and validate role
   * Properly handles email confirmation flow
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (signInError) {
        console.error('Login error:', signInError);
        return {
          user: null,
          session: null,
          error: UserAuthService.mapSupabaseError(signInError)
        };
      }

      if (authData.user && authData.session) {
        // Check if profile exists, if not create it (for users who confirmed email)
        let profile = await ProfileService.getProfile(authData.user.id);
        
        if (!profile) {
          console.log('Creating profile for confirmed user:', authData.user.id);
          // Enhanced name extraction with fallbacks
          const userName = authData.user.user_metadata?.name || 
                          authData.user.user_metadata?.full_name ||
                          authData.user.email?.split('@')[0] || 
                          'User';
          
          try {
            profile = await ProfileService.createProfileWithAuth({
              id: authData.user.id,
              email: data.email,
              name: userName
            }, authData.session.access_token);
          } catch (profileError) {
            console.error('Profile creation during login failed:', profileError);
            return {
              user: null,
              session: null,
              error: UserAuthError.PROFILE_CREATION_FAILED
            };
          }
        }
        
        // Validate user role
        if (profile && profile.role !== 'user') {
          // If admin or manager, they should use admin interface
          return {
            user: null,
            session: authData.session,
            error: 'redirect_to_admin'
          };
        }

        return {
          user: profile,
          session: authData.session,
          error: null
        };
      }

      return {
        user: null,
        session: null,
        error: UserAuthError.LOGIN_FAILED
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        user: null,
        session: null,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Initiate password reset
   */
  static async resetPassword(data: ResetPasswordData): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/user-reset-password`
      });

      if (error) {
        return {
          success: false,
          error: UserAuthService.mapSupabaseError(error)
        };
      }

      return {
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Update password with reset token
   */
  static async updatePassword(password: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        return {
          success: false,
          error: UserAuthService.mapSupabaseError(error)
        };
      }

      return {
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: UserAuthService.mapSupabaseError(error)
        };
      }

      return {
        success: true,
        error: null
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  static async fetchAuthMe(): Promise<{ user: UserProfile | null; subscription: any | null; tariffLimits: Array<{ limit_name: string; value: number }> }> {
    const now = Date.now();
    if (this.authMeCache && now - this.authMeCache.timestamp < this.AUTH_ME_TTL_MS) {
      return this.authMeCache.data;
    }
    if (this.authMeInFlight) {
      return this.authMeInFlight;
    }
    this.authMeInFlight = (async () => {
      const validation = await SessionValidator.ensureValidSession();
      if (!validation.isValid) {
        this.authMeInFlight = null;
        return { user: null, subscription: null, tariffLimits: [] };
      }
      const accessToken = validation.accessToken || await this.getCurrentAccessToken();
      const { data, error } = await (supabase as any).functions.invoke('auth-me', {
        body: {},
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (error) {
        this.authMeInFlight = null;
        return { user: null, subscription: null, tariffLimits: [] };
      }
      const resp: any = data;
      const result = {
        user: (resp?.user ?? null) as UserProfile | null,
        subscription: resp?.subscription ?? null,
        tariffLimits: Array.isArray(resp?.tariffLimits) ? resp.tariffLimits as Array<{ limit_name: string; value: number }> : [],
      };
      this.authMeCache = { timestamp: Date.now(), data: result };
      this.authMeInFlight = null;
      return result;
    })();
    return this.authMeInFlight;
  }

  static clearAuthMeCache(): void {
    this.authMeCache = null;
  }

  /**
   * Get current user session and profile
   */
  static async getCurrentUser(): Promise<AuthResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          user: null,
          session: null,
          error: null
        };
      }

      const profile = await ProfileService.getProfile(session.user.id);
      
      return {
        user: profile,
        session: session,
        error: null
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        user: null,
        session: null,
        error: UserAuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Create user profile in database
   */
  private static async createUserProfile(userId: string, userData: { email: string; name: string }): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: userData.email,
        name: userData.name
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
}


  /**
   * Get user profile from database (deprecated - use ProfileService.getProfile instead)
   * @deprecated Use ProfileService.getProfile for better error handling
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    console.warn('getUserProfile is deprecated, use ProfileService.getProfile instead');
    return ProfileService.getProfile(userId);
  }

  /**
   * Wait for database trigger to create profile (fallback strategy)
   */
  private static async waitForTriggerProfile(
    userId: string, 
    maxWaitTime: number = 3000
  ): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 200;
    
    console.log(`Waiting for trigger-created profile for user ${userId}...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const profile = await ProfileService.getProfile(userId);
        if (profile) {
          console.log('Trigger-created profile detected:', profile.id);
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.warn('Error checking for trigger profile:', error);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    console.warn(`No trigger profile found within ${maxWaitTime}ms for user ${userId}`);
    return false;
  }

  /**
   * Wait for session to be ready with proper authentication context
   * Enhanced with comprehensive session validation
   */
  private static async waitForSessionReady(userId: string, timeout: number): Promise<SessionContext> {
    console.log(`[UserAuthService] Waiting for session to be ready for user ${userId}...`);
    
    const validation = await SessionValidator.waitForValidSession(userId, timeout);
    
    if (validation.isValid) {
      console.log('[UserAuthService] Session ready for user:', userId);
      return {
        accessToken: validation.accessToken,
        refreshToken: validation.refreshToken,
        userId: validation.user!.id,
        isReady: true,
        expiresAt: validation.expiresAt
      };
    }
    
    console.warn(`[UserAuthService] Session not ready after ${timeout}ms timeout for user ${userId}`);
    return {
      accessToken: null,
      refreshToken: null,
      userId,
      isReady: false,
      expiresAt: null
    };
  }

  /**
   * Create profile with session-aware retry mechanism
   */
  private static async createProfileWithSessionRetry(
    profileData: Partial<UserProfile> & { id: string },
    sessionContext: SessionContext,
    config: RegistrationOptions
  ): Promise<UserProfile> {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        console.log(`Profile creation attempt ${attempt}/${config.maxRetries}`);
        
        // Add delay before each attempt (except the first)
        if (attempt > 1) {
          const delay = config.retryDelay * Math.pow(2, attempt - 2); // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Refresh session if needed
          if (sessionContext.isReady && sessionContext.expiresAt && 
              Date.now() > sessionContext.expiresAt - 60000) { // Refresh if expires within 1 minute
            await this.refreshSessionIfNeeded();
          }
        } else {
          // Initial delay to allow for trigger processing
          await new Promise(resolve => setTimeout(resolve, config.profileCreationDelay));
        }
        
        // Attempt profile creation with current session context
        const profile = await ProfileService.createProfileWithVerification(profileData);
        
        console.log(`Profile creation successful on attempt ${attempt}`);
        return profile;
        
      } catch (error) {
        lastError = error;
        console.error(`Profile creation attempt ${attempt} failed:`, error);
        
        // If this is an authorization error, log additional context
        if (this.isAuthorizationError(error)) {
          console.error('Authorization error detected:', {
            attempt,
            sessionReady: sessionContext.isReady,
            hasAccessToken: !!sessionContext.accessToken,
            userId: profileData.id
          });
          
          // If session appears ready but we still get auth errors, wait longer
          if (sessionContext.isReady && attempt < config.maxRetries) {
            console.log('Session appears ready but auth failed, waiting longer...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // If not the last attempt, continue retrying
        if (attempt < config.maxRetries) {
          console.log(`Retrying profile creation (${config.maxRetries - attempt} attempts remaining)`);
          continue;
        }
      }
    }
    
    // All attempts failed
    console.error(`Profile creation failed after ${config.maxRetries} attempts`);
    throw lastError || new Error('Profile creation failed after maximum retries');
  }

  /**
   * Enhanced authorization error detection
   */
  private static isAuthorizationError(error: any): boolean {
    return isAuthenticationError(error);
  }

  /**
   * Handle profile creation errors with specific error mapping
   */
  private static handleProfileCreationError(error: any): string {
    if (this.isAuthorizationError(error)) {
      return UserAuthError.INSUFFICIENT_PERMISSIONS;
    }
    
    if (error.code === 'PGRST116') {
      return UserAuthError.USER_NOT_FOUND;
    }
    
    if (error.message?.includes('duplicate key')) {
      return UserAuthError.EMAIL_EXISTS;
    }
    
    return UserAuthError.PROFILE_CREATION_FAILED;
  }

  /**
   * Refresh session if needed to maintain valid authentication
   */
  private static async refreshSessionIfNeeded(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.warn('Failed to refresh session:', error);
        return;
      }
      
      if (session) {
        console.log('Session refreshed successfully');
      }
    } catch (error) {
      console.warn('Exception during session refresh:', error);
    }
  }

  /**
   * Extract session context from authentication response
   */
  private static extractSessionContext(authData: any): SessionContext {
    return {
      accessToken: authData.session?.access_token || null,
      refreshToken: authData.session?.refresh_token || null,
      userId: authData.user?.id || '',
      isReady: !!(authData.session?.access_token && authData.user?.id),
      expiresAt: authData.session?.expires_at ? authData.session.expires_at * 1000 : null
    };
  }

  /**
   * Get current access token from session
   * Enhanced with session validation
   */
  private static async getCurrentAccessToken(): Promise<string | null> {
    try {
      const validation = await SessionValidator.validateSession();
      
      if (!validation.isValid || !validation.accessToken) {
        console.warn('[UserAuthService] No valid access token available');
        return null;
      }
      
      return validation.accessToken;
    } catch (error) {
      console.error('[UserAuthService] Error getting current session:', error);
      return null;
    }
  }

  /**
   * Map Supabase auth errors to user-friendly messages with enhanced error types
   * Enhanced for email confirmation flow
   */
  private static mapSupabaseError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    // Email confirmation specific errors
    if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
      return UserAuthError.EMAIL_CONFIRMATION_REQUIRED;
    }
    if (message.includes('email address not confirmed') || message.includes('signup requires a confirmation')) {
      return UserAuthError.EMAIL_CONFIRMATION_REQUIRED;
    }
    
    // Credential errors
    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
      return UserAuthError.INVALID_CREDENTIALS;
    }
    
    // User existence errors
    if (message.includes('user already registered') || message.includes('email already registered')) {
      return UserAuthError.EMAIL_EXISTS;
    }
    if (message.includes('user not found') || message.includes('no user found')) {
      return UserAuthError.USER_NOT_FOUND;
    }
    
    // Password errors
    if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
      return UserAuthError.WEAK_PASSWORD;
    }
    
    // Network and connection errors
    if (message.includes('network') || message.includes('connection')) {
      return UserAuthError.NETWORK_ERROR;
    }
    
    // Rate limiting
    if (message.includes('too many') || message.includes('rate limit')) {
      return 'rate_limit_exceeded';
    }
    
    // Authorization errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return UserAuthError.INSUFFICIENT_PERMISSIONS;
    }
    
    // Default fallback
    console.warn('Unmapped Supabase error:', { message, code: error.code, status: error.status });
    return UserAuthError.REGISTRATION_FAILED;
  }

  /**
   * Handle authorization errors with enhanced retry logic
   */
  static async handleAuthorizationError(
    error: any, 
    attemptCount: number, 
    maxAttempts: number = 3
  ): Promise<{ shouldRetry: boolean; waitTime: number; userMessage: string }> {
    const authError = AuthorizationErrorHandler.analyzeAuthorizationError(error);
    const shouldRetry = AuthorizationErrorHandler.shouldRetry(authError, attemptCount, maxAttempts);
    const waitTime = AuthorizationErrorHandler.getRetryWaitTime(authError, attemptCount);
    const userMessage = AuthorizationErrorHandler.getUserFriendlyMessage(authError);
    
    console.log('Authorization error handling decision:', {
      error: authError,
      shouldRetry,
      waitTime,
      attemptCount,
      maxAttempts
    });
    
    return { shouldRetry, waitTime, userMessage };
  }
}