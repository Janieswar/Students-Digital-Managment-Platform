import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, GraduationCap } from "lucide-react";

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#020817] text-white border-b border-slate-700/50 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar} 
          className="md:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">CEC Student</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-sm text-slate-300 font-medium">{user.name}</span>
          <RoleBadge role={user.role} className="text-[10px] px-2 py-0 h-4" />
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shadow-inner">
          {getInitials(user.name)}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={logout}
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
