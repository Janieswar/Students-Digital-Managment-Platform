import { useState, useEffect } from "react";
import { Lock, Upload, Plus, Search, Filter, MoreVertical, Trash2, Key, UserCheck, UserX, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { CreateUserModal } from "./CreateUserModal";
import { BulkImportModal } from "./BulkImportModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function UsersPage() {
  const { users, loading, total, fetchUsers, deleteUser, createUser } = useUsers();
  const { departments, fetchDepartments } = useDepartments();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All Roles");
  const [status, setStatus] = useState("All Status");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  useEffect(() => {
    const is_active = status === "Active" ? true : status === "Inactive" ? false : undefined;
    fetchUsers({ search, role, is_active, page, page_size: pageSize });
  }, [fetchUsers, search, role, status, page]);

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (user: any) => {
    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      try { await deleteUser(user.id); fetchUsers({ search, role, page, page_size: pageSize }); }
      catch { alert("Failed to delete user"); }
    }
    setActiveMenu(null);
  };

  const refresh = () => fetchUsers({ search, role, page, page_size: pageSize });

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "admin": return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/20 px-2 py-0 text-[10px] uppercase font-bold tracking-wider">Admin</Badge>;
      case "faculty": return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:bg-indigo-500/20 px-2 py-0 text-[10px] uppercase font-bold tracking-wider">Faculty</Badge>;
      case "student": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 px-2 py-0 text-[10px] uppercase font-bold tracking-wider">Student</Badge>;
      default: return <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{r}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            <span>Admin</span> <span>/</span> <span className="text-blue-600">User Management</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Directory</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage institutional access and roles for all members.</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsBulkOpen(true)}
            className="rounded-xl border-slate-200 bg-white text-slate-900 font-bold text-xs uppercase tracking-widest px-6 shadow-sm hover:shadow-md transition-all h-10"
          >
            <Upload className="w-4 h-4 mr-2" /> Bulk Import
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-widest px-6 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] h-10"
          >
            <Plus className="w-4 h-4 mr-2" /> New User
          </Button>
        </motion.div>
      </div>

      {/* Filters Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm"
      >
        <div className="lg:col-span-6 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="search"
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 font-medium placeholder:text-slate-400"
            placeholder="Search by name, email, or USN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="lg:col-span-3 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <select
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500/20 transition-all text-slate-700 font-bold appearance-none cursor-pointer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>All Roles</option>
            <option value="admin">Administrators</option>
            <option value="faculty">Faculty Members</option>
            <option value="student">Students</option>
          </select>
        </div>
        <div className="lg:col-span-3 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          <select
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500/20 transition-all text-slate-700 font-bold appearance-none cursor-pointer"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </motion.div>

      {/* Table Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100">Identity</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100 italic">Credentials</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100">USN / Emp ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100">Dept</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100 text-center">Permissions</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100 text-right">Delete User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length > 0 ? users.map((u, idx) => {
                const identifier = u.role === "student" ? u.student_profile?.usn : u.role === "faculty" ? u.faculty_profile?.employee_id : "—";
                const dept = (u as any).student_profile?.department?.code || (u as any).faculty_profile?.department?.code || "—";

                return (
                  <motion.tr 
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <span className={cn("text-sm font-bold text-slate-900 tracking-tight", !u.is_active && "text-slate-400")}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{u.email}</td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{identifier || "—"}</td>
                    <td className="px-6 py-4"><span className="text-xs font-black text-blue-600/80 tracking-tighter">{dept}</span></td>
                    <td className="px-6 py-4 text-center">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <div className={cn("w-2 h-2 rounded-full", u.is_active ? "bg-green-500" : "bg-red-400")} />
                        <span className={u.is_active ? "text-green-700" : "text-red-600"}>{u.is_active ? "Live" : "Disabled"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(u)}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-1.5 ml-auto group/btn"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">Delete</span>
                      </button>
                    </td>
                  </motion.tr>
                );
              }) : !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                      <Search className="w-12 h-12" />
                      <p className="font-bold uppercase tracking-widest text-xs">No matching identities found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Pagination View */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          Volume: {total.toLocaleString()} Entries • Current: Page {page}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 bg-white shadow-sm disabled:opacity-30 disabled:grayscale transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                onClick={() => setPage(p)}
                className={cn(
                  "w-8 h-8 rounded-xl text-xs font-black transition-all",
                  p === page 
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                    : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <Button 
            disabled={page >= totalPages} 
            onClick={() => setPage(page + 1)}
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 bg-white shadow-sm disabled:opacity-30 disabled:grayscale transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={refresh} onCreate={createUser} />
      <BulkImportModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} onSuccess={refresh} />
      <ResetPasswordModal
        isOpen={!!resetTarget}
        userId={resetTarget?.id ?? null}
        userName={resetTarget?.name ?? null}
        onClose={() => setResetTarget(null)}
        onSuccess={refresh}
      />
    </div>
  );
}
