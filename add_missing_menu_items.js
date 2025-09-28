// Script to add missing menu items for all existing users
// This script adds tariff, reports, and settings menu items for all users

import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using the same values as in the client.ts file
const SUPABASE_URL = "https://ehznqzaumsnjkrntaiox.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoem5xemF1bXNuamtybnRhaW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcxMzYyMywiZXhwIjoyMDcyMjg5NjIzfQ.Wz9z9b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5"; // This would need to be a service role key

// Create Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function addMissingMenuItems() {
  try {
    console.log('Starting to add missing menu items...');
    
    // Get all users with role 'user'
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'user');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Found ${users.length} users`);
    
    // For each user, check if they have the menu items and add them if missing
    for (const user of users) {
      const userId = user.id;
      
      // Check and add tariff menu item
      const { data: tariffItem, error: tariffError } = await supabase
        .from('user_menu_items')
        .select('id')
        .eq('user_id', userId)
        .eq('path', 'tariff')
        .maybeSingle();
      
      if (!tariffItem && !tariffError) {
        const { error: insertError } = await supabase
          .from('user_menu_items')
          .insert({
            user_id: userId,
            title: 'Тарифні плани',
            path: 'tariff',
            order_index: 3,
            page_type: 'list',
            icon_name: 'CreditCard',
            description: 'Manage your tariff and billing information',
            content_data: {
              "table_config": {
                "columns": [
                  {"key": "icon", "label": "", "type": "text"},
                  {"key": "name", "label": "Назва тарифу", "type": "text", "sortable": true},
                  {"key": "new_price", "label": "Ціна", "type": "number", "sortable": true},
                  {"key": "duration_days", "label": "Термін", "type": "number", "sortable": true},
                  {"key": "is_active", "label": "Статус", "type": "badge", "sortable": true},
                  {"key": "actions", "label": "Дії", "type": "text"}
                ]
              }
            }
          });
        
        if (insertError) {
          console.error(`Error adding tariff item for user ${userId}:`, insertError);
        } else {
          console.log(`Added tariff item for user ${userId}`);
        }
      }
      
      // Check and add reports menu item
      const { data: reportsItem, error: reportsError } = await supabase
        .from('user_menu_items')
        .select('id')
        .eq('user_id', userId)
        .eq('path', 'reports')
        .maybeSingle();
      
      if (!reportsItem && !reportsError) {
        const { error: insertError } = await supabase
          .from('user_menu_items')
          .insert({
            user_id: userId,
            title: 'Reports',
            path: 'reports',
            order_index: 4,
            page_type: 'content',
            icon_name: 'BarChart3',
            description: 'View your usage reports and analytics'
          });
        
        if (insertError) {
          console.error(`Error adding reports item for user ${userId}:`, insertError);
        } else {
          console.log(`Added reports item for user ${userId}`);
        }
      }
      
      // Check and add settings menu item
      const { data: settingsItem, error: settingsError } = await supabase
        .from('user_menu_items')
        .select('id')
        .eq('user_id', userId)
        .eq('path', 'settings')
        .maybeSingle();
      
      if (!settingsItem && !settingsError) {
        const { error: insertError } = await supabase
          .from('user_menu_items')
          .insert({
            user_id: userId,
            title: 'Settings',
            path: 'settings',
            order_index: 5,
            page_type: 'content',
            icon_name: 'Settings',
            description: 'Configure your account settings'
          });
        
        if (insertError) {
          console.error(`Error adding settings item for user ${userId}:`, insertError);
        } else {
          console.log(`Added settings item for user ${userId}`);
        }
      }
    }
    
    console.log('Finished adding missing menu items');
  } catch (error) {
    console.error('Error in addMissingMenuItems:', error);
  }
}

// Run the function
addMissingMenuItems();