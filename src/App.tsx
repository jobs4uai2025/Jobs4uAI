// src/App.tsx
// COMPLETE NEW VERSION with AuthProvider

import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { AppSidebar } from "./components/AppSidebar";
import { LandingPage } from "./components/pages/LandingPage";
import { LoginPage } from "./components/pages/LoginPage";
import { SignupPage } from "./components/pages/SignupPage";
import { DashboardPage } from "./components/pages/DashboardPage";
import { JobsPage } from "./components/pages/JobsPage";
import { SavedJobsPage } from "./components/pages/SavedJobsPage";
import { ResumePage } from "./components/pages/ResumePage";
import { CoverLetterPage } from "./components/pages/CoverLetterPage";
import { ProfilePage } from "./components/pages/ProfilePage";
import { UniversityJobsPage } from "./components/pages/UniversityJobsPage";
import { PremiumPage } from "./components/pages/PremiumPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { VisaTrackerPage } from "./components/pages/VisaTrackerPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<string>("landing");
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated, logout } = useAuth();

  // Protected pages list
  const protectedPages = [
    "dashboard",
    "jobs",
    "saved-jobs",
    "resume",
    "cover-letter",
    "profile",
    "visa-tracker",
    "university-jobs",
    "premium",
    "settings",
  ];

  useEffect(() => {
    // Apply dark mode
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    // Close sidebar on mobile when page changes
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [currentPage]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const handleThemeToggle = () => {
    setIsDark(!isDark);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    logout();
    setCurrentPage("landing");
  };

  const renderPage = () => {
    // Public pages
    if (currentPage === "landing") {
      return <LandingPage onNavigate={handleNavigate} />;
    }
    if (currentPage === "login") {
      return <LoginPage onNavigate={handleNavigate} />;
    }
    if (currentPage === "signup") {
      return <SignupPage onNavigate={handleNavigate} />;
    }

    // Protected pages - wrap in ProtectedRoute
    const isProtectedPage = protectedPages.includes(currentPage);
    
    const PageComponent = () => {
      switch (currentPage) {
        case "dashboard":
          return <DashboardPage />;
        case "jobs":
          return <JobsPage />;
        case "saved-jobs":
          return <SavedJobsPage />;
        case "resume":
          return <ResumePage />;
        case "cover-letter":
          return <CoverLetterPage />;
        case "profile":
          return <ProfilePage />;
        case "visa-tracker":
          return <VisaTrackerPage />;
        case "university-jobs":
          return <UniversityJobsPage />;
        case "premium":
          return <PremiumPage />;
        case "settings":
          return <SettingsPage isDark={isDark} onThemeToggle={handleThemeToggle} />;
        default:
          return <LandingPage onNavigate={handleNavigate} />;
      }
    };

    if (isProtectedPage) {
      return (
        <ProtectedRoute onNavigate={handleNavigate}>
          <PageComponent />
        </ProtectedRoute>
      );
    }

    return <PageComponent />;
  };

  const showSidebar = isAuthenticated && !["login", "signup", "landing"].includes(currentPage);

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        onThemeToggle={handleThemeToggle}
        isDark={isDark}
        onNavigate={handleNavigate}
        isAuthenticated={isAuthenticated}
        onSidebarToggle={handleSidebarToggle}
        showSidebarToggle={showSidebar}
        onLogout={handleLogout}
      />

      <div className="flex relative">
        {showSidebar && (
          <AppSidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onLogout={handleLogout}
          />
        )}

        <main className={`
          flex-1 w-full
          ${showSidebar ? "p-4 sm:p-6" : ""}
          ${!showSidebar && currentPage !== "landing" ? "p-4 sm:p-6" : ""}
          ${showSidebar && sidebarOpen ? "lg:ml-0" : ""}
        `}>
          <div className="max-w-[1600px] mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}