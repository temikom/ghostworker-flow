import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BillingProvider } from "@/contexts/BillingContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AccountLocked from "./pages/AccountLocked";
import Dashboard from "./pages/Dashboard";
import Integrations from "./pages/Integrations";
import Conversations from "./pages/Conversations";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import Invoices from "./pages/Invoices";
import Analytics from "./pages/Analytics";
import Team from "./pages/Team";
import EmailPreferences from "./pages/EmailPreferences";
import Webhooks from "./pages/Webhooks";
import PaymentCallback from "./pages/PaymentCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/account-locked" element={<AccountLocked />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/payment/callback" element={<PaymentCallback />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/integrations" element={
        <ProtectedRoute>
          <Integrations />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/conversations" element={
        <ProtectedRoute>
          <Conversations />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/orders" element={
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/billing" element={
        <ProtectedRoute>
          <Billing />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/invoices" element={
        <ProtectedRoute>
          <Invoices />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/analytics" element={
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/team" element={
        <ProtectedRoute>
          <Team />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/email-preferences" element={
        <ProtectedRoute>
          <EmailPreferences />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/webhooks" element={
        <ProtectedRoute>
          <Webhooks />
        </ProtectedRoute>
      } />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BillingProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </BillingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
