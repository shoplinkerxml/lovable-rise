import { supabase } from '@/integrations/supabase/client';

/**
 * Service for validating and managing user subscription status
 * Automatically deactivates expired subscriptions based on end_date
 */
export class SubscriptionValidationService {
  
  /**
   * Check if a subscription is expired based on end_date
   */
  private static isExpired(endDate: string | null): boolean {
    if (!endDate) {
      console.log('[Subscription] Lifetime subscription (no end_date)');
      return false; // Lifetime subscriptions have no end_date
    }
    const endMs = new Date(endDate).getTime();
    const nowMs = Date.now();
    const expired = endMs < nowMs;
    console.log('[Subscription] Check expiration:', {
      endDate,
      endMs,
      nowMs,
      currentDate: new Date().toISOString(),
      expired
    });
    return expired;
  }

  /**
   * Validate and update user's active subscription
   * Deactivates subscription if end_date has passed
   * Returns true if subscription is active and valid, false otherwise
   */
  static async validateUserSubscription(userId: string): Promise<{
    isValid: boolean;
    subscription: any | null;
    wasDeactivated: boolean;
  }> {
    try {
      // Get current active subscription
      const { data: activeSubscription, error } = await (supabase as any)
        .from('user_subscriptions')
        .select('*, tariffs(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active subscription:', error);
        throw error;
      }

      // No active subscription found
      if (!activeSubscription) {
        return {
          isValid: false,
          subscription: null,
          wasDeactivated: false
        };
      }

      // Check if subscription is expired
      const expired = this.isExpired(activeSubscription.end_date);

      if (expired) {
        // Deactivate expired subscription
        const { error: updateError } = await (supabase as any)
          .from('user_subscriptions')
          .update({ is_active: false })
          .eq('id', activeSubscription.id);

        if (updateError) {
          console.error('Error deactivating expired subscription:', updateError);
          throw updateError;
        }

        console.log('Subscription deactivated due to expiration:', activeSubscription.id);

        return {
          isValid: false,
          subscription: activeSubscription,
          wasDeactivated: true
        };
      }

      // Subscription is active and valid
      return {
        isValid: true,
        subscription: activeSubscription,
        wasDeactivated: false
      };

    } catch (error) {
      console.error('Error in validateUserSubscription:', error);
      throw error;
    }
  }

  /**
   * Validate subscription without auto-creating new ones
   * This should be called on every page load/navigation
   */
  static async ensureValidSubscription(userId: string): Promise<{
    hasValidSubscription: boolean;
    subscription: any | null;
    isDemo: boolean;
  }> {
    try {
      // Validate existing subscription and deactivate if expired
      const validation = await this.validateUserSubscription(userId);

      // If valid subscription exists, return it
      if (validation.isValid && validation.subscription) {
        return {
          hasValidSubscription: true,
          subscription: validation.subscription,
          isDemo: (validation.subscription.tariffs?.is_free === true) && 
                  (validation.subscription.tariffs?.visible === false)
        };
      }

      // No valid subscription - do NOT auto-create, just return false
      console.log('[Subscription] No valid subscription found for user:', userId);
      return {
        hasValidSubscription: false,
        subscription: null,
        isDemo: false
      };

    } catch (error) {
      console.error('Error in ensureValidSubscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription info with validation
   * Returns subscription details or null if expired/invalid
   */
  static async getValidSubscription(userId: string): Promise<any | null> {
    const result = await this.ensureValidSubscription(userId);
    return result.hasValidSubscription ? result.subscription : null;
  }
}
