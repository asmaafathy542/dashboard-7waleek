// Orders.jsx
import { useState, useMemo, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrdersByBranch,
  updateOrderStatus,
  deleteOrder,
} from "../services/ordersService";
import * as XLSX from "xlsx";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import "./orders.css";

const STATUS_OPTIONS = ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"];

const ALLOWED_TRANSITIONS = {
  PENDING:   ["ACCEPTED", "REJECTED"],
  ACCEPTED:  [],
  REJECTED:  [],
  CANCELLED: [],
};

const statusClass = {
  PENDING: "status-pending",
  ACCEPTED: "status-accepted",
  REJECTED: "status-rejected",
  CANCELLED: "status-rejected",
};

const statusLabel = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

export default function Orders() {
  const { selectedPlaceId, placeName } = useOutletContext() ?? {};
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const knownIdsRef = useRef(null);

  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ["orders", selectedPlaceId],
    queryFn: async () => {
      const data = await getOrdersByBranch(selectedPlaceId);
      const arr = Array.isArray(data) ? data : [data];

      // كشف الأوردرات الجديدة عند الـ polling
      if (knownIdsRef.current !== null) {
        const newOrders = arr.filter((o) => !knownIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          playBeep();
          setNewOrderAlert(
            `${newOrders.length} new order${newOrders.length > 1 ? "s" : ""}!`
          );
          setTimeout(() => setNewOrderAlert(null), 5000);
        }
      }
      knownIdsRef.current = new Set(arr.map((o) => o.id));
      return arr;
    },
    enabled: !!selectedPlaceId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 30000, // polling كل 30 ثانية بدل setInterval
  });

  const handleRowClick = (order) => setSelected(order);

  const handleStatusChange = async (orderId, newStatus) => {
    const prevStatus = orders.find((o) => o.id === orderId)?.status;

    // Optimistic update
    queryClient.setQueryData(["orders", selectedPlaceId], (prev) =>
      (prev ?? []).map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selected?.id === orderId) setSelected((prev) => ({ ...prev, status: newStatus }));

    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus);
      queryClient.setQueryData(["orders", selectedPlaceId], (prev) =>
        (prev ?? []).map((o) => (o.id === orderId ? updatedOrder : o))
      );
      if (selected?.id === orderId) setSelected(updatedOrder);
    } catch (err) {
      // Rollback
      queryClient.setQueryData(["orders", selectedPlaceId], (prev) =>
        (prev ?? []).map((o) => (o.id === orderId ? { ...o, status: prevStatus } : o))
      );
      if (selected?.id === orderId) setSelected((prev) => ({ ...prev, status: prevStatus }));
      alert(err?.response?.data?.error?.message || "فشل التغيير، حاول تاني");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteOrder(confirmDelete.id);
      queryClient.setQueryData(["orders", selectedPlaceId], (prev) =>
        (prev ?? []).filter((o) => o.id !== confirmDelete.id)
      );
      setSelected(null);
      setConfirmDelete(null);
    } catch (err) {
      alert(err?.response?.data?.error?.message || "فشل الحذف، حاول تاني");
    } finally {
      setDeleting(false);
    }
  };

  const copyUserId = (userId) => {
    navigator.clipboard.writeText(String(userId)).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const exportExcel = () => {
    const rows = filtered.map((o) => ({
      "#": o.id,
      "User ID": o.user_id ?? "",
      Customer: o.full_name,
      Phone: o.phone_number,
      Address: o.address,
      Type: o.order_type?.replace("_", " "),
      Total: `${o.total_price} EGP`,
      Date: new Date(o.created_at).toLocaleDateString(),
      Status: statusLabel[o.status] || o.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders-${placeName || "branch"}.xlsx`);
  };

  const exportCSV = () => {
    const headers = ["#", "User ID", "Customer", "Phone", "Address", "Type", "Total", "Date", "Status"];
    const rows = filtered.map((o) => [
      o.id, o.user_id ?? "", o.full_name, o.phone_number, o.address,
      o.order_type?.replace("_", " "),
      `${o.total_price} EGP`,
      new Date(o.created_at).toLocaleDateString(),
      statusLabel[o.status] || o.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${placeName || "branch"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = orders
    .filter((o) => o.status === "ACCEPTED")
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  const filtered = orders.filter((o) => filterStatus === "ALL" || o.status === filterStatus);

  const [pageSize, setPageSize] = useState(10);
  const pagination = usePagination(filtered, pageSize);
  const { paginated, reset: resetPage } = pagination;
  useMemo(() => { resetPage(); }, [filterStatus]);

  if (!selectedPlaceId) return <div className="or-loading">Loading branch...</div>;
  if (loading) return <div className="or-loading">Loading...</div>;

  return (
    <div className="or-page">
      {newOrderAlert && (
        <div className="or-new-alert">
          🔔 {newOrderAlert}
          <button onClick={() => setNewOrderAlert(null)}>✕</button>
        </div>
      )}

      <div className="or-header">
        <div>
          <h1 className="or-title">Orders — {placeName}</h1>
          <p className="or-subtitle">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="or-export-btns">
          <button className="or-export-btn" onClick={exportExcel}>⬇️ Excel</button>
          <button className="or-export-btn or-export-csv" onClick={exportCSV}>⬇️ CSV</button>
        </div>
      </div>

      <div className="or-stats">
        <div className="or-stat-card">
          <span className="or-stat-label">Total Orders</span>
          <span className="or-stat-value">{orders.length}</span>
        </div>
        <div className="or-stat-card">
          <span className="or-stat-label">Total Revenue</span>
          <span className="or-stat-value">{totalRevenue.toLocaleString()} EGP</span>
        </div>
        <div className="or-stat-card">
          <span className="or-stat-label">Pending</span>
          <span className="or-stat-value or-stat-pending">{pendingCount}</span>
        </div>
      </div>

      <div className="or-filters">
        <div className="or-filter-tabs">
          {["ALL", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              className={`or-filter-tab ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === "ALL" ? "All" : statusLabel[s]}
              <span className="or-filter-count">
                {s === "ALL" ? orders.length : orders.filter((o) => o.status === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="or-empty">No orders found.</div>
      ) : (
        <div className="or-table-wrap">
          <table className="or-table">
            <thead>
              <tr>
                <th>#</th><th>Customer</th><th>Phone</th><th>Address</th>
                <th>Type</th><th>Total</th><th>Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order) => (
                <tr key={order.id} className="or-row-clickable" onClick={() => handleRowClick(order)}>
                  <td className="or-id">#{order.id}</td>
                  <td>{order.full_name}</td>
                  <td>{order.phone_number}</td>
                  <td>{order.address}</td>
                  <td className="or-type">{order.order_type?.replace("_", " ")}</td>
                  <td className="or-price">{order.total_price} EGP</td>
                  <td className="or-date">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`or-status ${statusClass[order.status]}`}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={ALLOWED_TRANSITIONS[order.status]?.length === 0}
                    >
                      <option value={order.status}>{statusLabel[order.status]}</option>
                      {ALLOWED_TRANSITIONS[order.status]?.map((s) => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            {...pagination}
            pageSize={pageSize}
            onPageSize={(s) => { setPageSize(s); resetPage(); }}
            onNext={pagination.next}
            onPrev={pagination.prev}
            onGoTo={pagination.goTo}
          />
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="or-modal-overlay" onClick={() => setSelected(null)}>
          <div className="or-modal" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-header">
              <h2>Order #{selected.id}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {["COMPLETED", "CANCELLED", "REJECTED"].includes(selected.status) && (
                  <button className="or-delete-btn or-delete-btn--modal" onClick={() => setConfirmDelete(selected)}>
                    🗑 Delete
                  </button>
                )}
                <button className="or-modal-close" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>
            <div className="or-modal-body">
              <div className="or-modal-section">
                <h3>Customer Info</h3>
                <div className="or-modal-row"><span>Name</span><span>{selected.full_name}</span></div>
                <div className="or-modal-row"><span>Phone</span><span>{selected.phone_number}</span></div>
                <div className="or-modal-row"><span>Address</span><span>{selected.address}</span></div>
                {selected.notes && <div className="or-modal-row"><span>Notes</span><span>{selected.notes}</span></div>}
                {selected.user_id != null && (
                  <div className="or-modal-row">
                    <span>User ID</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ color: "#2563eb" }}>{selected.user_id}</strong>
                      <button
                        onClick={() => copyUserId(selected.user_id)}
                        style={{
                          background: copiedId ? "#10b981" : "#eff6ff",
                          color: copiedId ? "#fff" : "#2563eb",
                          border: "none", borderRadius: "6px", padding: "3px 10px",
                          fontSize: "12px", cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        {copiedId ? "✓ Copied!" : "Copy"}
                      </button>
                    </span>
                  </div>
                )}
              </div>
              <div className="or-modal-section">
                <h3>Order Info</h3>
                <div className="or-modal-row"><span>Order ID</span><span>#{selected.id}</span></div>
                <div className="or-modal-row"><span>Type</span><span>{selected.order_type?.replace("_", " ")}</span></div>
                <div className="or-modal-row"><span>Total</span><span className="or-modal-price">{selected.total_price} EGP</span></div>
                <div className="or-modal-row"><span>Date</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
                <div className="or-modal-row">
                  <span>Status</span>
                  <select
                    className={`or-status ${statusClass[selected.status]}`}
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                    disabled={ALLOWED_TRANSITIONS[selected.status]?.length === 0}
                  >
                    <option value={selected.status}>{statusLabel[selected.status]}</option>
                    {ALLOWED_TRANSITIONS[selected.status]?.map((s) => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selected.items?.length > 0 ? (
                <div className="or-modal-section">
                  <h3>Items</h3>
                  {selected.items.map((item, i) => (
                    <div key={i} className="or-modal-item">
                      <div className="or-modal-row">
                        <span className="or-item-name">{item.item_name}</span>
                        <span className="or-item-qty">x{item.quantity}</span>
                      </div>
                      <div className="or-modal-row">
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                          {item.unit_price} EGP × {item.quantity}
                        </span>
                        <span className="or-modal-price">{item.total_price} EGP</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="or-modal-section">
                  <h3>Items</h3>
                  <div className="or-modal-row"><span style={{ color: "#94a3b8" }}>No items found</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="or-modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="or-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Order #{confirmDelete.id}?</h3>
            <p>Customer: {confirmDelete.full_name}</p>
            <p>This action cannot be undone.</p>
            <div className="or-confirm-actions">
              <button className="or-confirm-cancel" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button className="or-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}