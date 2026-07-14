import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState, lazy, Suspense } from "react";
import { Mail } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import CookieConsent from "@/components/CookieConsent";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/context/ThemeContext";

const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerDetail = lazy(() => import("@/pages/CustomerDetail"));
const Templates = lazy(() => import("@/pages/Templates"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const ReviewLanding = lazy(() => import("@/pages/ReviewLanding"));
const StatDetail = lazy(() => import("@/pages/StatDetail"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const Admin = lazy(() => import("@/pages/Admin"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("@/pages/TermsAndConditions"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Features = lazy(() => import("@/pages/Features"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const BillingSuccess = lazy(() => import("@/pages/BillingSuccess"));
const Billing = lazy(() => import("@/pages/Billing"));
const Tutorial = lazy(() => import("@/pages/Tutorial"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Scan = lazy(() => import("@/pages/Scan"));
const Home = lazy(() => import("@/pages/Home"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));

function useTrackingPixels() {
  useEffect(() => {
    fetch("/api/platform/tracking")
      .then(r => r.json())
      .then(({ meta_pixel_id, google_tag_id, tiktok_pixel_id }) => {
        // Meta Pixel
        if (meta_pixel_id && !document.getElementById("meta-pixel")) {
          const s = document.createElement("script");
          s.id = "meta-pixel";
          s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta_pixel_id}');fbq('track','PageView');`;
          document.head.appendChild(s);
        }
        // Google Tag Manager
        if (google_tag_id && !document.getElementById("gtm-script")) {
          const s = document.createElement("script");
          s.id = "gtm-script";
          s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${google_tag_id}');`;
          document.head.appendChild(s);
        }
        // TikTok Pixel
        if (tiktok_pixel_id && !document.getElementById("tiktok-pixel")) {
          const s = document.createElement("script");
          s.id = "tiktok-pixel";
          s.innerHTML = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._s=ttq._s||{};ttq._s[e]=n;var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`;
          document.head.appendChild(s);
        }
      })
      .catch(() => {});
  }, []);
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function AccountSuspended() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <img src="/logo.png" alt="ReviewOptic" className="h-28 mb-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Your account has been suspended</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Access to your account has been suspended. Please contact us to resolve this.
        </p>
        <a
          href="mailto:hello@reviewoptic.com"
          className="inline-block w-full bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors text-sm mt-2"
        >
          Contact hello@reviewoptic.com
        </a>
      </div>
    </div>
  );
}

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

function VerifyEmailPrompt() {
  const { user } = useAuth();
  const [resendDone, setResendDone] = useState(false);

  async function resend() {
    if (!user?.email) return;
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    setResendDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <img src="/logo.png" alt="ReviewOptic" className="h-28 mb-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-sm w-full text-left shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Mail className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="font-semibold text-gray-900">Please verify your email</h2>
        </div>
        <p className="text-sm text-gray-500 mb-2">
          We sent a verification link to <strong>{user?.email}</strong>. Click it to access your dashboard.
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Can't see it? Check your spam or junk folder.
        </p>
        <button
          onClick={resend}
          disabled={resendDone}
          className="text-sm text-blue-600 hover:underline font-medium disabled:opacity-50"
        >
          {resendDone ? "Email resent!" : "Resend verification email"}
        </button>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user && location !== "/") {
      navigate("/login");
    } else if (!loading && user && user.requiresPayment) {
      navigate("/pricing");
    }
  }, [user, loading, location]);

  if (loading) return <PageLoader />;

  if (location === "/" && !user) return <Home />;

  if (user?.isSuspended) return <AccountSuspended />;

  if (!user || user.requiresPayment) return null;

  if (!user.emailVerified) return <VerifyEmailPrompt />;

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
  useTrackingPixels();
  return (
    <Switch>
      <Route path="/review-landing" component={ReviewLanding} />
      <Route path="/review" component={ReviewLanding} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/blog" component={Blog} />
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
        <ThemeProvider>
          <AuthProvider>
            <Toaster />
            <CookieConsent />
            <Suspense fallback={<PageLoader />}>
              <Router />
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
