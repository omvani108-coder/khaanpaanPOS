import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import OrdersPage from "@/pages/Orders";
import MenuPage from "@/pages/Menu";
import TablesPage from "@/pages/Tables";
import DeliveryPage from "@/pages/Delivery";
import BillsPage from "@/pages/Bills";
import InvoicePrintPage from "@/pages/InvoicePrint";
import SettingsPage from "@/pages/Settings";
import CustomerMenuPage from "@/pages/CustomerMenu";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading, demoMode } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  // In demo mode, let users explore the staff UI without real auth
  if (!user && !demoMode) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Public customer-facing QR order flow */}
          <Route path="/t/:token" element={<CustomerMenuPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Standalone print view */}
          <Route
            path="/bills/:id/print"
            element={
              <RequireAuth>
                <InvoicePrintPage />
              </RequireAuth>
            }
          />

          {/* Staff app */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
