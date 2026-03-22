import { useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

export interface Section {
  id: string;
  name: string;
  semester: number;
  academic_year: string;
  department_id: string;
}

export function useSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async (departmentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = departmentId ? `/api/sections?department_id=${departmentId}` : "/api/sections";
      const data = await api.get<{ items: Section[] }>(url);
      setSections(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  }, []);

  return { sections, loading, error, fetchSections };
}
