import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ChatPage from "@/pages/chat-page";
import CareTeamPage from "@/pages/care-team-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { GlobalCallProvider } from "@/hooks/use-global-call-context";
import { RouteResetHandler } from "@/components/route-reset-handler";
import { GlobalCallNotification } from "@/components/calls/global-call-notification";
import { socketService } from "@/lib/socket";

function App() {
  const [user, setUser] = useState<any>(null);
  
  // Connect to WebSocket service at the app root level
  useEffect(() => {
    console.log("App component mounted");
    
    // Fetch user data and establish WebSocket connection
    async function fetchUserAndConnect() {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Connect to WebSocket with user credentials
          if (userData && userData.empId) {
            console.log("Establishing global WebSocket connection with user:", userData);
            socketService.connect(userData.empId, userData.name || userData.username);
          }
        } else {
          console.log("User not authenticated, WebSocket connection not established");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
    
    fetchUserAndConnect();
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      console.log("App component unmounting, cleaning up WebSocket connection");
      socketService.disconnect();
    };
  }, []);

  return (
    <>
      <GlobalCallProvider>
        {/* Add the route reset handler to clean up call state on navigation */}
        <RouteResetHandler />
        {/* Add global call notification component for app-wide call alerts */}
        <GlobalCallNotification />
        <Switch>
          <ProtectedRoute path="/" component={DashboardPage} />
          <ProtectedRoute path="/chat/:patientId" component={ChatPage} />
          <ProtectedRoute path="/care-team" component={CareTeamPage} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </GlobalCallProvider>
    </>
  );
}

export default App;
