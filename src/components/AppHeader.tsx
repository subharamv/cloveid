import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../hooks/useBranding';
import { supabase } from '../lib/supabaseClient';
import { CardNavItem } from './ui/CardNav';
import CardNav from './ui/CardNav';
import NewBatchModal from './NewBatchModal';
import ProfileModal from './ProfileModal';
import RaiseIssueModal from './issues/RaiseIssueModal';
import AdminIssuesPanel from './issues/AdminIssuesPanel';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { XCircle, HelpCircle } from 'lucide-react';

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
      { label: "Bulk Import", href: "/bulk-card-import", ariaLabel: "Bulk Card Import" },

      { ...NewBatchLink, onClick: openNewBatch },
    ]
  },
  {
    label: "Manage",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Employee Requests", href: "/manage-requests", ariaLabel: "Manage Employee Requests" },
      { label: "View Single Cards", href: "/single-card-tracking", ariaLabel: "View Single Cards" },
      { label: "View Batch Cards", href: "/batches", ariaLabel: "Batch Management" },
      { label: "User Management", href: "/user-management", ariaLabel: "User Management" },

    ]
  },
  {
    label: "Settings",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Issued Cards", href: "/issued-cards", ariaLabel: "Issued ID Cards" },
      { label: "Vendor Management", href: "/vendor", ariaLabel: "Vendor Management" },
      { label: "Order Accessories", href: "/order-request", ariaLabel: "Accessory Orders" },
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
      ...(showAdminLink || userRole === 'super_admin' ? [{ label: "Admin Dashboard", href: "/dashboard", ariaLabel: "Switch to Admin Dashboard" }] : []),
      { label: "Overview", href: "/user-dashboard", ariaLabel: "User Dashboard" },
      { label: "Raise New Card", href: "/employee-page", ariaLabel: "Request New ID Card" },
    ]
  },
  {
    label: "Support",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Raise Issue", href: "#", ariaLabel: "Raise an Issue", onClick: () => window.dispatchEvent(new CustomEvent('open-raise-issue')) },
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
  },
  {
    label: "Support",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Raise Issue", href: "#", ariaLabel: "Raise an Issue", onClick: () => window.dispatchEvent(new CustomEvent('open-raise-issue')) },
      { label: "Order Accessories", href: "/vendor-orders", ariaLabel: "Accessory Orders" },
    ]
  }
];

const AppHeader: React.FC = () => {
  const { user, userRole, logout, clearSession } = useAuth();
  const { branding } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const [newBatchOpen, setNewBatchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [raiseIssueOpen, setRaiseIssueOpen] = useState(false);
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);
  const [openIssuesCount, setOpenIssuesCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const isAdmin = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
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
    const handler = () => setRaiseIssueOpen(true);
    window.addEventListener('open-raise-issue', handler);
    return () => window.removeEventListener('open-raise-issue', handler);
  }, []);

  useEffect(() => {
    if (!isAdmin || isOnUserRoute) return;
    const fetchOpenCount = async () => {
      try {
        const { count } = await supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']);
        setOpenIssuesCount(count || 0);
      } catch { }
    };
    fetchOpenCount();
    const interval = setInterval(fetchOpenCount, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, isOnUserRoute]);

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

  const isAdminOrManager = isAdmin && !isOnUserRoute;

  const handleUserDashboard = () => {
    navigate('/user-dashboard');
  };

  const userDashboardBtn = (
    <button
      onClick={handleUserDashboard}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
    >
      User Dashboard
    </button>
  );

  const mobileContent = isAdminOrManager ? (
    <div className="card-nav-mobile-content">
      {userDashboardBtn}
    </div>
  ) : undefined;

  const rightContent = (
    <>
      <div className="hidden md:flex items-center gap-1">
        {isAdminOrManager && userDashboardBtn}
      </div>
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
        mobileContent={mobileContent}
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
      <RaiseIssueModal isOpen={raiseIssueOpen} onClose={() => setRaiseIssueOpen(false)} />

      {isAdmin && !isOnUserRoute && (
        <button
          onClick={() => setShowIssuesPanel(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:opacity-90 hover:shadow-xl transition-all flex items-center justify-center"
          title="View Issues"
        >
          <HelpCircle size={22} />
          {openIssuesCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 border-2 border-white dark:border-gray-950">
              {openIssuesCount > 99 ? '99+' : openIssuesCount}
            </span>
          )}
        </button>
      )}

      <AdminIssuesPanel isOpen={showIssuesPanel} onClose={() => setShowIssuesPanel(false)} />
    </>
  );
};

export default AppHeader;
