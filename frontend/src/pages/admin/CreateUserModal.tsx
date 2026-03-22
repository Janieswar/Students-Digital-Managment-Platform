import { useState, useEffect } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDepartments } from "@/hooks/useDepartments";
import { useSections } from "@/hooks/useSections";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onCreate: (data: any) => Promise<any>;
}

export function CreateUserModal({ isOpen, onClose, onSuccess, onCreate }: CreateUserModalProps) {
  const { departments, fetchDepartments } = useDepartments();
  const { sections, fetchSections } = useSections();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "student" as "admin" | "faculty" | "student",
    usn: "",
    employee_id: "",
    department_id: "",
    section_id: "",
    current_semester: 1,
    academic_year: "2025-26"
  });

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen, fetchDepartments]);

  useEffect(() => {
    if (formData.department_id) {
      fetchSections(formData.department_id);
    }
  }, [formData.department_id, fetchSections]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean up payload based on role
      const payload: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role
      };

      if (formData.role === "student") {
        payload.usn = formData.usn;
        payload.department_id = formData.department_id;
        payload.section_id = formData.section_id;
        payload.current_semester = formData.current_semester;
        payload.academic_year = formData.academic_year;
      } else if (formData.role === "faculty") {
        payload.employee_id = formData.employee_id;
        payload.department_id = formData.department_id;
      }

      await onCreate(payload);
      onSuccess();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Create New User</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Add a new member to the platform</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
              <Input 
                required 
                placeholder="John Doe" 
                className="h-10 text-sm font-medium border-slate-100 bg-slate-50/50"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Account Role</Label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-slate-100 bg-slate-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</Label>
            <Input 
              required 
              type="email" 
              placeholder="john@example.com" 
              className="h-10 text-sm font-medium border-slate-100 bg-slate-50/50"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Initial Password</Label>
            <Input 
              required 
              type="password" 
              placeholder="••••••••" 
              className="h-10 text-sm font-medium border-slate-100 bg-slate-50/50"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {formData.role !== "admin" && (
            <div className="pt-4 border-t border-slate-50 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {formData.role === "student" ? "USN" : "Employee ID"}
                  </Label>
                  <Input 
                    required 
                    placeholder={formData.role === "student" ? "1CE25AI001" : "EMP001"} 
                    className="h-10 text-sm font-medium border-slate-100 bg-slate-50/50"
                    value={formData.role === "student" ? formData.usn : formData.employee_id}
                    onChange={e => setFormData({ 
                      ...formData, 
                      [formData.role === "student" ? "usn" : "employee_id"]: e.target.value 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</Label>
                  <select 
                    required
                    className="w-full h-10 px-3 rounded-md border border-slate-100 bg-slate-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.department_id}
                    onChange={e => setFormData({ ...formData, department_id: e.target.value, section_id: "" })}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.role === "student" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Section</Label>
                    <select 
                      required
                      className="w-full h-10 px-3 rounded-md border border-slate-100 bg-slate-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={formData.section_id}
                      onChange={e => setFormData({ ...formData, section_id: e.target.value })}
                      disabled={!formData.department_id}
                    >
                      <option value="">Select Section</option>
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.semester} Sem)</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semester</Label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={8} 
                      className="h-10 text-sm font-medium border-slate-100 bg-slate-50/50"
                      value={formData.current_semester}
                      onChange={e => setFormData({ ...formData, current_semester: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 h-11 font-bold uppercase tracking-widest text-[10px] border-slate-200"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-[2] h-11 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
