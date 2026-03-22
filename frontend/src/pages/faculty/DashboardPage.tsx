import { useState, useMemo } from "react";
import { 
  ClipboardList, 
  FileText, 
  Megaphone, 
  Users, 
  BookOpen, 
  GraduationCap, 
  ArrowRight,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  MoreVertical,
  CheckCircle2,
  Lock,
  Download,
  Search,
  MessageSquare,
  Calendar,
  Filter,
  FileDown,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useFacultyState } from "./useFacultyState";
import { GradeEntry, Announcement, CourseMaterial } from "./faculty-mock-data";

export function FacultyDashboard() {
  const { user } = useAuth();
  const { 
    sections, 
    announcements, 
    materials, 
    grades,
    addGrade,
    updateGrade,
    deleteGrade,
    updateAttendance,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addMaterial,
    deleteMaterial
  } = useFacultyState();

  const [activeTab, setActiveTab] = useState("overview");
  const profile = user?.faculty_profile;

  // Grade Edit State
  const [editingGrade, setEditingGrade] = useState<GradeEntry | null>(null);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [isAddGradeMode, setIsAddGradeMode] = useState(false);

  // Announcement State
  const [isAnnDialogOpen, setIsAnnDialogOpen] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', content: '' });

  // Attendance State
  const [selectedSection, setSelectedSection] = useState(sections[0]?.id);
  const currentSectionForAttendance = useMemo(() => 
    sections.find(s => s.id === selectedSection), 
    [sections, selectedSection]
  );

  const stats = useMemo(() => ({
    totalStudents: sections.reduce((acc, s) => acc + s.students.length, 0),
    atRiskStudents: sections.reduce((acc, s) => 
      acc + s.students.filter(st => st.at_risk).length, 0
    ),
    pendingGrading: 12, // Dummy count
    upcomingClasses: 3,
  }), [sections]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-12 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 p-1 mt-2"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-sm">Faculty</span> <span>/</span> <span className="text-blue-600">Operations Control</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0] || "Professor"}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-blue-500" /> {profile?.department?.name || "Computer Science Engineering"}</span>
            <span className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> Spring Semester 2026</span>
            <span className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="flex items-center gap-1.5 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">STAFF ID: {profile?.employee_id || "CEC-FAC-204"}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest px-6 shadow-sm">
            <Download className="w-4 h-4 mr-2" /> Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest px-6 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" /> Quick Action
          </Button>
        </div>
      </motion.div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            {["overview", "gradebook", "attendance", "content", "communications"].map((tab) => (
              <TabsTrigger 
                key={tab}
                value={tab} 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 pb-4 text-sm font-bold uppercase tracking-widest text-slate-400 data-[state=active]:text-blue-600 transition-all"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-4 text-slate-400">
            <Search className="w-4 h-4 cursor-pointer hover:text-slate-600" />
            <Filter className="w-4 h-4 cursor-pointer hover:text-slate-600" />
          </div>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8 outline-none">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-50", trend: "Across 3 sections" },
              { label: "At-Risk Flag", value: stats.atRiskStudents, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", trend: "Attendance < 75%" },
              { label: "Pending Grading", value: stats.pendingGrading, icon: FileText, color: "text-amber-600", bg: "bg-amber-50", trend: "Assignments & Quiz" },
              { label: "Today's Load", value: stats.upcomingClasses, icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50", trend: "Live sessions" },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.trend}</span>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today's Schedule */}
            <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-white flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" /> Today's Sessions
                  </CardTitle>
                  <CardDescription>Scheduled lectures for March 15, 2026</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 font-bold text-xs uppercase tracking-tight">View Full Timetable</Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {sections.map((section, idx) => (
                    <div key={section.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-5">
                        <div className="w-16 flex flex-col items-center justify-center">
                          <span className="text-xs font-black text-blue-600 leading-tight">0{9 + idx * 2}:00</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">AM</span>
                        </div>
                        <div className="h-10 w-px bg-slate-200" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{section.subject}</p>
                          <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                            <span>{section.department_code} — {section.semester}th Sem {section.name}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {section.room}</span>
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-bold text-[10px] uppercase tracking-widest">
                        Start Session
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* At-Risk Students */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" /> At-Risk Students
                  </CardTitle>
                  <CardDescription>Below 75% Attendance</CardDescription>
                </div>
                <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-rose-100 text-[10px] font-black">{stats.atRiskStudents}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {sections[0].students.filter(s => s.at_risk).map(student => (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{student.name}</p>
                        <p className="text-[10px] font-medium text-slate-500">{student.usn}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-rose-600">{student.attendance}%</p>
                      <p className="text-[9px] font-bold text-rose-400 uppercase">Attendance</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full text-xs font-bold text-slate-600 border-slate-200 mt-2">
                   Send Warning Notifications
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gradebook Tab */}
        <TabsContent value="gradebook" className="outline-none">
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">Marks Management</CardTitle>
                  <CardDescription>Enter and edit IA marks for assigned sections</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                        setIsAddGradeMode(true);
                        setEditingGrade(null);
                        setIsGradeDialogOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase"
                  >
                    <Plus className="w-4 h-4 mr-2" /> New Entry
                  </Button>
                  <Button variant="outline" className="border-slate-200 text-slate-600 font-bold text-xs uppercase">
                    <FileDown className="w-4 h-4 mr-2" /> Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">USN</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Notes</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{grade.studentName}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{grade.usn}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-blue-600">{grade.marks}</span>
                          <span className="text-[10px] font-bold text-slate-400"> / {grade.maxMarks}</span>
                        </td>
                        <td className="px-6 py-4">
                          {grade.isLocked ? (
                            <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[10px] font-black rounded-full px-3">
                              <Lock className="w-3 h-3 mr-1" /> Locked by Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-black rounded-full px-3">
                              Editable
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate">
                          <p className="text-xs italic text-slate-400 flex items-center gap-1.5">
                             {grade.isLocked ? "" : <Lock className="w-2.5 h-2.5" />} {grade.internalNotes}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-blue-600"
                              disabled={grade.isLocked}
                              onClick={() => {
                                setEditingGrade(grade);
                                setIsAddGradeMode(false);
                                setIsGradeDialogOpen(true);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-rose-600"
                              disabled={grade.isLocked}
                              onClick={() => deleteGrade(grade.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-1 space-y-4">
                <Card className="border-slate-200">
                  <CardHeader className="p-4 bg-slate-50">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Active Sections</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    {sections.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedSection(s.id)}
                        className={`w-full text-left p-4 rounded-lg flex items-center justify-between transition-all border-2 mb-2 ${selectedSection === s.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent hover:bg-slate-50 text-slate-600'}`}
                      >
                         <div>
                            <p className="text-sm font-bold">{s.subject}</p>
                            <p className="text-[10px] font-bold uppercase text-slate-400">{s.department_code} {s.semester} Sem {s.name}</p>
                         </div>
                         {selectedSection === s.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </button>
                    ))}
                  </CardContent>
                </Card>
                <Card className="bg-blue-600 text-white p-6 border-none shadow-xl shadow-blue-600/20">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-4 opacity-80">Quick Action</h4>
                    <p className="font-bold text-lg mb-6 leading-tight">Generate QR for automated attendance?</p>
                    <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black text-xs uppercase">Generate Code</Button>
                </Card>
              <div className="mt-8">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 px-1">Recent Sessions</p>
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">CS101-A (Theory)</p>
                          <p className="text-[10px] font-bold text-slate-400">2026-03-1{i} | 09:30 AM</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-500/5 font-black text-[9px] uppercase">
                        94%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
             </div>

             <Card className="lg:col-span-3 border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                   <div>
                      <CardTitle className="text-xl font-black text-slate-900">Mark Attendance</CardTitle>
                      <CardDescription>{currentSectionForAttendance?.subject} — {currentSectionForAttendance?.students.length} Students</CardDescription>
                   </div>
                   <div className="flex gap-2">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest">Submit Session</Button>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="divide-y divide-slate-100">
                      {currentSectionForAttendance?.students.map(student => (
                         <div key={student.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${student.at_risk ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {student.name.charAt(0)}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-900">{student.name}</p>
                                  <p className="text-xs font-medium text-slate-500 font-mono">{student.usn} | <span className={`${student.at_risk ? 'text-rose-600 font-bold' : ''}`}>{student.attendance}% Rate</span></p>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => updateAttendance(selectedSection, student.id, 'present')}
                                  className="h-8 px-4 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-xs font-bold uppercase"
                               >P</Button>
                               <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => updateAttendance(selectedSection, student.id, 'late')}
                                  className="h-8 px-4 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-xs font-bold uppercase"
                               >L</Button>
                               <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => updateAttendance(selectedSection, student.id, 'absent')}
                                  className="h-8 px-4 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-bold uppercase"
                               >A</Button>
                            </div>
                         </div>
                      ))}
                   </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* Course Content Tab */}
        <TabsContent value="content" className="outline-none">
           <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Resource Library</h2>
                <p className="text-slate-500 text-sm font-medium">Manage course materials and assignment resources</p>
              </div>
              <Button onClick={() => addMaterial('New Lecture Resource', 'pdf')} className="bg-blue-600 font-bold text-xs uppercase tracking-widest">
                 <Plus className="w-4 h-4 mr-2" /> Upload Material
              </Button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map(mat => (
                 <motion.div key={mat.id} variants={item} initial="hidden" animate="show">
                    <Card className="group border-slate-200 hover:border-blue-200 transition-all hover:shadow-lg hover:shadow-blue-500/5 overflow-hidden">
                       <div className={`h-1 w-full ${
                          mat.type === 'pdf' ? 'bg-rose-500' : 
                          mat.type === 'ppt' ? 'bg-amber-500' : 
                          mat.type === 'zip' ? 'bg-emerald-500' : 'bg-blue-500'
                       }`} />
                       <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                             <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                <BookOpen className={`w-5 h-5 ${
                                   mat.type === 'pdf' ? 'text-rose-500' : 
                                   mat.type === 'ppt' ? 'text-amber-500' : 
                                   mat.type === 'zip' ? 'text-emerald-500' : 'text-blue-500'
                                }`} />
                             </div>
                             <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><ExternalLink className="w-4 h-4" /></Button>
                                <Button onClick={() => deleteMaterial(mat.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          </div>
                          <CardTitle className="text-sm font-black text-slate-900 mt-4 leading-tight">{mat.title}</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                             <span className="text-blue-600">{mat.type.toUpperCase()}</span>
                             <span className="text-slate-300">•</span>
                             <span>{mat.size}</span>
                          </CardDescription>
                       </CardHeader>
                       <CardFooter className="bg-slate-50/50 px-4 py-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Uploaded {mat.uploadedAt}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-blue-600 hover:bg-white hover:text-blue-700">Download</Button>
                       </CardFooter>
                    </Card>
                 </motion.div>
              ))}
           </div>
        </TabsContent>
        {/* Communications Tab */}
        <TabsContent value="communications" className="outline-none">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Announcements Section */}
              <div className="lg:col-span-2 space-y-6">
                 <div className="flex items-center justify-between mb-2">
                    <div>
                       <h3 className="text-xl font-black text-slate-900">Announcements</h3>
                       <p className="text-xs font-bold text-slate-400">Broadcast updates to all your sections</p>
                    </div>
                    <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-xl h-10 shadow-lg shadow-blue-600/20"
                        onClick={() => setIsAnnDialogOpen(true)}
                    >
                       <Plus className="w-4 h-4 mr-2" /> New Post
                    </Button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {announcements.map(ann => (
                       <Card key={ann.id} className="border-slate-200 hover:border-blue-200 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                          <CardContent className="p-6">
                             <div className="flex justify-between items-center mb-4">
                                <Badge className={`text-[9px] font-black uppercase tracking-widest border-none px-2 py-0.5 ${ann.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                   {ann.status}
                                </Badge>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Button onClick={(e) => {
                                      e.stopPropagation();
                                      updateAnnouncement(ann.id, { status: ann.status === 'draft' ? 'published' : 'draft' });
                                   }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                      <CheckCircle2 className="w-4 h-4" />
                                   </Button>
                                   <Button onClick={(e) => {
                                      e.stopPropagation();
                                      deleteAnnouncement(ann.id);
                                   }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                      <Trash2 className="w-4 h-4" />
                                   </Button>
                                </div>
                             </div>
                             <h4 className="font-black text-slate-900 mb-2 leading-tight">{ann.title}</h4>
                             <p className="text-xs font-medium text-slate-500 line-clamp-2 mb-4 leading-relaxed">{ann.content}</p>
                             <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ann.date}</span>
                                <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                             </div>
                          </CardContent>
                       </Card>
                    ))}
                 </div>
              </div>

              {/* Messaging & Office Hours */}
              <div className="space-y-6">
                <Card className="bg-white border-slate-200 overflow-hidden shadow-sm h-full flex flex-col">
                  <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Recent Messages</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <div className="divide-y divide-slate-100">
                      {[1, 2, 3].map((i) => (
                        <button key={i} className="w-full flex items-start gap-3 p-5 hover:bg-slate-50/80 transition-all text-left group border-none outline-none">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-blue-50">
                            <span className="text-xs font-black text-blue-600">{["JD", "AS", "BK"][i-1]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{["John Doe", "Alice Smith", "Bob Kumar"][i-1]}</p>
                              <span className="text-[10px] font-bold text-slate-400">2h ago</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 line-clamp-1 italic">"Hello Professor, regarding the lecture notes..."</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 p-4 border-t border-slate-100">
                    <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-black text-[10px] uppercase tracking-widest h-10 rounded-xl">
                      Open Inbox <MessageSquare className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="bg-white border-slate-200 p-8 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shadow-inner">
                        <Clock className="w-6 h-6 text-amber-600" />
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Office Hours</h3>
                        <p className="text-[10px] font-bold text-slate-400">Weekly schedule</p>
                     </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-5 rounded-3xl bg-amber-50/50 border border-amber-100 relative overflow-hidden group">
                      <p className="text-[9px] font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-1">
                         <Calendar className="w-3 h-3" /> Consultation
                      </p>
                      <p className="text-sm font-black text-amber-700">Mon, Wed — 14:00 to 16:00</p>
                      <p className="text-[10px] font-bold text-amber-600/60 mt-2 uppercase tracking-tight italic">Faculty Cabin 402</p>
                    </div>
                    <Button variant="outline" className="w-full border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 h-11 rounded-xl">
                      Update Schedule
                    </Button>
                  </div>
                </Card>
              </div>
           </div>
        </TabsContent>
      </Tabs>

      {/* Grade Edit Dialog */}
      <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
        <DialogContent className="max-w-md bg-white p-8 rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {isAddGradeMode ? "Create Grade Entry" : "Edit Marks"}
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
               Updating academic record for {editingGrade?.studentName || "New Entry"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6 font-medium">
            <div className="grid gap-2">
              <Label htmlFor="score" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Internal Score</Label>
              <div className="flex items-center gap-4">
                <Input 
                  id="score" 
                  defaultValue={editingGrade?.marks} 
                  className="h-12 border-slate-200 bg-slate-50 rounded-xl font-black text-lg text-blue-600 text-center"
                />
                <span className="text-2xl font-black text-slate-200">/</span>
                <Input 
                  id="max" 
                  defaultValue={editingGrade?.maxMarks || "50"} 
                  className="h-12 border-slate-200 bg-slate-50 rounded-xl font-black text-lg text-slate-400 text-center"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Internal Notes (Faculty Only)</Label>
              <textarea 
                id="notes" 
                defaultValue={editingGrade?.internalNotes}
                className="min-h-[100px] w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium text-slate-600 italic"
                placeholder="Student observation, feedback for future reference..."
              />
              <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Hidden from Students and Admins
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsGradeDialogOpen(false)} className="text-slate-400 font-black text-xs uppercase hover:bg-transparent">Cancel</Button>
            <Button onClick={() => {
                const marksVal = (document.getElementById('score') as HTMLInputElement).value;
                const notesVal = (document.getElementById('notes') as HTMLTextAreaElement).value;
                if (isAddGradeMode) {
                   addGrade({
                      studentId: 'st-new',
                      studentName: 'Selected Student',
                      usn: '1CE22CSXXX',
                      marks: marksVal,
                      maxMarks: '50',
                      internalNotes: notesVal,
                      isLocked: false
                   });
                } else if (editingGrade) {
                   updateGrade(editingGrade.id, { marks: marksVal, internalNotes: notesVal });
                }
                setIsGradeDialogOpen(false);
            }} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase px-8 rounded-xl h-11">
               {isAddGradeMode ? "Add Entry" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={isAnnDialogOpen} onOpenChange={setIsAnnDialogOpen}>
         <DialogContent className="max-w-lg bg-white p-8 rounded-3xl border-none shadow-2xl">
            <DialogHeader>
               <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Post Announcement</DialogTitle>
               <DialogDescription className="font-medium text-slate-500">Notify your sections regarding schedules or resources</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4 font-medium">
               <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Headline</Label>
                  <Input 
                     placeholder="e.g. Lab Internal Postponed" 
                     className="h-12 border-slate-200 bg-slate-50 rounded-xl"
                     value={newAnn.title}
                     onChange={(e) => setNewAnn({...newAnn, title: e.target.value})}
                  />
               </div>
               <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detail Content</Label>
                  <textarea 
                     className="min-h-[150px] w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
                     placeholder="Enter the full message for students..."
                     value={newAnn.content}
                     onChange={(e) => setNewAnn({...newAnn, content: e.target.value})}
                  />
               </div>
            </div>
            <DialogFooter className="gap-3">
               <div className="flex items-center gap-2 mr-auto">
                  <Badge variant="outline" className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-slate-200">
                     <Users className="w-3 h-3 mr-1" /> All Assigned Sections
                  </Badge>
               </div>
               <Button 
                onClick={() => {
                    addAnnouncement(newAnn.title || 'Untitled', newAnn.content, 'draft');
                    setIsAnnDialogOpen(false);
                    setNewAnn({ title: '', content: '' });
                }}
                variant="outline" 
                className="text-slate-600 font-black text-xs uppercase rounded-xl"
               >Save Draft</Button>
               <Button 
                onClick={() => {
                    addAnnouncement(newAnn.title || 'Untitled', newAnn.content, 'published');
                    setIsAnnDialogOpen(false);
                    setNewAnn({ title: '', content: '' });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase px-8 rounded-xl h-11"
               >Publish Now</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
