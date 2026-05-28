import { Routes, Route } from "react-router-dom";
import Login from "../features/auth/pages/Login";

import OwnerDashboard from "../features/owner/pages/OwnerDashboard";
import AdminDashboard from "../features/admin/pages/AdminDashboard";

import OwnerLayout from "../layouts/OwnerLayout";
import AdminLayout from "../layouts/AdminLayout";

import RoleProtectedRoute from "./RoleProtectedRoute";

import Places from "../features/places/pages/Places";
import Orders from "../features/orders/pages/Orders";
import Reviews from "../features/reviews/pages/Reviews";
import Profile from "../features/profile/pages/Profile";
import Notifications from "../features/notifications/pages/Notifications";
import Properties from "../features/properties/pages/properties";

// admin pages
import Users from "../features/admin/pages/Users";
import Owners from "../features/admin/pages/Owners";
import AdminPlaces from "../features/admin/pages/Places";
import Reports from "../features/admin/pages/Reports";
import Items from "../features/items/pages/Items";
//import SubCategories from "../features/items/pages/SubCategories";
import AdminNotifications from "../features/admin/pages/Notifications";


export default function AppRoutes() {
  return (
    <Routes>

      {/* LOGIN */}
      <Route path="/" element={<Login />} />
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
        <Route index element={<OwnerDashboard />} />
        <Route path="places" element={<Places />} />
      {/*  <Route path="subcategories" element={<SubCategories />} /> */}
      <Route path="items" element={<Items />} />
        <Route path="orders" element={<Orders />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="properties" element={<Properties />} />
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
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="owners" element={<Owners />} />
        <Route path="places" element={<AdminPlaces />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<AdminNotifications />} />
        
      </Route>

    </Routes>
  );
}