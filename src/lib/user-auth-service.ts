import { supabase } from "@/integrations/supabase/client";
import { ProfileService } from "./profile-service";
import { 
  RegistrationData, 
  LoginData, 
  ResetPasswordData, 
  AuthResponse, 
  UserAuthError,
  UserProfile
} from "./user-auth-schemas";

export class UserAuthService {
  /**
   * Register a new user with 'user' role
   */
  static async register(data: RegistrationData): Promise<AuthResponse> {
    try {
      console.log('Starting user registration for:', data.email);
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: 'user'  // Explicit user role assignment
          }
        }
      });

      if (signUpError) {
        console.error('Registration signup error:', signUpError);
        return {
          user: null,
          session: null,
          error: UserAuthService.mapSupabaseError(signUpError)
        };
      }

      if (authData.user) {
        console.log('User created in auth, waiting for profile creation...');
        
        // Give more time for trigger to process and add retry logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile was created with retry mechanism using ProfileService
        let profile = await ProfileService.ensureProfile(authData.user.id, {
          email: data.email,
          name: data.name
        });
        
        if (profile) {
          console.log(`Profile created successfully with role: ${profile.role}`);
          
          // Validate correct role assignment
          if (profile.role !== 'user' && profile.role !== 'admin') {
            console.warn(`Role mismatch: expected 'user' or 'admin', got '${profile.role}' for user ${data.email}`);
            // Log this for monitoring but don't fail registration
          }
          
          if (authData.session) {
            // User confirmed, has session
            return {
              user: profile,
              session: authData.session,
              error: null
            };
          } else {
            // Email confirmation required
            return {
              user: null,
              session: null,
              error: UserAuthError.EMAIL_CONFIRMATION_REQUIRED
            };
          }
        } else {
          console.error(`Profile creation failed for user ${data.email}`);
          // Profile creation failed
          return {
            user: null,
            session: null,
            error: UserAuthError.PROFILE_CREATION_FAILED
          };
        }
      }

      return {
        user: null,
        session: null,
        error: UserAuthError.REGISTRATION_FAILED
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        user: null,
        session: null,
        error: UserAuthError.NETWORK_ERROR
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

      // Check if profile exists, if not create it with user role using ProfileService
      let profile = await ProfileService.ensureProfile(session.user.id, {
        email: session.user.email || 'User',
        name: session.user.user_metadata?.name || session.user.email || 'User'
      });

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
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (signInError) {
        return {
          user: null,
          session: null,
          error: UserAuthService.mapSupabaseError(signInError)
        };
      }

      if (authData.user && authData.session) {
        const profile = await ProfileService.getProfile(authData.user.id);
        
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
        redirectTo: `${window.location.origin}/reset-password`
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
          name: userData.name,
          role: 'user',
          status: 'active'
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
   * Map Supabase auth errors to user-friendly messages
   */
  private static mapSupabaseError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
      return UserAuthError.INVALID_CREDENTIALS;
    }
    if (message.includes('user already registered') || message.includes('email already registered')) {
      return UserAuthError.EMAIL_EXISTS;
    }
    if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
      return UserAuthError.WEAK_PASSWORD;
    }
    if (message.includes('network') || message.includes('connection')) {
      return UserAuthError.NETWORK_ERROR;
    }
    if (message.includes('email not confirmed')) {
      return UserAuthError.EMAIL_CONFIRMATION_REQUIRED;
    }
    
    return UserAuthError.REGISTRATION_FAILED;
  }
}