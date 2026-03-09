import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PrinterProvider } from "@/context/PrinterContext";
import { DataSourceProvider } from "@/context/DataSourceContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, PermissionGate } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Printers from "./pages/Printers";
import PrinterDetail from "./pages/PrinterDetail";
import Alerts from "./pages/Alerts";
import NetworkMap from "./pages/NetworkMap";
import Maintenance from "./pages/Maintenance";
import HistoryPage from "./pages/HistoryPage";
import Sectors from "./pages/Sectors";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";
import Users from "./pages/Users";
import DataSources from "./pages/DataSources";
import AuditLog from "./pages/AuditLog";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedPage = ({ path, children }: { path: string; children: React.ReactNode }) => (
  <ProtectedRoute>
    <PermissionGate pagePath={path}>
      {children}
    </PermissionGate>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || "/"}>
        <AuthProvider>
          <PrinterProvider>
            <DataSourceProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<PermissionGate pagePath="/"><Index /></PermissionGate>} />
                  <Route path="/printers" element={<PermissionGate pagePath="/printers"><Printers /></PermissionGate>} />
                  <Route path="/printers/:id" element={<PermissionGate pagePath="/printers"><PrinterDetail /></PermissionGate>} />
                  <Route path="/alerts" element={<PermissionGate pagePath="/alerts"><Alerts /></PermissionGate>} />
                  <Route path="/network-map" element={<PermissionGate pagePath="/network-map"><NetworkMap /></PermissionGate>} />
                  <Route path="/maintenance" element={<PermissionGate pagePath="/maintenance"><Maintenance /></PermissionGate>} />
                  <Route path="/history" element={<PermissionGate pagePath="/history"><HistoryPage /></PermissionGate>} />
                  <Route path="/sectors" element={<PermissionGate pagePath="/sectors"><Sectors /></PermissionGate>} />
                  <Route path="/reports" element={<PermissionGate pagePath="/reports"><Reports /></PermissionGate>} />
                  <Route path="/settings" element={<PermissionGate pagePath="/settings"><SettingsPage /></PermissionGate>} />
                  <Route path="/users" element={<PermissionGate pagePath="/users"><Users /></PermissionGate>} />
                  <Route path="/data-sources" element={<PermissionGate pagePath="/data-sources"><DataSources /></PermissionGate>} />
                  <Route path="/audit" element={<PermissionGate pagePath="/audit"><AuditLog /></PermissionGate>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DataSourceProvider>
          </PrinterProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
