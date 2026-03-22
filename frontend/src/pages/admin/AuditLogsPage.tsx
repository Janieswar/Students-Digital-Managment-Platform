import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string | null;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (actionFilter) params.append("action", actionFilter);
      if (resourceFilter) params.append("resource_type", resourceFilter);

      const res = await api.get<{ items: AuditLog[]; total: number }>(`/api/admin/audit-logs?${params}`);
      setLogs(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, resourceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const formatAction = (action: string) => {
    const parts = action.split(".");
    if (parts.length === 2) {
      return (
        <span className="inline-flex gap-1.5 items-center">
          <span className="font-semibold text-slate-700">{parts[0]}</span>
          <span className={cn(
            "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm",
            parts[1] === "create" || parts[1] === "success" ? "bg-green-100 text-green-700" :
              parts[1] === "delete" || parts[1] === "failed" ? "bg-red-100 text-red-700" :
                "bg-blue-100 text-blue-700"
          )}>{parts[1]}</span>
        </span>
      );
    }
    return action;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <span>Admin</span> <span>/</span> <span className="text-slate-900">Audit Logs</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Security &amp; Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Track all administrative, authentication, and data modification events.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            placeholder="Filter by action (e.g. user.create)..."
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500"
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Resources</option>
          <option value="user">User</option>
          <option value="department">Department</option>
          <option value="section">Section</option>
          <option value="assignment">Assignment</option>
          <option value="auth">Authentication</option>
        </select>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>}

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
              {["Timestamp", "Actor", "Action", "Resource", "Details", "IP Address"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-500 border-b border-slate-100 whitespace-nowrap">
                  {log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">{log.actor_name || "System"}</span>
                    {log.actor_role && <span className="text-xs text-slate-500 capitalize">{log.actor_role}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm border-b border-slate-100">
                  {formatAction(log.action)}
                </td>
                <td className="px-4 py-3 text-sm border-b border-slate-100">
                  {log.resource_type ? (
                    <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                      {log.resource_type}:{log.resource_id?.slice(0, 8)}...
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100 max-w-sm truncate" title={log.detail || ""}>
                  {log.detail || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 font-mono border-b border-slate-100">
                  {log.ip_address || "—"}
                </td>
              </tr>
            )) : !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No audit logs found matching the criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Page {page} of {totalPages || 1} &middot; Total {total} events</p>
        <div className="flex gap-1">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Prev
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
