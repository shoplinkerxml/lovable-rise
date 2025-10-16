import { supabase } from '@/integrations/supabase/client';

/** Get auth headers for API requests */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

export class TemplateService {
  /** Удаление шаблона напрямую через Supabase */
  static async deleteTemplate(id: string): Promise<{ success: boolean }> {
    if (!id) throw new Error("Template ID is required");

    console.log("TemplateService.deleteTemplate called with:", { id });

    // Hard delete - full removal from database
    // @ts-ignore - table not in generated types yet
    const { error: deleteError } = await (supabase as any)
      .from('store_templates')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(deleteError.message || 'Failed to delete template');
    }
    
    return { success: true };
  }
}
