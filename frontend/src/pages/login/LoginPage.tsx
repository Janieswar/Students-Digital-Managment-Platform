import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Eye, EyeOff, ArrowRight, ShieldCheck, UserCheck, GraduationCap as StudentIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
};

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={ROLE_DASHBOARD[user.role] || "/"} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userData = await login(email, password);
      navigate(ROLE_DASHBOARD[userData.role] || "/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          setError("Too many login attempts. Please try again in 60 seconds.");
        } else {
          setError(err.detail);
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleDemoLogin = (role: string) => {
    setEmail(`${role}@cec.edu.in`);
    setPassword(`Admin@123`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#020817] p-4 font-sans">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="shadow-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <CardHeader className="text-center space-y-4 p-8 border-b border-slate-800/50">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
              className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/30"
            >
              <GraduationCap className="w-10 h-10 text-white" />
            </motion.div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-white">CEC Platform</CardTitle>
              <CardDescription className="text-slate-400 font-medium">City Engineering College, Bengaluru</CardDescription>
            </div>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8 py-8">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Institutional Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@cec.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-slate-950/50 border-slate-800 focus:ring-blue-600 focus:border-blue-600 rounded-xl text-slate-200 placeholder:text-slate-600 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" title="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Security Key</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 bg-slate-950/50 border-slate-800 focus:ring-blue-600 focus:border-blue-600 rounded-xl text-slate-200 pr-12 transition-all font-mono"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert variant="destructive" className="py-3 border-red-900/50 bg-red-950/30 text-red-400 rounded-xl overflow-hidden backdrop-blur-sm">
                      <AlertDescription className="text-[11px] font-bold uppercase tracking-wider">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] group" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Verifying Identity...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </CardContent>
          </form>

          <div className="px-8 pb-8 space-y-4">
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
              <div className="h-px flex-1 bg-slate-800" />
              Demo Access
              <div className="h-px flex-1 bg-slate-800" />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { role: 'admin', icon: ShieldCheck, label: 'Admin', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
                { role: 'faculty', icon: UserCheck, label: 'Faculty', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
                { role: 'student', icon: StudentIcon, label: 'Student', color: 'text-green-400 bg-green-400/10 border-green-400/20' }
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleDemoLogin(item.role)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${item.color}`}
                >
                  <item.icon className="w-5 h-5 mb-1.5" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]"
        >
          Secure Academic Information Management System — CEC © 2026
        </motion.p>
      </motion.div>
    </div>
  );
}
