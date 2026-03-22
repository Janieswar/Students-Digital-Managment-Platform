import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { CreateAssignmentModal } from "./CreateAssignmentModal";

export function FacultyAssignmentsPage() {
  const { assignments, loading, fetchAssignments, deleteAssignment } = useAssignments();
  const { users, fetchUsers } = useUsers();
  const { departments, fetchDepartments } = useDepartments();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAssignments();
    fetchUsers({ role: "faculty" });
    fetchDepartments();
  }, [fetchAssignments, fetchUsers, fetchDepartments]);

  const handleDelete = async (id: string) => {
    if (confirm("Remove this assignment?")) {
      try { await deleteAssignment(id); fetchAssignments(); }
      catch { alert("Failed to remove assignment."); }
    }
  };

  const getFacultyName = (facultyId: string) => users.find(u => u.id === facultyId)?.name || "—";
  const getDeptCode = (deptId: string) => departments.find(d => d.id === deptId)?.code || "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <span>Admin</span> <span>/</span> <span className="text-slate-900">Faculty Assignments</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Faculty Assignments</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#020817] text-white hover:bg-[#020817]/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">{assignments.length} active assignment{assignments.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr>
              {["Faculty", "Department", "Section", "Subject", "Assigned Since", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.length > 0 ? assignments.map((asgn) => (
              <tr key={asgn.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium border-b border-slate-100">{getFacultyName(asgn.faculty_id)}</td>
                <td className="px-4 py-3 text-sm border-b border-slate-100 text-slate-600">{getDeptCode(asgn.department_id || "")}</td>
                <td className="px-4 py-3 text-sm border-b border-slate-100 text-slate-600">{asgn.section_id}</td>
                <td className="px-4 py-3 text-sm border-b border-slate-100 text-slate-600">{asgn.subject}</td>
                <td className="px-4 py-3 text-sm border-b border-slate-100 text-slate-500">
                  {asgn.created_at ? new Date(asgn.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3 text-sm border-b border-slate-100">
                  <button
                    onClick={() => handleDelete(asgn.id)}
                    className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )) : !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No assignments yet. Click "New Assignment" to add one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchAssignments()}
      />
    </div>
  );
}
