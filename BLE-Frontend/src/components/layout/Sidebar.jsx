import React, { useState } from "react";
import {
  Activity,
  BadgeInfo,
  Bluetooth,
  Boxes,
  ChevronDown,
  FileChartLine,
  Forklift,
  Grid2X2,
  HardHat,
  IdCardLanyard,
  LandPlot,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Monitor,
  SquareActivity,
  User,
} from "lucide-react";
import jentecLogo from "../../assets/jentec-storage-inc-logo.png";
import { useAuth } from "../../context/AuthContext"; // 👈 import Auth context

const menuItems = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    active: true,
  },
  {
    id: "monitoring",
    icon: Monitor,
    label: "Monitoring",
    submenu: [
      { id: "livemap", label: "Live Map", icon: Map },
      { id: "gateway", label: "Gateways", icon: Grid2X2 },
      { id: "ble", label: "BLE", icon: Bluetooth },
      { id: "zone", label: "Zone", icon: LandPlot },
    ],
  },
  {
    id: "personnelasset",
    icon: Boxes,
    label: "Personnel & Assets",
    submenu: [
      { id: "employee", label: "Employee", icon: IdCardLanyard },
      { id: "asset", label: "Asset", icon: Forklift },
    ],
  },
  {
    id: "act",
    icon: Activity,
    label: "Activity & Reports",
    submenu: [
      { id: "activity", label: "Activity Log", icon: SquareActivity },
      { id: "report", label: "Reports", icon: FileChartLine },
    ],
  },
  {
    id: "user",
    icon: User,
    label: "Users",
  },
  {
    id: "logout",
    icon: LogOut,
    label: "Logout",
  },
];

export default function Sidebar({ collapsed, onToggle, currentPage, onPageChange }) {
  const [expandedItems, setExpandedItems] = useState(new Set(["workforce"]));
  const { user, logout } = useAuth(); // 👈 get user + logout from context

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleClick = (item) => {
    if (item.id === "logout") {
  onPageChange("logout");
  setTimeout(() => {
    if (confirm("Are you sure you want to log out?")) logout();
  }, 150);
  return;
} else if (item.submenu) {
      toggleExpanded(item.id);
    } else {
      onPageChange(item.id);
    }
  };

  return (
    <div
      className={`${collapsed ? "w-20" : "w-72"} transition-all duration-300 ease-in-out bg-white/80 dark:bg-slate-900/80
      backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col relative z-10`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center space-x-3">
          <img src={jentecLogo} alt="Jentec Storage Inc" className="h-10 object-contain" />
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                Jentec Storage Inc.
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
<nav className="flex-1 p-4 space-y-2 overflow-y-auto">
  {menuItems.map((item) => {
    // Hide "Users" menu for non-admins
    if (item.id === "user" && user?.role !== "admin") return null;

    return (
      <div key={item.id}>
        <button
  className={`w-full flex items-center justify-between p-3 rounded-xl
    transition-all duration-200 ${
      currentPage === item.id
        ? "bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white shadow-lg shadow-blue-500/25"
        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
    }`}
  onClick={() => handleClick(item)}
>
          <div className="flex items-center space-x-3">
            <item.icon className="w-5 h-5" />
            {!collapsed && <span className="font-medium ml-2">{item.label}</span>}
          </div>
          {!collapsed && item.submenu && (
            <ChevronDown className="w-4 h-4 transition-transform" />
          )}
        </button>

        {/* Submenus */}
        {!collapsed && item.submenu && expandedItems.has(item.id) && (
          <div className="ml-8 mt-2 space-y-1">
            {item.submenu.map((subitem) => (
              <button
                key={subitem.id}
                onClick={() => onPageChange(subitem.id)}
                className="w-full flex items-center p-2 text-sm text-slate-600
                dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 
                hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-all"
              >
                <subitem.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{subitem.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  })}
</nav>


      {/* User Profile (dynamic now!) */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <div
            className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50
          dark:bg-slate-800/50"
          >
            <img
              src={`https://ui-avatars.com/api/?name=${user?.username || "User"}`}
              alt="user"
              className="w-10 h-10 rounded-full ring-2 ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                {user?.username || "Guest"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.role || "Unknown Role"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
