import { useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

export interface Section {
  id: string;
  name: string;
  semester: number;
  academic_year?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  faculty_count: number;
  student_count: number;
  sections?: Section[];
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ items: Department[] }>("/api/departments");
      setDepartments(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  }, []);

  const createDepartment = async (data: any) => {
    try {
      await api.post("/api/departments", data);
      await fetchDepartments();
    } catch (err) {
      throw err;
    }
  };

  const updateDepartment = async (id: string, data: any) => {
    try {
      await api.patch(`/api/departments/${id}`, data);
      await fetchDepartments();
    } catch (err) {
      throw err;
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      await api.delete(`/api/departments/${id}`);
      await fetchDepartments();
    } catch (err) {
      throw err;
    }
  };

  const deleteSection = async (id: string) => {
    try {
      await api.delete(`/api/sections/${id}`);
      await fetchDepartments();
    } catch (err) {
      throw err;
    }
  };

  return { 
    departments, 
    loading, 
    error, 
    fetchDepartments, 
    createDepartment,
    updateDepartment, 
    deleteDepartment, 
    deleteSection 
  };
}
