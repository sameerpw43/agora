import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  Home, 
  Users, 
  UserPlus, 
  Settings, 
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="w-60 bg-[#0D6E9A] text-white flex flex-col h-screen">
      <div className="p-4 border-b border-[#095679] flex items-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-8 h-8 mr-2 text-white"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.5 14.25V11.25C19.5 7.5 17.25 5.25 13.5 5.25H6C4.35 5.25 3 6.6 3 8.25V17.25"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.5 2.25L12 6.75L7.5 2.25"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14.25C13.6569 14.25 15 12.9069 15 11.25C15 9.59315 13.6569 8.25 12 8.25C10.3431 8.25 9 9.59315 9 11.25C9 12.9069 10.3431 14.25 12 14.25Z"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.625 14.25C6.24632 14.25 6.75 13.7463 6.75 13.125C6.75 12.5037 6.24632 12 5.625 12C5.00368 12 4.5 12.5037 4.5 13.125C4.5 13.7463 5.00368 14.25 5.625 14.25Z"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.375 14.25C18.9963 14.25 19.5 13.7463 19.5 13.125C19.5 12.5037 18.9963 12 18.375 12C17.7537 12 17.25 12.5037 17.25 13.125C17.25 13.7463 17.7537 14.25 18.375 14.25Z"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14.25V17.25"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.625 14.25V17.25C5.625 19.125 6.75 20.25 8.625 20.25H12"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.375 14.25V17.25C18.375 19.125 17.25 20.25 15.375 20.25H12"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="text-xl font-semibold">Crosscare.ai</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="mt-4">
          <Link href="/">
            <div className={cn(
              "sidebar-link",
              isActive('/') && "active"
            )}>
              <Home className="sidebar-icon" />
              <span>Home</span>
            </div>
          </Link>
          
          <Link href="/channels">
            <div className={cn(
              "sidebar-link",
              isActive('/channels') && "active"
            )}>
              <Users className="sidebar-icon" />
              <span>Group Channels</span>
            </div>
          </Link>
          
          <Link href="/care-team">
            <div className={cn(
              "sidebar-link",
              isActive('/care-team') && "active"
            )}>
              <UserPlus className="sidebar-icon" />
              <span>Care Team Members</span>
            </div>
          </Link>
        </nav>
      </div>
      
      <div className="mt-auto">
        <Link href="/settings">
          <div className="sidebar-link">
            <Settings className="sidebar-icon" />
            <span>Settings</span>
          </div>
        </Link>
        
        <button 
          onClick={async () => {
            try {
              setIsLoggingOut(true);
              const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
              });
              
              if (response.ok) {
                // Redirect to login page
                navigate('/auth');
              } else {
                console.error("Logout failed");
              }
            } catch (error) {
              console.error("Error during logout:", error);
            } finally {
              setIsLoggingOut(false);
            }
          }}
          className="sidebar-link w-full text-left"
          disabled={isLoggingOut}
        >
          <LogOut className="sidebar-icon" />
          <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
        </button>
      </div>
    </div>
  );
}
