import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SingleCard from "./pages/SingleCard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Selection from "./pages/Selection";
import BulkCardImport from "./pages/BulkCardImport";
import MapFields from "./pages/MapFields";
import ImportManagement from "./pages/ImportManagement";
import BulkCardEditor from "./pages/BulkCardEditor";
import UserDashboardPage from "./pages/UserDashboard";
import TrackStatus from "./pages/TrackStatus";
import EmployeePage from "./pages/EmployeePage";
import ManageRequests from "./pages/ManageRequests";
import EditRequest from "./pages/EditRequest";
import AddEmployee from "./pages/AddEmployee";
import Profile from "./pages/Profile";
import Unauthorized from "./pages/Unauthorized";
import Vendor from "./pages/Vendor";
import UserManagement from "./pages/UserManagement";
import VendorDashboard from './pages/VendorDashboard';
import DepartmentManagement from './pages/DepartmentManagement';
import BrandingSettings from './pages/BrandingSettings';
import ResetPassword from './pages/ResetPassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin/Manager Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/single-card" element={<SingleCard />} />
              <Route path="/selection" element={<Selection />} />
              <Route path="/bulk-card-import" element={<BulkCardImport />} />
              <Route path="/map-fields" element={<MapFields />} />
              <Route path="/import-management" element={<ImportManagement />} />
              <Route path="/bulk-card-editor" element={<BulkCardEditor />} />
              <Route path="/manage-requests" element={<ManageRequests />} />
              <Route path="/edit-request/:id" element={<EditRequest />} />
              <Route path="/add-employee" element={<AddEmployee />} />
              <Route path="/vendor" element={<Vendor />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/department-management" element={<DepartmentManagement />} />
              <Route path="/settings/branding" element={<BrandingSettings />} />
            </Route>

            {/* User Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'user']} />}>
              <Route path="/user-dashboard" element={<UserDashboardPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/employee-page" element={<EmployeePage />} />
            </Route>

            {/* Vendor Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'vendor']} />}>
              <Route path="/vendor-dashboard" element={<VendorDashboard />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;