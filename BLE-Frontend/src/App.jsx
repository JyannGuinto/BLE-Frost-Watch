import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";

import Login from "./components/login/Login";

import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./components/dashboard/Dashboard";
import Gateway from "./components/gateways/Gateway";
import Employee from "./components/employees/Employee";
import Ble from "./components/ble/Ble";
import Asset from "./components/asset/Asset";
import LiveMap from "./components/livemap/LiveMap";
import FullLiveMap from "./pages/FullLiveMap"; 
import User from "./components/users/User";
import Activity from "./components/activitylog/ActivityLog";
import Report from "./components/reports/Report";
import Zone from "./components/zone/Zone";

function App() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/full-livemap" element={<FullLiveMap />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500">
                  <div className="flex h-screen overflow-hidden">
                    <Sidebar
                      collapsed={sideBarCollapsed}
                      onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                    />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <Header
                        sidebarCollapsed={sideBarCollapsed}
                        onToggleSidebar={() => setSideBarCollapsed(!sideBarCollapsed)}
                      />
                      <main className="flex-1 overflow-y-auto bg-transparent">
                        <div className="p-6 space-y-6">
                          {currentPage === "dashboard" && <Dashboard />}
                          {currentPage === "gateway" && <Gateway />}
                          {currentPage === "employee" && <Employee />}
                          {currentPage === "ble" && <Ble />}
                          {currentPage === "asset" && <Asset />}
                          {currentPage === "livemap" && <LiveMap />}
                          {currentPage === "user" && <User />}
                          {currentPage === "activity" && <Activity />}
                          {currentPage === "report" && <Report />}
                          {currentPage === "zone" && <Zone />}
                        </div>
                      </main>
                    </div>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
