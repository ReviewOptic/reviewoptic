import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Router() {
  return (
    <Switch>
      <Route path="/review-landing" component={ReviewLanding} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/customers/:id" component={CustomerDetail} />
            <Route path="/customers" component={Customers} />
            <Route path="/templates" component={Templates} />
            <Route path="/stat/:view" component={StatDetail} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
