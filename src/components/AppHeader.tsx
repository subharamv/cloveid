import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../hooks/useBranding';
import { CardNavItem } from './ui/CardNav';
import CardNav from './ui/CardNav';
import NewBatchModal from './NewBatchModal';
import ProfileModal from './ProfileModal';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { XCircle } from 'lucide-react';

const NewBatchLink = {
  label: "New Batch", href: "", ariaLabel: "Create New Batch"
};

const adminItems = (openNewBatch: () => void): CardNavItem[] => [
  {
    label: "Dashboard",
    bgColor: "#1B1722",
    textColor: "#fff",
    links: [
      { label: "Overview", href: "/dashboard", ariaLabel: "Dashboard Overview" },
      { label: "User Dashboard", href: "/user-dashboard", ariaLabel: "Switch to User Dashboard" },
      { ...NewBatchLink, onClick: openNewBatch },
    ]
  },
  {
    label: "Manage",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Manage Requests", href: "/manage-requests", ariaLabel: "Manage Employee Requests" },
      { label: "Issued Cards", href: "/issued-cards", ariaLabel: "Issued ID Cards" },
      { label: "Bulk Import", href: "/bulk-card-import", ariaLabel: "Bulk Card Import" },
    ]
  },
  {
    label: "Settings",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Vendor Management", href: "/vendor", ariaLabel: "Vendor Management" },
      { label: "User Management", href: "/user-management", ariaLabel: "User Management" },
      { label: "Branding", href: "/settings/branding", ariaLabel: "Branding Settings" },
    ]
  }
];

const userItems = (openProfile: () => void, showAdminLink?: boolean): CardNavItem[] => [
  {
    label: "Dashboard",
    bgColor: "#1B1722",
    textColor: "#fff",
    links: [
      ...(showAdminLink ? [{ label: "Admin Dashboard", href: "/dashboard", ariaLabel: "Switch to Admin Dashboard" }] : []),
      { label: "Overview", href: "/user-dashboard", ariaLabel: "User Dashboard" },
      { label: "Raise New Card", href: "/employee-page", ariaLabel: "Request New ID Card" },
    ]
  },
  {
    label: "Profile",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Manage Profile", onClick: openProfile },
    ]
  }
];

const vendorItems: CardNavItem[] = [
  {
    label: "Requests",
    bgColor: "#1B1722",
    textColor: "#fff",
    links: [
      { label: "Active Requests", href: "/vendor-dashboard?tab=active", ariaLabel: "Active Requests" },
      { label: "Completed Cards", href: "/vendor-dashboard?tab=completed", ariaLabel: "Completed Cards" },
    ]
  }
];

const AppHeader: React.FC = () => {
  const { user, userRole, logout, clearSession } = useAuth();
  const { branding } = useBranding();
  const location = useLocation();
  const [newBatchOpen, setNewBatchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const isVendor = userRole === 'vendor';
  const userRoutes = ['/user-dashboard', '/employee-page'];
  const isOnUserRoute = userRoutes.includes(location.pathname);

  const items = useMemo<CardNavItem[]>(() => {
    if (isAdmin && !isOnUserRoute) return adminItems(() => setNewBatchOpen(true));
    if (isVendor) return vendorItems;
    return userItems(() => setProfileOpen(true), isAdmin);
  }, [isAdmin, isOnUserRoute, isVendor]);

  useEffect(() => {
    const handler = () => setNewBatchOpen(true);
    window.addEventListener('open-new-batch', handler);
    return () => window.removeEventListener('open-new-batch', handler);
  }, []);

  useEffect(() => {
    const handler = () => setProfileOpen(true);
    window.addEventListener('open-profile', handler);
    return () => window.removeEventListener('open-profile', handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!profileDropdownOpen) return;
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        avatarRef.current && !avatarRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const toggleProfileDropdown = () => {
    if (!profileDropdownOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const rightContent = (
    <>
      <div
        ref={avatarRef}
        className="flex items-center justify-center rounded-full size-8 cursor-pointer text-gray-600 hover:bg-gray-100"
        title={user?.user_metadata?.full_name || 'User'}
        onClick={toggleProfileDropdown}
      >
        <span className="material-symbols-outlined text-lg">person</span>
      </div>
      <button
        onClick={logout}
        className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-9 w-9 bg-transparent text-gray-600 hover:bg-gray-100"
        title="Logout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </>
  );

  return (
    <>
      <CardNav
        logo={branding.logo_header || logo}
        logoAlt="Logo"
        items={items}
        baseColor="#fff"
        menuColor="#333"
        rightContent={rightContent}
      />
      {profileDropdownOpen && (
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
          className="w-56 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 py-2"
        >
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
          {isVendor && (
            <button
              onClick={() => { clearSession(); setProfileDropdownOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <XCircle size={16} />
              Clear Session
            </button>
          )}
        </div>
      )}
      <div className="h-20" />
      <NewBatchModal isOpen={newBatchOpen} onClose={() => setNewBatchOpen(false)} />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};

export default AppHeader;
