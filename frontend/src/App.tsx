import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Parcels } from "./pages/Parcels";
import { AirwayBill } from "./pages/AirwayBill";
import { AddressVerification } from "./pages/AddressVerification";
import { Tracking } from "./pages/Tracking";
import { Fleet } from "./pages/Fleet";
import { Warehouses } from "./pages/Warehouses";
import { Supplies } from "./pages/Supplies";
import { Clients } from "./pages/Clients";
import { Invoicing } from "./pages/Invoicing";
import { Expenses } from "./pages/Expenses";
import { Reports } from "./pages/Reports";
import { Roles } from "./pages/Roles";
import { CustomerLogin } from "./pages/CustomerLogin";
import { PortalLayout } from "./components/portal/PortalLayout";
import { PortalProtectedRoute } from "./components/portal/PortalProtectedRoute";
import { PortalParcels } from "./pages/portal/PortalParcels";
import { PortalAirwayBill } from "./pages/portal/PortalAirwayBill";
import { PortalAddressVerification } from "./pages/portal/PortalAddressVerification";
import { PortalFleet } from "./pages/portal/PortalFleet";
import { PortalInvoices } from "./pages/portal/PortalInvoices";
import { PortalTracking } from "./pages/portal/PortalTracking";
import { RiderLogin } from "./pages/RiderLogin";
import { RiderProtectedRoute } from "./components/rider/RiderProtectedRoute";
import { RiderLayout } from "./components/rider/RiderLayout";
import { RiderDeliveries } from "./pages/rider/RiderDeliveries";
import { PublicTracking } from "./pages/PublicTracking";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/rider/login" element={<RiderLogin />} />
            <Route path="/track" element={<PublicTracking />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/parcels"
                element={
                  <ProtectedRoute feature="parcels">
                    <Parcels />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/airway-bill"
                element={
                  <ProtectedRoute feature="airway_bill">
                    <AirwayBill />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/address-verification"
                element={
                  <ProtectedRoute feature="address_verification">
                    <AddressVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking"
                element={
                  <ProtectedRoute feature="tracking">
                    <Tracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fleet"
                element={
                  <ProtectedRoute feature="fleet">
                    <Fleet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/warehouses"
                element={
                  <ProtectedRoute feature="warehouses">
                    <Warehouses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supplies"
                element={
                  <ProtectedRoute feature="supplies">
                    <Supplies />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute feature="clients">
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoicing"
                element={
                  <ProtectedRoute feature="invoicing">
                    <Invoicing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute feature="expenses">
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute feature="reports">
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute ownerOnly>
                    <Roles />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route
              element={
                <PortalProtectedRoute>
                  <PortalLayout />
                </PortalProtectedRoute>
              }
            >
              <Route path="/portal" element={<PortalParcels />} />
              <Route path="/portal/airway-bill" element={<PortalAirwayBill />} />
              <Route path="/portal/address-verification" element={<PortalAddressVerification />} />
              <Route path="/portal/tracking" element={<PortalTracking />} />
              <Route path="/portal/fleet" element={<PortalFleet />} />
              <Route path="/portal/invoices" element={<PortalInvoices />} />
            </Route>
            <Route
              element={
                <RiderProtectedRoute>
                  <RiderLayout />
                </RiderProtectedRoute>
              }
            >
              <Route path="/rider" element={<RiderDeliveries />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
