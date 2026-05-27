import { Routes, Route } from "react-router-dom";

import Login from "../features/auth/pages/Login";
import Dashboard from "../features/dashboard/pages/Dashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}