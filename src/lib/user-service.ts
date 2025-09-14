import { supabase } from "@/integrations/supabase/client";

// Helper function to get the appropriate authentication header
async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = { 
    "Content-Type": "application/json"
  };
  
  if (session.data.session) {
    // Use Authorization header for authenticated users
    headers["Authorization"] = `Bearer ${session.data.session.access_token}`;
  } else {
    // Use apikey header for anonymous requests
    // Access the anon key from the Supabase client configuration
    headers["apikey"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoem5xemF1bXNuamtybnRhaW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTM2MjMsImV4cCI6MjA3MjI4OTYyM30.cwynTMjqTpDbXRlyMsbp6lfLLAOqE00X-ybeLU0pzE0";
  }
  
  return headers;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: "user" | "admin" | "manager";
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

interface UserFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  role?: "user" | "admin" | "manager" | "all";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface UsersResponse {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
}

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: "user";
  notify_by_email: boolean;
}

interface UpdateUserData {
  name?: string;
  phone?: string;
  status?: "active" | "inactive";
}

export class UserService {
  static async getUsers(
    filters: UserFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<UsersResponse> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add filters
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
      // Handle role filter properly - only add if explicitly set
      if (filters.role && filters.role !== 'all') {
        queryParams.append('role', filters.role);
      } else if (filters.role === 'all') {
        queryParams.append('role', 'all');
      }
      // If filters.role is undefined or null, we don't add the role parameter at all
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      
      // Add pagination
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());
      
      // Convert query parameters to query string
      const queryString = queryParams.toString();
      const url = queryString ? `?${queryString}` : '';

      const response = await supabase.functions.invoke("users" + url, {
        method: "GET",
        headers: await getAuthHeaders()
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch users");
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to fetch users");
    }
  }

  static async createUser(userData: CreateUserData): Promise<UserProfile> {
    try {
      const response = await supabase.functions.invoke("users", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          ...userData,
          email_confirm: true, // Skip email confirmation for admin-created users
        }),
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create user");
      }

      return response.data.user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create user");
    }
  }

  static async updateUser(id: string, data: UpdateUserData): Promise<UserProfile> {
    try {
      const response = await supabase.functions.invoke(`users/${id}`, {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to update user");
      }

      return response.data.user;
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to update user");
    }
  }

  static async deleteUser(id: string): Promise<UserProfile> {
    try {
      const response = await supabase.functions.invoke(`users/${id}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ id }),
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete user");
      }

      return response.data.user;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to delete user");
    }
  }

  static async toggleUserStatus(id: string, status: "active" | "inactive"): Promise<UserProfile> {
    return this.updateUser(id, { status });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  
  if (error && typeof error === "object" && "message" in error) {
    return new ApiError(error.message as string, 500);
  }
  
  return new ApiError("An unexpected error occurred", 500);
}