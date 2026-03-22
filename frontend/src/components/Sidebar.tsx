import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  UserCheck, 
  ClipboardList, 
  FileText, 
  Megaphone, 
  IndianRupee,
  MessageSquare,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  disabled?: boolean;
}

interface NavGroup {
  title: string;
  roles: string[];
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Administration",
    roles: ["admin"],
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Departments", path: "/admin/departments", icon: Building2 },
      { label: "Faculty Assignments", path: "/admin/assignments", icon: UserCheck },
      { label: "Audit Logs", path: "/admin/audit-logs", icon: ClipboardList },
    ]

  },
  {
    title: "Faculty",
    roles: ["faculty"],
    items: [
      { label: "My Courses", path: "/faculty/dashboard", icon: LayoutDashboard },
      { label: "Gradebook", path: "/faculty/dashboard", icon: FileText },
      { label: "Attendance", path: "/faculty/dashboard", icon: ClipboardList },
      { label: "Announcements", path: "/faculty/dashboard", icon: Megaphone },
      { label: "Messaging", path: "/faculty/dashboard", icon: MessageSquare },
      { label: "Profile", path: "/profile", icon: UserCheck },
    ]
  },
  {
    title: "Student",
    roles: ["student"],
    items: [
      { label: "Dashboard", path: "/student/dashboard", icon: LayoutDashboard },
      { label: "Attendance", path: "#", icon: ClipboardList, disabled: true },
      { label: "Marks", path: "#", icon: FileText, disabled: true },
      { label: "Fees", path: "#", icon: IndianRupee, disabled: true },
    ]
  }
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();

  if (!user) return null;

  const visibleGroups = NAV_GROUPS.filter(group => group.roles.includes(user.role));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed top-14 left-0 bottom-0 w-64 bg-[#020817] text-white border-r border-slate-700/50 z-40 transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="py-4 overflow-y-auto h-full scrollbar-hidden">
          {visibleGroups.map((group) => (
            <div key={group.title} className="px-3 mb-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-3">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    onClick={() => { if (isOpen) onClose(); }}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 group relative",
                        item.disabled 
                          ? "opacity-30 cursor-not-allowed text-slate-500" 
                          : isActive 
                            ? "bg-blue-600/20 text-blue-400 font-semibold shadow-[0_0_20px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/20" 
                            : "text-slate-400 hover:bg-white/5 hover:text-white hover:pl-4"
                      )
                    }
                    title={item.disabled ? "Feature coming soon in Phase 2" : undefined}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.disabled && (
                      <span className="text-[8px] bg-slate-800/80 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-700 font-bold uppercase tracking-tighter">
                        Soon
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-auto px-3 pt-4 border-t border-slate-700/50">
            <div className="px-3 py-4 bg-gradient-to-br from-white/5 to-transparent rounded-xl border border-white/5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                  <span className="text-xs font-bold text-blue-400">{user.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono uppercase tracking-wider">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
