import { Routes, Route, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";

// ── Always loaded (auth + layouts) ──────────────────────────────────────────
import Login from "../features/auth/pages/Login";
import OwnerLayout from "../layouts/OwnerLayout";
import AdminLayout from "../layouts/AdminLayout";
import RoleProtectedRoute from "./RoleProtectedRoute";

// ── Owner pages — lazy ───────────────────────────────────────────────────────
const OwnerDashboard    = lazy(() => import("../features/owner/pages/OwnerDashboard"));
const Places            = lazy(() => import("../features/places/pages/Places"));
const Items             = lazy(() => import("../features/items/pages/Items"));
const Orders            = lazy(() => import("../features/orders/pages/Orders"));
const Reviews           = lazy(() => import("../features/reviews/pages/Reviews"));
const Profile           = lazy(() => import("../features/profile/pages/Profile"));
const Notifications     = lazy(() => import("../features/notifications/pages/Notifications"));
const Properties        = lazy(() => import("../features/properties/pages/properties"));

// ── Admin pages — lazy ───────────────────────────────────────────────────────
const AdminDashboard      = lazy(() => import("../features/admin/pages/AdminDashboard"));
const Users               = lazy(() => import("../features/admin/pages/Users"));
const Owners              = lazy(() => import("../features/admin/pages/Owners"));
const AdminPlaces         = lazy(() => import("../features/admin/pages/Places"));
const AdminNotifications  = lazy(() => import("../features/admin/pages/Notifications"));
const Items2              = lazy(() => import("../features/items/pages/Items"));

// ── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "60vh", flexDirection: "column", gap: "12px",
    }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "50%",
        border: "3px solid var(--color-primary, #2148B0)",
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>

      {/* LOGIN */}
      <Route path="/"      element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* OWNER ROUTES */}
      <Route
        path="/owner-dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["OWNER"]}>
            <OwnerLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index          element={<Suspense fallback={<PageLoader />}><OwnerDashboard /></Suspense>} />
        <Route path="places"  element={<Suspense fallback={<PageLoader />}><Places /></Suspense>} />
        <Route path="items"   element={<Suspense fallback={<PageLoader />}><Items /></Suspense>} />
        <Route path="orders"  element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
        <Route path="reviews" element={<Suspense fallback={<PageLoader />}><Reviews /></Suspense>} />
        <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
        <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
        <Route path="properties"    element={<Suspense fallback={<PageLoader />}><Properties /></Suspense>} />
      </Route>

      {/* ADMIN ROUTES */}
      <Route
        path="/admin-dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index                element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
        <Route path="users"         element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />
        <Route path="owners"        element={<Suspense fallback={<PageLoader />}><Owners /></Suspense>} />
        <Route path="places"        element={<Suspense fallback={<PageLoader />}><AdminPlaces /></Suspense>} />
        <Route path="notifications" element={<Suspense fallback={<PageLoader />}><AdminNotifications /></Suspense>} />
      </Route>

    </Routes>
  );
}