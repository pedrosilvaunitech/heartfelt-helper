import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PrinterProvider } from "@/context/PrinterContext";
import { DataSourceProvider } from "@/context/DataSourceContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PrinterProvider>
        <DataSourceProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || "/"}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/printers" element={<Printers />} />
              <Route path="/printers/:id" element={<PrinterDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/network-map" element={<NetworkMap />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/sectors" element={<Sectors />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<Users />} />
              <Route path="/data-sources" element={<DataSources />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </DataSourceProvider>
      </PrinterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
