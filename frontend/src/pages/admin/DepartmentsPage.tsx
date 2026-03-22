import { useState, useEffect } from "react";
import { LayoutGrid, UserCheck, Users, Plus, ChevronLeft, ArrowRight, MoreHorizontal, Loader2, Building2, GraduationCap } from "lucide-react";
import { useDepartments } from "@/hooks/useDepartments";
import { CreateDepartmentModal } from "./CreateDepartmentModal";
import { EditDepartmentModal } from "./EditDepartmentModal";
import { CreateSectionModal } from "./CreateSectionModal";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";

export function DepartmentsPage() {
  const { 
    departments, 
    loading, 
    fetchDepartments, 
    updateDepartment, 
    deleteDepartment, 
    deleteSection 
  } = useDepartments();
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [showEditDept, setShowEditDept] = useState(false);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<any>(null);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const selectedDept = departments.find(d => d.id === selectedDeptId);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Detail view
  if (selectedDeptId && selectedDept) {
    const sections = selectedDept.sections || [];
    return (
      <div className="space-y-8 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">
            <button
              onClick={() => setSelectedDeptId(null)}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" /> Departments
            </button>
            <span className="opacity-30">/</span>
            <span className="text-blue-600">{selectedDept.code} Management</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{selectedDept.name}</h1>
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">CODE: {selectedDept.code}</span>
                <span className="h-4 w-px bg-slate-200" />
                <span>Primary Academic Division</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeptToEdit(selectedDept);
                  setShowEditDept(true);
                }}
                className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest px-6 h-11"
              >
                <Edit className="w-4 h-4 mr-2" /> Edit Dept
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this department and all its sections?")) {
                    await deleteDepartment(selectedDept.id);
                    setSelectedDeptId(null);
                  }
                }}
                className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-11"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Dept
              </Button>
              <Button
                onClick={() => setShowCreateSection(true)}
                className="rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-widest px-6 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] h-11"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Active Sections", value: sections.length, icon: LayoutGrid, color: "text-blue-600 bg-blue-50" },
            { label: "Faculty Members", value: selectedDept.faculty_count || 0, icon: UserCheck, color: "text-indigo-600 bg-indigo-50" },
            { label: "Enrolled Students", value: selectedDept.student_count || 0, icon: Users, color: "text-emerald-600 bg-emerald-50" },
          ].map((s) => (
            <Card key={s.label} className="border-slate-200 shadow-sm overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-2 rounded-lg group-hover:scale-110 transition-transform", s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sections Management Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Section Inventory</CardTitle>
              <CardDescription className="text-xs font-medium">Manage specific semester breakdowns.</CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100">Identifier</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100">Semester</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100">Academic Target</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100 text-center">Load (Students)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100 text-center">Faculty Assignment</th>
                  <th className="px-6 py-4 text-right border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sections.length > 0 ? sections.map((section, idx) => (
                  <motion.tr 
                    key={section.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">
                          {section.name}
                        </div>
                        <span className="text-sm font-bold text-slate-900 tracking-tighter">Section {section.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {section.semester}{getOrdinal(section.semester)} Semester
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">{section.academic_year || "2025-26"}</td>
                    <td className="px-6 py-4 text-center text-xs font-black text-slate-400">0 / 60</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded italic">Vacant</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete section ${section.name}?`)) {
                            deleteSection(section.id);
                          }
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-1.5 ml-auto group/btn"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">Delete</span>
                      </button>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                        <LayoutGrid className="w-12 h-12" />
                        <p className="font-bold uppercase tracking-widest text-xs">No sections established</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CreateSectionModal
          isOpen={showCreateSection}
          departmentId={selectedDept.id}
          departmentCode={selectedDept.code}
          onClose={() => setShowCreateSection(false)}
          onSuccess={() => fetchDepartments()}
        />
      </div>
    );
  }

  // List view (Grid of Departments)
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            <span>Admin</span> <span>/</span> <span className="text-blue-600">Infrastructure</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Departments</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Configure academic divisions and their respective sections.</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Button
            onClick={() => setShowCreateDept(true)}
            className="rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-widest px-6 shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] h-11"
          >
            <Plus className="w-4 h-4 mr-2" /> New Department
          </Button>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 bg-slate-100" />
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {departments.map((dept) => (
              <motion.div key={dept.id} variants={item}>
                <Card 
                  className="group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 border-slate-200 overflow-hidden cursor-pointer"
                  onClick={() => setSelectedDeptId(dept.id)}
                >
                  <div className="h-1 bg-transparent group-hover:bg-blue-600 w-full transition-colors" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black shadow-lg shadow-slate-900/20 group-hover:scale-110 transition-transform">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-blue-100 text-blue-600 bg-blue-50">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                    <div className="space-y-1">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{dept.code}</h3>
                      <p className="text-sm font-medium text-slate-500 line-clamp-1">{dept.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50">
                      <div className="text-center space-y-1">
                        <div className="text-xs font-black text-slate-900">{dept.sections?.length || 0}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Units</div>
                      </div>
                      <div className="text-center space-y-1 border-x border-slate-50">
                        <div className="text-xs font-black text-slate-900">{dept.faculty_count || 0}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Faculty</div>
                      </div>
                      <div className="text-center space-y-1">
                        <div className="text-xs font-black text-slate-900">{dept.student_count || 0}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Students</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between group">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Division Details</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeptToEdit(dept);
                            setShowEditDept(true);
                          }}
                          className="p-1 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <EditDepartmentModal
        isOpen={showEditDept}
        department={deptToEdit}
        onClose={() => {
          setShowEditDept(false);
          setDeptToEdit(null);
        }}
        onUpdate={updateDepartment}
      />

      <CreateDepartmentModal
        isOpen={showCreateDept}
        onClose={() => setShowCreateDept(false)}
        onSuccess={() => fetchDepartments()}
      />
    </div>
  );
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
