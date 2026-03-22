import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "faculty" | "student";
  is_active: boolean;
  student_profile?: {
    usn: string;
    department_id: string;
    section_id: string;
    current_semester: number;
  };
  faculty_profile?: {
    employee_id: string;
    department_id: string;
  };
}

interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async (params: {
    role?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.role && params.role !== "All Roles") queryParams.append("role", params.role.toLowerCase());
      if (params.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
      if (params.search) queryParams.append("search", params.search);
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.page_size) queryParams.append("page_size", params.page_size.toString());

      const data = await api.get<UserListResponse>(`/api/users?${queryParams.toString()}`);
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = async (userData: any) => {
    try {
      return await api.post<User>("/api/users", userData);
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to create user");
    }
  };

  const updateUser = async (id: string, userData: any) => {
    try {
      return await api.patch<User>(`/api/users/${id}`, userData);
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to update user");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/api/users/${id}`);
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to delete user");
    }
  };

  return {
    users,
    loading,
    error,
    total,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
}
