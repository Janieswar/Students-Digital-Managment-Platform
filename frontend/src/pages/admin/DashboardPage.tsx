import { useEffect } from "react";
import {
  Users,
  UserCheck,
  Building2,
  ShieldCheck,
  UserPlus,
  KeyRound
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";

export function AdminDashboard() {
  const { total: totalUsers, fetchUsers } = useUsers();
  const { departments, fetchDepartments } = useDepartments();

  useEffect(() => {
    fetchUsers({ page: 1, page_size: 1 });
    fetchDepartments();
  }, [fetchUsers, fetchDepartments]);

  const stats = [
    { label: "Total Students", value: "1,247", icon: Users, color: "text-green-600", bg: "bg-green-50", trend: "+23 this semester", trendColor: "text-green-600" },
    { label: "Total Faculty", value: "87", icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50", trend: "5 new this year", trendColor: "text-blue-600" },
    { label: "Departments", value: String(departments.length || 8), icon: Building2, color: "text-purple-600", bg: "bg-purple-50", trend: "42 active sections", trendColor: "text-slate-500" },
    { label: "Active Users", value: String(totalUsers || "1,329"), icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50", trend: "5 inactive accounts", trendColor: "text-red-500" },
  ];

  const activities = [
    { user: "Admin", action: "imported 48 students via CSV", time: "2 hours ago", icon: UserPlus, iconBg: "bg-green-100", iconColor: "text-green-600" },
    { user: "Admin", action: "assigned Dr. Ramesh to CSE-3A (Data Structures)", time: "3 hours ago", icon: UserCheck, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { user: "Admin", action: "created section 5A under CSE department", time: "5 hours ago", icon: Building2, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
    { user: "Admin", action: "reset password for priya@cec.edu.in", time: "1 day ago", icon: KeyRound, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <span>Admin</span> <span>/</span> <span className="text-slate-900">Dashboard</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            <div className={`text-xs mt-1 ${stat.trendColor}`}>{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {activities.map((activity, idx) => (
            <div key={idx} className="flex items-center gap-4 py-2">
              <div className={`w-8 h-8 rounded-full ${activity.iconBg} flex items-center justify-center`}>
                <activity.icon className={`w-4 h-4 ${activity.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span> {activity.action}
                </p>
                <p className="text-xs text-slate-400">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
