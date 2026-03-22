import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 bg-slate-50/50">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-red-500/10 rounded-full" />
        <div className="relative bg-white border border-slate-200 shadow-2xl rounded-2xl p-8 md:p-12 max-w-lg backdrop-blur-sm">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-50 rounded-full">
              <ShieldAlert className="w-12 h-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">403</h1>
          <h2 className="text-2xl font-bold mt-2 text-slate-800">Access Denied</h2>
          
          <p className="text-slate-600 mt-4 leading-relaxed">
            Sorry, you don't have the required permissions to access this page. 
            This area is restricted to specific institutional roles.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline"
              className="px-8 border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => navigate("/")}
              className="px-8 bg-[#020817] text-white hover:bg-[#020817]/90 shadow-lg shadow-slate-900/20"
            >
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </div>
          
          <p className="mt-8 text-xs text-slate-400">
            If you believe this is an error, please contact the CEC IT Support.
          </p>
        </div>
      </div>
    </div>
  );
}
