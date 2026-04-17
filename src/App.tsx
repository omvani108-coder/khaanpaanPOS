import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NewOrderProvider } from "@/contexts/NewOrderContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import OrdersPage from "@/pages/Orders";
import MenuPage from "@/pages/Menu";
import TablesPage from "@/pages/Tables";
import FloorPlanPage from "@/pages/FloorPlan";
import DeliveryPage from "@/pages/Delivery";
import BillsPage from "@/pages/Bills";
import InvoicePrintPage from "@/pages/InvoicePrint";
import KotPrintPage from "@/pages/KotPrint";
import SettingsPage from "@/pages/Settings";
import CustomerMenuPage from "@/pages/CustomerMenu";
import CaptainAppPage from "@/pages/CaptainApp";
import SchedulePage from "@/pages/Schedule";
import KitchenPage from "@/pages/Kitchen";
import ShiftPage from "@/pages/Shift";
import CustomersPage from "@/pages/Customers";
import EarningsPage from "@/pages/Earnings";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading, demoMode } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user && !demoMode) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NewOrderProvider>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Public customer-facing QR order flow */}
          <Route path="/t/:token" element={<CustomerMenuPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Standalone print views — no chrome, no sidebar */}
          <Route
            path="/bills/:id/print"
            element={
              <RequireAuth>
                <InvoicePrintPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/:orderId/kot"
            element={
              <RequireAuth>
                <KotPrintPage />
              </RequireAuth>
            }
          />

          {/* Captain App — full-screen, no sidebar */}
          <Route
            path="/captain"
            element={
              <RequireAuth>
                <CaptainAppPage />
              </RequireAuth>
            }
          />

          {/* Kitchen Display System — full-screen for kitchen tablet */}
          <Route
            path="/kitchen"
            element={
              <RequireAuth>
                <KitchenPage />
              </RequireAuth>
            }
          />

          {/* Staff app with sidebar layout */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/floor" element={<FloorPlanPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/shift" element={<ShiftPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </NewOrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
