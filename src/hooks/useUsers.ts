import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserService } from "@/lib/user-service";
import { toast } from "sonner";

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

// Add a small delay to prevent loading flicker for fast requests
const withMinimumDelay = async <T>(promise: Promise<T>, minDelayMs = 300): Promise<T> => {
  const [result] = await Promise.all([
    promise,
    new Promise(resolve => setTimeout(resolve, minDelayMs))
  ]);
  return result;
};

// Query Keys
export const userQueries = {
  all: ["users"] as const,
  lists: () => [...userQueries.all, "list"] as const,
  list: (filters: UserFilters, pagination: PaginationParams) => 
    [...userQueries.lists(), filters, pagination] as const,
  details: () => [...userQueries.all, "detail"] as const,
  detail: (id: string) => [...userQueries.details(), id] as const,
};

// Custom Hooks
export function useUsers(filters: UserFilters = {}, pagination: PaginationParams = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: userQueries.list(filters, pagination),
    queryFn: () => withMinimumDelay(UserService.getUsers(filters, pagination)),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: CreateUserData) => UserService.createUser(userData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userQueries.lists() });
      toast.success("User created successfully", {
        description: `${data.name} has been added to the system`,
      });
    },
    onError: (error: Error) => {
      console.error("Create user error:", error);
      toast.error("Failed to create user", {
        description: error.message || "Please try again later",
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) => 
      UserService.updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userQueries.lists() });
      queryClient.invalidateQueries({ queryKey: userQueries.detail(data.id) });
      toast.success("User updated successfully", {
        description: `${data.name}'s information has been updated`,
      });
    },
    onError: (error: Error) => {
      console.error("Update user error:", error);
      toast.error("Failed to update user", {
        description: error.message || "Please try again later",
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => UserService.deleteUser(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userQueries.lists() });
      queryClient.removeQueries({ queryKey: userQueries.detail(data.id) });
      toast.success("User deleted successfully", {
        description: `${data.name} has been removed from the system`,
      });
    },
    onError: (error: Error) => {
      console.error("Delete user error:", error);
      toast.error("Failed to delete user", {
        description: error.message || "Please try again later",
      });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) => 
      UserService.toggleUserStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: userQueries.lists() });
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(userQueries.lists());
      
      // Optimistically update to the new value
      queryClient.setQueryData(userQueries.lists(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users?.map((user: UserProfile) => 
            user.id === id ? { ...user, status } : user
          ) || []
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUsers) {
        queryClient.setQueryData(userQueries.lists(), context.previousUsers);
      }
    },
    onSettled: () => {
      // Invalidate queries regardless of success or failure
      queryClient.invalidateQueries({ queryKey: userQueries.lists() });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userQueries.detail(data.id) });
      
      const action = data.status === "active" ? "activated" : "deactivated";
      toast.success(`User ${action} successfully`, {
        description: `${data.name} has been ${action}`,
      });
    },
  });
}

// Helper hook to prefetch user data
export function usePrefetchUser() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: userQueries.detail(id),
      queryFn: () => UserService.getUser(id),
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
  };
}

// Prefetch list of users
export function usePrefetchUsers(filters: UserFilters = {}, pagination: PaginationParams = { page: 1, limit: 10 }) {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: userQueries.list(filters, pagination),
      queryFn: () => withMinimumDelay(UserService.getUsers(filters, pagination)),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}