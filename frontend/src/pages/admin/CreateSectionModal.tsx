import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface CreateSectionModalProps {
  isOpen: boolean;
  departmentId: string;
  departmentCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSectionModal({ isOpen, departmentId, departmentCode, onClose, onSuccess }: CreateSectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", semester: "1", academic_year: "2025-26" });

  useEffect(() => {
    if (isOpen) { setForm({ name: "", semester: "1", academic_year: "2025-26" }); setError(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/sections", {
        name: form.name.toUpperCase(),
        semester: parseInt(form.semester),
        academic_year: form.academic_year,
        department_id: departmentId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create section");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Add Section to {departmentCode}</h2>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Section Name</label>
              <input
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors uppercase"
                placeholder="e.g., A, B, C"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <select
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
              >
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
              <input
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                placeholder="2025-26"
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
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
              Add Section
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
