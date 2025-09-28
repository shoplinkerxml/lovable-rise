// This script adds tariff, reports, and settings menu items for all users
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addMissingMenuItems() {
  try {
    console.log('Adding missing menu items for all users...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');
    
    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }
    
    console.log(`Found ${users.length} users`);
    
    // For each user, check and add missing menu items
    for (const user of users) {
      const userId = user.id;
      console.log(`Processing user ${userId}`);
      
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
            title: 'menu_pricing', // Changed from 'Тарифні плани' to 'menu_pricing'
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