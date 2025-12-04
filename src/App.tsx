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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/single-card" element={<SingleCard />} />
          <Route path="/selection" element={<Selection />} />
          <Route path="/bulk-card-import" element={<BulkCardImport />} />
          <Route path="/map-fields" element={<MapFields />} />
          <Route path="/import-management" element={<ImportManagement />} />
          <Route path="/bulk-card-editor" element={<BulkCardEditor />} />
          <Route path="/user-dashboard" element={<UserDashboardPage />} />
          <Route path="/track-status" element={<TrackStatus />} />
          <Route path="/employee-page" element={<EmployeePage />} />
          <Route path="/manage-requests" element={<ManageRequests />} />
          <Route path="/edit-request/:id" element={<EditRequest />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;