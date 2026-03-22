import { ClipboardList, Trophy, IndianRupee, GraduationCap, Calendar, Bell, ChevronRight, BookOpen, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StudentDashboard() {
  const { user, loading } = useAuth();
  const profile = user?.student_profile;

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

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header / Profile Section */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full -mr-20 -mt-20" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Profile</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || "Student"}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm font-medium">
              <span className="flex items-center gap-1.5 font-mono text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded text-blue-300">
                USN: {profile?.usn || "N/A"}
              </span>
              <span className="h-4 w-px bg-white/10" />
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-400/50" /> {profile?.department?.name || "Department"}
              </span>
              <span className="h-4 w-px bg-white/10" />
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400/50" /> {profile?.current_semester || "N/A"}{getOrdinalSuffix(profile?.current_semester || 0)} Sem • Sec {profile?.section?.name || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Attendance Card */}
        <motion.div variants={item}>
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  <ClipboardList className="w-3 h-3" /> Attendance
                </div>
                <Badge variant="outline" className="text-[9px] font-bold border-green-200 text-green-600 bg-green-50">On Track</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">82%</span>
                <span className="text-xs font-bold text-slate-400">Total</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "82%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-green-500 h-full rounded-full" 
                />
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Min: 75%</span>
                <span className="text-green-600">Legendary</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CGPA Card */}
        <motion.div variants={item}>
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  <Trophy className="w-3 h-3" /> Academics
                </div>
                <Badge variant="outline" className="text-[9px] font-bold border-blue-200 text-blue-600 bg-blue-50">Top 10%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">8.4</span>
                <span className="text-xs font-bold text-slate-400">CGPA</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-4">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Previous Sem SGPA: 8.6
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fees Card */}
        <motion.div variants={item}>
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  <IndianRupee className="w-3 h-3" /> Financials
                </div>
                <Badge variant="outline" className="text-[9px] font-bold border-green-200 text-green-600 bg-green-50 uppercase">Cleared</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">Paid</span>
                <span className="text-xs font-bold text-green-600 uppercase">Status</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-4">
                Next Billing Cycle: July 2026
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Announcements */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" /> Recent Updates
            </h2>
            <button className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {[
              { title: 'IA-1 Marks Released', meta: 'Dr. Ramesh Kumar — 2 days ago', priority: 'high' },
              { title: 'Lab session rescheduled to Thursday', meta: 'Prof. Sunita Rao — 5 days ago', priority: 'medium' },
              { title: 'Semester fee deadline extended', meta: 'Admin — 1 week ago', priority: 'low' },
            ].map((ann, idx) => (
              <div key={idx} className="group p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all cursor-pointer">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{ann.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ann.meta}</span>
                    <Badge variant="secondary" className="text-[9px] font-extrabold uppercase rounded px-1.5 h-4 bg-slate-50 border-slate-200">Official</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Upcoming Events
            </h2>
            <button className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
              Full Schedule <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {[
              { month: "MAR", day: "15", title: "IA-2 Examination", sub: "Data Structures", color: "bg-red-500" },
              { month: "MAR", day: "20", title: "Lab Assignment Due", sub: "DBMS", color: "bg-blue-500" },
              { month: "APR", day: "01", title: "Sports Day", sub: "College event", color: "bg-green-500" },
            ].map((ev, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white transition-all">
                <div className={`w-12 h-12 shrink-0 rounded-xl ${ev.color} flex flex-col items-center justify-center text-white shadow-lg shadow-inner shadow-black/10`}>
                  <span className="text-[9px] font-black uppercase opacity-80">{ev.month}</span>
                  <span className="text-lg font-black leading-none">{ev.day}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{ev.title}</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{ev.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  if (!n) return "";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
