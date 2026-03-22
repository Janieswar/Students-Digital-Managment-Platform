import { useAuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  return useAuthContext();
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  return { user, loading, isAuthenticated: !!user };
}

export function useRole() {
  const { user } = useAuth();
  return {
    isAdmin: user?.role === "admin",
    isFaculty: user?.role === "faculty",
    isStudent: user?.role === "student",
    role: user?.role,
  };
}
