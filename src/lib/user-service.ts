// File: src/services/UserService.ts (клиентская часть)
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to get the appropriate authentication headers
 * - Если пользователь авторизован, используем Bearer token
 * - Если нет — используем анонимный apikey
 */
async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = {};

  if (session.data.session) {
    headers["Authorization"] = `Bearer ${session.data.session.access_token}`;
  } else {
    // ВАЖНО: не храните service_role ключ на клиенте
    headers["apikey"] =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoem5xemF1bXNuamtybnRhaW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTM2MjMsImV4cCI6MjA3MjI4OTYyM30.cwynTMjqTpDbXRlyMsbp6lfLLAOqE00X-ybeLU0pzE0";
  }

  console.log("getAuthHeaders called, returning headers:", headers);
  return headers;
}

/** Интерфейсы данных */
export interface UserProfile {
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

export interface UserFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  role?: "user" | "admin" | "manager" | "all";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface UsersResponse {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: "user";
  notify_by_email: boolean;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  status?: "active" | "inactive";
}

/** Класс для работы с пользователями */
export class UserService {
  /** Получение списка пользователей */
  static async getUsers(
    filters: UserFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<UsersResponse> {
    const queryParams = new URLSearchParams();

    if (filters.search) queryParams.append("search", filters.search);
    if (filters.status && filters.status !== "all") queryParams.append("status", filters.status);
    if (filters.role && filters.role !== "all") queryParams.append("role", filters.role);
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
    if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

    queryParams.append("page", pagination.page.toString());
    queryParams.append("limit", pagination.limit.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `users?${queryString}` : "users";

    const response = await supabase.functions.invoke(url, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    if (response.error) throw new ApiError(response.error.message || "Failed to fetch users");
    return response.data;
  }

  /** Создание пользователя */
  static async createUser(userData: CreateUserData): Promise<UserProfile> {
    if (!userData.email || !userData.password || !userData.name) {
      throw new ApiError("Missing required fields: email, password, or name", 400);
    }

    const response = await supabase.functions.invoke("users", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        ...userData,
        email_confirm: true, // Skip email confirmation for admin-created users
      }),
    });

    if (response.error) throw new ApiError(response.error.message || "Failed to create user");
    return response.data.user;
  }

  /** Обновление пользователя */
  static async updateUser(id: string, data: UpdateUserData): Promise<UserProfile> {
    if (!id) throw new ApiError("User ID is required", 400);
    if (!data || Object.keys(data).length === 0) throw new ApiError("No fields provided for update", 400);

    // Filter out undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    // Check if we still have data after filtering
    if (Object.keys(cleanData).length === 0) throw new ApiError("No valid fields provided for update", 400);

    // Log the request for debugging
    console.log("UserService.updateUser called with:", { id, cleanData });

    const response = await supabase.functions.invoke(`users/${id}`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(cleanData), // Pass JSON string, not object
    });

    console.log("UserService.updateUser response:", response);

    if (response.error) throw new ApiError(response.error.message || "Failed to update user");
    return response.data.user;
  }

  /** Удаление пользователя */
  static async deleteUser(id: string): Promise<UserProfile> {
    if (!id) throw new ApiError("User ID is required", 400);

    const response = await supabase.functions.invoke(`users/${id}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });

    if (response.error) throw new ApiError(response.error.message || "Failed to delete user");
    return response.data.user;
  }

  /** Переключение статуса пользователя */
  static async toggleUserStatus(id: string, status: "active" | "inactive"): Promise<UserProfile> {
    // Validate parameters
    if (!id) throw new ApiError("User ID is required", 400);
    if (status === undefined || status === null) throw new ApiError("Status is required", 400);
    if (!["active", "inactive"].includes(status)) throw new ApiError("Invalid status value", 400);

    console.log("UserService.toggleUserStatus called with:", { id, status });

    return this.updateUser(id, { status });
  }
}

/** Класс для ошибок API */
export class ApiError extends Error {
  constructor(message: string, public status: number = 500, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Обработка ошибок */
export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return new ApiError(error.message, 500);
    }
    if ("error" in error && typeof error.error === "string") {
      return new ApiError(error.error, 500);
    }
  }

  return new ApiError("An unexpected error occurred", 500);
}
