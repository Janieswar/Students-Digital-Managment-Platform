import { useState, useEffect } from "react";
import { X, Loader2, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface ResetPasswordModalProps {
  isOpen: boolean;
  userId: string | null;
  userName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetPasswordModal({ isOpen, userId, userName, onClose, onSuccess }: ResetPasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });

  useEffect(() => {
    if (isOpen) { setForm({ password: "", confirm: "" }); setError(null); setSuccess(false); }
  }, [isOpen]);

  if (!isOpen || !userId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/users/${userId}/reset-password`, { new_password: form.password });
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <h2 className="text-lg font-semibold">Reset Password</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Setting a new password for <span className="font-medium">{userName}</span>.
            </p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-md">✅ Password reset successfully!</div>}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                required
                type="password"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 digit"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                required
                type="password"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end p-5 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-4 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
