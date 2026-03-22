import { useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

export interface Assignment {
  id: string;
  faculty_id: string;
  section_id: string;
  subject: string;
  department_id?: string;
  created_at?: string;
  faculty_name?: string;
  section_name?: string;
  department_name?: string;
}

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async (params: { faculty_id?: string; section_id?: string } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.faculty_id) queryParams.append("faculty_id", params.faculty_id);
      if (params.section_id) queryParams.append("section_id", params.section_id);

      const data = await api.get<{ items: Assignment[] }>(`/api/faculty-assignments?${queryParams.toString()}`);
      setAssignments(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMySections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ items: Assignment[] }>("/api/faculty/me/sections");
      setAssignments(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to fetch my sections");
    } finally {
      setLoading(false);
    }
  }, []);

  const createAssignment = async (data: any) => {
    try {
      return await api.post<Assignment>("/api/faculty-assignments", data);
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to create assignment");
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      await api.delete(`/api/faculty-assignments/${id}`);
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to delete assignment");
    }
  };

  return { 
    assignments, 
    loading, 
    error, 
    fetchAssignments, 
    fetchMySections, 
    createAssignment, 
    deleteAssignment 
  };
}
