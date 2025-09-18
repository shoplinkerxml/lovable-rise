// File: src/services/UserService.ts (клиентская часть)
import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";

/**
 * Helper function to get the appropriate authentication headers
 * - Если пользователь авторизован, используем Bearer token
 * - Для операций администратора, используем только Bearer token
 */
async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (session.data.session?.access_token) {
    // For authenticated operations, use only Bearer token
    headers["Authorization"] = `Bearer ${session.data.session.access_token}`;
  } else {
    // For unauthenticated requests to Edge Functions, don't send apikey
    // Edge Functions expect only Bearer tokens for authenticated operations
    console.warn("No valid session found for Edge Function request");
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
    // Validate session before operation
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new ApiError("Invalid session: " + (sessionValidation.error || "Session expired"), 401);
    }

    console.log("UserService.getUsers called with:", { filters, pagination });

    // Подготавливаем фильтры
    const requestFilters: Record<string, any> = {};
    if (filters.search) requestFilters.name = filters.search;
    if (filters.status && filters.status !== "all") requestFilters.status = filters.status;
    if (filters.role && filters.role !== "all") requestFilters.role = filters.role;

    // Подготавливаем данные для запроса
    const requestBody = {
      action: "list" as const,
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit,
      filters: requestFilters
    };

    const { data: responseData, error } = await supabase.functions.invoke("users", {
      body: requestBody,
    });

    console.log("UserService.getUsers response:", { responseData, error });

    if (error) {
      throw new ApiError(error.message || "Failed to fetch users", error.status || 500);
    }

    // Преобразуем ответ в ожидаемый формат
    return {
      users: responseData.users || [],
      total: responseData.users?.length || 0,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  /** Создание пользователя */
  static async createUser(userData: CreateUserData): Promise<UserProfile> {
    if (!userData.email || !userData.password || !userData.name) {
      throw new ApiError("Missing required fields: email, password, or name", 400);
    }

    // Validate session before operation
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new ApiError("Invalid session: " + (sessionValidation.error || "Session expired"), 401);
    }

    console.log("UserService.createUser called with:", userData);

    const { data: responseData, error } = await supabase.functions.invoke("users", {
      body: {
        action: "create",
        ...userData,
        email_confirm: true, // Skip email confirmation for admin-created users
      },
    });

    console.log("UserService.createUser response:", { responseData, error });

    if (error) {
      throw new ApiError(error.message || "Failed to create user", error.status || 500);
    }

    if (!responseData || !responseData.user) {
      throw new ApiError("Invalid response from server", 500);
    }

    return responseData.user;
  }

  /** Обновление пользователя */
  static async updateUser(id: string, data: UpdateUserData): Promise<UserProfile> {
    if (!id) throw new ApiError("User ID is required", 400);
    
    // Validate session before operation
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new ApiError("Invalid session: " + (sessionValidation.error || "Session expired"), 401);
    }

    // Убираем undefined, но оставляем null
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanData).length === 0) {
      throw new ApiError("No fields provided for update", 400);
    }

    console.log("UserService.updateUser called with:", { id, cleanData });

    const { data: responseData, error } = await supabase.functions.invoke("users", {
      body: {
        action: "update",
        id,
        ...cleanData,
      },
    });

    console.log("UserService.updateUser response:", { responseData, error });

    if (error) {
      throw new ApiError(error.message || "Failed to update user", error.status || 500);
    }

    if (!responseData || !responseData.user) {
      throw new ApiError("Invalid response from server", 500);
    }

    return responseData.user;
  }

  /** Получение одного пользователя */
  static async getUser(id: string): Promise<UserProfile> {
    if (!id) throw new ApiError("User ID is required", 400);

    // Validate session before operation
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new ApiError("Invalid session: " + (sessionValidation.error || "Session expired"), 401);
    }

    console.log("UserService.getUser called with:", { id });

    const { data: responseData, error } = await supabase.functions.invoke("users", {
      body: {
        action: "get",
        id,
      },
    });

    console.log("UserService.getUser response:", { responseData, error });

    if (error) {
      throw new ApiError(error.message || "Failed to get user", error.status || 500);
    }

    if (!responseData || !responseData.user) {
      throw new ApiError("User not found", 404);
    }

    return responseData.user;
  }

  /** Удаление пользователя */
  static async deleteUser(id: string): Promise<UserProfile> {
    if (!id) throw new ApiError("User ID is required", 400);

    // Validate session before operation
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new ApiError("Invalid session: " + (sessionValidation.error || "Session expired"), 401);
    }

    console.log("UserService.deleteUser called with:", { id });

    const { data: responseData, error } = await supabase.functions.invoke("users", {
      body: {
        action: "delete",
        id,
      },
    });

    console.log("UserService.deleteUser response:", { responseData, error });

    if (error) {
      throw new ApiError(error.message || "Failed to delete user", error.status || 500);
    }

    if (!responseData || !responseData.user) {
      throw new ApiError("Invalid response from server", 500);
    }

    return responseData.user;
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