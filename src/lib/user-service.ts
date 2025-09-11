import { supabase } from "@/integrations/supabase/client";

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
      const response = await supabase.functions.invoke("users", {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          role: "user",
          ...filters,
          ...pagination,
        }),
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
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
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
      const response = await supabase.functions.invoke("users", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          id,
          ...data,
        }),
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
      const response = await supabase.functions.invoke("users", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
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