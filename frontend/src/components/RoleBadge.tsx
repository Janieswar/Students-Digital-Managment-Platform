import { Badge } from "@/components/ui/badge";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
  faculty: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
  student: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <Badge className={`${ROLE_COLORS[role] || "bg-gray-500 text-white"} ${className || ""}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
