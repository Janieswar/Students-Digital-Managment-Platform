import { useEffect } from "react";
import { useRef, useState } from "react";
import { X, Loader2, UploadCloud, Download } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; errors: any[]; credentials?: any[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setFile(null); setError(null); setResult(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".csv")) setFile(dropped);
    else setError("Please upload a .csv file.");
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(null); }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ created: number; errors: any[]; credentials: any[] }>("/api/users/bulk-import", formData);
      setResult(res);
      if (res.created > 0) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Import failed. Please check your CSV format.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCredentials = () => {
    if (!result?.credentials || result.credentials.length === 0) return;
    const headers = "name,email,password\n";
    const rows = result.credentials.map(c => `${c.name},${c.email},${c.password}`).join("\n");
    const csv = headers + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imported_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csv = "name,email,usn,department_code,semester,section\nRahul Sharma,rahul@cec.edu.in,1CE25AI001,CSE,3,A\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "student_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Bulk Import Students</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-md">
            Upload a CSV file with columns:{" "}
            <code className="bg-blue-100 px-1 rounded text-xs">name, email, usn, department_code, semester, section</code>
          </div>

          {/* Download template */}
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Download CSV Template
          </button>

          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400"}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            {file ? (
              <p className="text-sm font-medium text-slate-700">{file.name} <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span></p>
            ) : (
              <>
                <p className="text-sm text-slate-600">Drag &amp; drop CSV file here, or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">Max file size: 5MB</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleBrowse} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>}

          {result && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-md space-y-3">
              <div className="flex items-center gap-2 font-medium">
                ✅ Successfully imported {result.created} student{result.created !== 1 ? "s" : ""}.
              </div>
              
              {result.credentials && result.credentials.length > 0 && (
                <div className="pt-2 border-t border-green-200">
                  <p className="text-xs mb-2">Download the generated passwords for distribution:</p>
                  <button
                    onClick={downloadCredentials}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Credentials List
                  </button>
                </div>
              )}

              {result.errors?.length > 0 && (
                <div className="pt-2 border-t border-green-200">
                  <div className="text-xs text-red-600 font-medium mb-1">{result.errors.length} row(s) had errors:</div>
                  <div className="max-h-24 overflow-y-auto text-[10px] space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <div key={i} className="text-red-500">Row {err.row}: {err.reason}</div>
                    ))}
                    {result.errors.length > 5 && <div className="text-slate-400">... and {result.errors.length - 5} more</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end p-5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="px-4 py-2 rounded-md text-sm font-medium bg-[#020817] text-white hover:bg-[#020817]/90 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
