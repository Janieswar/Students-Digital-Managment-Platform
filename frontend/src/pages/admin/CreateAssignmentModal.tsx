import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useDepartments } from "@/hooks/useDepartments";
import { useSections } from "@/hooks/useSections";
import { useUsers } from "@/hooks/useUsers";

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAssignmentModal({ isOpen, onClose, onSuccess }: CreateAssignmentModalProps) {
  const { departments, fetchDepartments } = useDepartments();
  const { sections, fetchSections } = useSections();
  const { users, fetchUsers } = useUsers();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    faculty_id: "",
    department_id: "",
    section_id: "",
    subject: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchUsers({ role: "faculty" });
      setForm({ faculty_id: "", department_id: "", section_id: "", subject: "" });
      setError(null);
    }
  }, [isOpen, fetchDepartments, fetchUsers]);

  useEffect(() => {
    if (form.department_id) fetchSections(form.department_id);
  }, [form.department_id, fetchSections]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/faculty-assignments", {
        faculty_id: form.faculty_id,
        section_id: form.section_id,
        subject: form.subject,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create assignment");
    } finally {
      setLoading(false);
    }
  };

  const facultyUsers = users.filter((u) => u.role === "faculty");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold">New Faculty Assignment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Faculty Member</label>
              <select
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                value={form.faculty_id}
                onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
              >
                <option value="">Select faculty...</option>
                {facultyUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value, section_id: "" })}
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <select
                required
                disabled={!form.department_id}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors disabled:opacity-50"
                value={form.section_id}
                onChange={(e) => setForm({ ...form, section_id: e.target.value })}
              >
                <option value="">Select section...</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.semester}{getOrdinalSuffix(s.semester)} Sem — {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <input
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                placeholder="e.g., Data Structures"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end p-5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md text-sm font-medium bg-[#020817] text-white hover:bg-[#020817]/90 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
