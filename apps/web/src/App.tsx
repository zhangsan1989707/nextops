import { useState, useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ChatOps } from "./pages/ChatOps";
import { Alerts } from "./pages/Alerts";
import { Servers } from "./pages/Servers";
import { Scripts } from "./pages/Scripts";
import { Commands } from "./pages/Commands";
import { Packages } from "./pages/Packages";
import { Files } from "./pages/Files";
import { Tenants } from "./pages/Tenants";
import { Approvals } from "./pages/Approvals";
import { Models } from "./pages/Models";
import { Members } from "./pages/Members";
import { Teams } from "./pages/Teams";
import { Roles } from "./pages/Roles";
import { ToastProvider } from "./components/common/Toast";
import { serverApi, alertApi } from "./api";
import type { Server, Alert } from "./api";

function App() {
  const [currentPath, setCurrentPath] = useState("/");
  const [servers, setServers] = useState<Server[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [serversRes, alertsRes] = await Promise.all([
        serverApi.getAll(),
        alertApi.getAll(),
      ]);
      
      if (serversRes.success && serversRes.data) {
        setServers(serversRes.data.items);
      }
      if (alertsRes.success && alertsRes.data) {
        setAlerts(alertsRes.data.items);
      }
      setLoading(false);
    }
    
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderPage = () => {
    switch (currentPath) {
      case "/":
        return <Dashboard />;
      case "/chatops":
        return <ChatOps servers={servers} alerts={alerts} />;
      case "/alerts":
        return <Alerts servers={servers} onOpenServer={(id) => setCurrentPath(`/servers/${id}`)} />;
      case "/servers":
        return <Servers servers={servers} />;
      case "/scripts":
        return <Scripts />;
      case "/commands":
        return <Commands />;
      case "/packages":
        return <Packages />;
      case "/files":
        return <Files />;
      case "/tenants":
        return <Tenants />;
      case "/approvals":
        return <Approvals />;
      case "/models":
        return <Models />;
      case "/members":
        return <Members />;
      case "/teams":
        return <Teams />;
      case "/roles":
        return <Roles />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      <Layout currentPath={currentPath} onNavigate={setCurrentPath}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <span>加载中...</span>
          </div>
        ) : (
          renderPage()
        )}
      </Layout>
    </ToastProvider>
  );
}

export default App;
