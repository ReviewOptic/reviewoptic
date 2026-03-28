import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Templates from "@/pages/Templates";
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import ReviewLanding from "@/pages/ReviewLanding";
import StatDetail from "@/pages/StatDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Admin from "@/pages/Admin";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import Pricing from "@/pages/Pricing";
import Features from "@/pages/Features";
import AcceptInvite from "@/pages/AcceptInvite";
import BillingSuccess from "@/pages/BillingSuccess";
import Billing from "@/pages/Billing";
import Tutorial from "@/pages/Tutorial";
import FAQ from "@/pages/FAQ";
import Scan from "@/pages/Scan";

function PlanCancelled() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <img src="/logo.png" alt="ReviewOptic" className="h-28 mb-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Your plan has been cancelled</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your subscription has ended and your account is locked. Reactivate to regain access to all features — your data is safe and waiting for you.
        </p>
        <button
          onClick={() => navigate("/billing")}
          className="inline-block w-full bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors text-sm mt-2"
        >
          Reactivate my subscription
        </button>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && user.requiresPayment) {
      navigate("/pricing");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || user.requiresPayment) {
    return null;
  }

  // Cancelled plan — full access to browse but the banner blocks sending
  // (blocking at API level in requireAuth)

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/customers" component={Customers} />
        <Route path="/templates" component={Templates} />
        <Route path="/stat/:view" component={StatDetail} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/billing" component={Billing} />
        <Route path="/tutorial" component={Tutorial} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/review-landing" component={ReviewLanding} />
      <Route path="/review" component={ReviewLanding} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/features" component={Features} />
      <Route path="/faq" component={FAQ} />
      <Route path="/scan/:accountId" component={Scan} />
      <Route path="/billing/success" component={BillingSuccess} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
