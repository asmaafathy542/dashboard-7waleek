import { Link } from "react-router-dom";

export default function AdminSidebar() {
  return (
    <div
      style={{
        width: "220px",
        height: "100vh",
        background: "#111",
        color: "white",
        padding: "20px"
      }}
    >
      <h2>Admin Panel</h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Link to="/admin-dashboard">Dashboard</Link>
        <Link to="/admin-dashboard/users">Users</Link>
        <Link to="/admin-dashboard/owners">Owners</Link>
        <Link to="/admin-dashboard/places">Places</Link>
        <Link to="/admin-dashboard/reports">Reports</Link>
      </nav>
    </div>
  );
}