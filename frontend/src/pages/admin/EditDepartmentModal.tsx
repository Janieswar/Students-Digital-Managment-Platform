import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Department } from "@/hooks/useDepartments";

interface EditDepartmentModalProps {
  isOpen: boolean;
  department: Department | null;
  onClose: () => void;
  onUpdate: (id: string, data: any) => Promise<void>;
}

export function EditDepartmentModal({ isOpen, department, onClose, onUpdate }: EditDepartmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    code: "", 
    name: "",
    faculty_count: 0,
    student_count: 0
  });

  useEffect(() => {
    if (isOpen && department) { 
      setForm({ 
        code: department.code, 
        name: department.name,
        faculty_count: department.faculty_count || 0,
        student_count: department.student_count || 0
      }); 
      setError(null); 
    }
  }, [isOpen, department]);

  if (!isOpen || !department) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onUpdate(department.id, { 
        code: form.code.toUpperCase(), 
        name: form.name,
        faculty_count: Number(form.faculty_count),
        student_count: Number(form.student_count)
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Edit Department</h2>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department Code
              </label>
              <input
                required
                maxLength={10}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors uppercase"
                placeholder="e.g., CSE"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department Name
              </label>
              <input
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                placeholder="e.g., Computer Science and Engineering"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Faculty Count
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                  value={form.faculty_count}
                  onChange={(e) => setForm({ ...form, faculty_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Student Count
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                  value={form.student_count}
                  onChange={(e) => setForm({ ...form, student_count: parseInt(e.target.value) || 0 })}
                />
              </div>
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
              className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
