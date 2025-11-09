import {
  LayoutDashboard,
  Briefcase,
  Bookmark,
  FileText,
  Mail,
  GraduationCap,
  Settings,
  Crown,
  Sparkles,
  Calendar,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

export function AppSidebar({ currentPage, onNavigate, isOpen, onClose, onLogout }: AppSidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "jobs", label: "Job Listings", icon: Briefcase },
    { id: "saved-jobs", label: "Saved Jobs", icon: Bookmark },
    { id: "resume", label: "Resume Tailor", icon: FileText },
    { id: "cover-letter", label: "Cover Letter", icon: Mail },
    { id: "visa-tracker", label: "Visa Tracker", icon: Calendar },
    { id: "university-jobs", label: "University Jobs", icon: GraduationCap },
    { id: "premium", label: "Go Premium", icon: Crown },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      onClose?.();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-16 left-0 z-50 lg:z-0
          w-64 border-r bg-sidebar h-[100vh] lg:h-[calc(100vh-4rem)]
          p-4 overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end mb-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleNavigate(item.id)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
          
          <div className="pt-4 space-y-2">
            <Button
              variant={currentPage === "settings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleNavigate("settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Premium CTA */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-[#34d399] to-[#10b981] text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm sm:text-base">Upgrade to Premium</span>
          </div>
          <p className="text-xs sm:text-sm opacity-90 mb-3">
            Unlock unlimited AI tools and advanced features
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => handleNavigate("premium")}
          >
            Upgrade Now
          </Button>
        </div>
      </aside>
    </>
  );
}
