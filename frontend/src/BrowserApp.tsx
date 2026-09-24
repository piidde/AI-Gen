import RequireAuth from "./auth/RequireAuth";
import BillingDemoProvider from "./data/BillingDemoProvider";
import KeyDemoProvider from "./data/KeyDemoProvider";
import AccountDemoProvider from "./data/AccountDemoProvider";
import DashboardLayout from "./components/DashboardLayout";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Usage from "./pages/Usage";
import Billing from "./pages/Billing";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import Signup from "./pages/Signup";
import UpdatePassword from "./pages/UpdatePassword";
import { Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import App from './App';
import Models from './pages/Models';
export default function BrowserApp() { return <AuthProvider><BillingDemoProvider><KeyDemoProvider><AccountDemoProvider><App>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="models" element={<Models />} />
          <Route path="usage" element={<Usage />} />
          <Route path="billing" element={<Billing />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="settings" element={<Settings />} />
        </Route>
</App></AccountDemoProvider></KeyDemoProvider></BillingDemoProvider></AuthProvider>; }
