import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  toggleAvailability,
} from "../services/propertiesServices";
import "./properties.css";

const EMPTY_FORM = {
  title: "", description: "", price: "", lat: "", lng: "",
  contact_number: "", whatsapp_number: "", owner_name: "", image: null,
};

export default function Properties() {
  const queryClient = useQueryClient();

  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch]         = useState("");
  const [viewProp, setViewProp]     = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const { data: properties = [], isLoading: loading } = useQuery({
    queryKey: ["properties"],
    queryFn:  getMyProperties,
    staleTime: 1000 * 60 * 5,
  });

  const invalidateProperties = () =>
    queryClient.invalidateQueries({ queryKey: ["properties"] });

  const openView = async (prop) => {
    setViewProp(prop);
    setViewLoading(true);
    try {
      const full = await getPropertyById(prop.id);
      setViewProp(full);
    } catch {
      // keep existing data
    } finally {
      setViewLoading(false);
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  };

  const openEdit = (prop) => {
    setEditItem(prop);
    setForm({
      title:           prop.title           || "",
      description:     prop.description     || "",
      price:           prop.price           || "",
      lat:             prop.latitude        || "",
      lng:             prop.longitude       || "",
      contact_number:  prop.contact_number?.join(", ") || "",
      whatsapp_number: prop.whatsapp_number || "",
      owner_name:      prop.owner_name      || "",
      image:           null,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim())     { setError("Title is required."); return; }
    if (!form.price)            { setError("Price is required."); return; }
    if (!form.lat || !form.lng) { setError("Location (lat/lng) is required."); return; }

    setSaving(true);
    setError("");
    try {
      const payload = {
        title:           form.title,
        description:     form.description,
        price:           Number(form.price),
        lat:             parseFloat(form.lat),
        lng:             parseFloat(form.lng),
        contact_number:  form.contact_number
          ? form.contact_number.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        whatsapp_number: form.whatsapp_number || null,
        owner_name:      form.owner_name      || null,
        image:           form.image || null,
      };

      if (editItem) await updateProperty(editItem.id, payload);
      else          await createProperty(payload);

      setShowModal(false);
      invalidateProperties();
    } catch (err) {
      setError(err?.response?.data?.detail?.[0]?.msg || "Something went wrong, please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    setDeletingId(id);
    try {
      await deleteProperty(id);
      queryClient.setQueryData(["properties"], (old = []) =>
        old.filter((p) => p.id !== id)
      );
      setViewProp(null);
    } catch {
      alert("Delete failed, please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleAvailability = async (prop) => {
    try {
      const updated = await toggleAvailability(prop.id, !prop.is_available);
      queryClient.setQueryData(["properties"], (old = []) =>
        old.map((p) => p.id === prop.id ? { ...p, is_available: updated.is_available } : p)
      );
      setViewProp((prev) => prev ? { ...prev, is_available: updated.is_available } : prev);
    } catch {
      alert("Failed to update status, please try again.");
    }
  };

  const filtered = properties.filter((p) =>
    !search.trim() ||
    (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="prop-page">

      {/* Header — title left, button right */}
      <div className="prop-header">
        <div>
          <h1 className="prop-title">🏠 Properties</h1>
          <p className="prop-subtitle">
            {loading ? "Loading..." : `${properties.length} property`}
          </p>
        </div>
        <button className="prop-add-btn" onClick={openAdd}>+ Add Property</button>
      </div>

      {/* Search — aligned left */}
      <div className="prop-search-wrap">
        <span className="prop-search-icon">🔍</span>
        <input
          className="prop-search"
          placeholder="Search for a property..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="prop-search-clear" onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="prop-loading">
          <div className="prop-spinner" />
          <p>Loading properties...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="prop-empty">
          <div className="prop-empty-icon">🏘️</div>
          <p>{search ? "No results found." : "No properties yet. Start by adding your first one!"}</p>
          {!search && (
            <button className="prop-add-btn" onClick={openAdd} style={{ marginTop: "16px" }}>
              + Add First Property
            </button>
          )}
        </div>
      ) : (
        <div className="prop-grid">
          {filtered.map((prop) => (
            <div
              key={prop.id}
              className={`prop-card ${!prop.is_available ? "prop-card-unavailable" : ""}`}
              onClick={() => openView(prop)}
              style={{ cursor: "pointer" }}
            >
              <div className="prop-card-img-wrap">
                {prop.main_image_url ? (
                  <img src={prop.main_image_url} alt={prop.title} className="prop-card-img" />
                ) : (
                  <div className="prop-card-img-placeholder">🏠</div>
                )}
                <span className={`prop-availability-badge ${prop.is_available ? "available" : "unavailable"}`}>
                  {prop.is_available ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="prop-card-body">
                <h3 className="prop-card-title">{prop.title}</h3>
                {prop.owner_name && (
                  <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    👤 {prop.owner_name}
                  </div>
                )}
                {prop.description && <p className="prop-card-desc">{prop.description}</p>}
                <div className="prop-card-price">💰 {Number(prop.price).toLocaleString()} EGP</div>
                <div className="prop-card-meta">
                  {prop.contact_number?.length > 0 && <span>📞 {prop.contact_number[0]}</span>}
                  {prop.whatsapp_number && <span>💬 {prop.whatsapp_number}</span>}
                </div>
                <div className="prop-card-stats">
                  <span>⭐ {prop.review_count ?? 0} reviews</span>
                  <span>❤️ {prop.favorite_count ?? 0} saves</span>
                </div>
                <div className="prop-card-actions">
                  <button className="prop-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit(prop); }}>✏️ Edit</button>
                  <button className="prop-del-btn" onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }} disabled={deletingId === prop.id}>
                    {deletingId === prop.id ? "..." : "🗑️ Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View Modal ── */}
      {viewProp && (
        <div className="prop-overlay" onClick={() => setViewProp(null)}>
          <div className="prop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prop-modal-header">
              <h2>🏠 Property Details</h2>
              <button className="prop-modal-close" onClick={() => setViewProp(null)}>✕</button>
            </div>
            <div className="prop-modal-body">
              {viewLoading ? (
                <div className="prop-loading"><div className="prop-spinner" /><p>Loading details...</p></div>
              ) : (
                <>
                  {viewProp.main_image_url ? (
                    <img src={viewProp.main_image_url} alt={viewProp.title}
                      style={{ width: "100%", borderRadius: "12px", maxHeight: "200px", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "140px", background: "#f1f0ec", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>🏠</div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{viewProp.title}</h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", background: viewProp.is_available ? "#dcfce7" : "#fee2e2", color: viewProp.is_available ? "#15803d" : "#b91c1c" }}>
                      {viewProp.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {viewProp.owner_name && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e4e2dd", borderRadius: "10px", fontSize: "13px", color: "#475569", fontWeight: 500 }}>
                      👤 <span style={{ color: "#0f172a", fontWeight: 600 }}>{viewProp.owner_name}</span>
                    </div>
                  )}

                  {viewProp.description && (
                    <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: 1.6 }}>{viewProp.description}</p>
                  )}

                  <div style={{ background: "#f8fafc", border: "1px solid #e4e2dd", borderRadius: "10px", padding: "12px 16px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                    💰 {Number(viewProp.price).toLocaleString()} EGP
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {viewProp.contact_number?.length > 0 && <div style={{ fontSize: "13px", color: "#475569" }}>📞 {viewProp.contact_number.join(" / ")}</div>}
                    {viewProp.whatsapp_number && <div style={{ fontSize: "13px", color: "#475569" }}>💬 {viewProp.whatsapp_number}</div>}
                    {viewProp.latitude && viewProp.longitude && <div style={{ fontSize: "13px", color: "#475569" }}>📍 {viewProp.latitude}, {viewProp.longitude}</div>}
                  </div>

                  <div style={{ display: "flex", gap: "16px", padding: "12px 0", borderTop: "1px solid #f1f0ec", fontSize: "13px", color: "#94a3b8" }}>
                    <span>⭐ {viewProp.review_count ?? 0} reviews</span>
                    <span>❤️ {viewProp.favorite_count ?? 0} saves</span>
                  </div>

                  {viewProp.created_at && (
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Date added: {new Date(viewProp.created_at).toLocaleDateString("en-US")}
                    </div>
                  )}

                  <button
                    onClick={() => handleToggleAvailability(viewProp)}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "inherit", background: viewProp.is_available ? "#fee2e2" : "#dcfce7", color: viewProp.is_available ? "#b91c1c" : "#15803d" }}
                  >
                    {viewProp.is_available ? "🔴 Mark as Unavailable" : "🟢 Mark as Available"}
                  </button>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="prop-edit-btn" style={{ flex: 1, padding: "10px" }} onClick={() => { setViewProp(null); openEdit(viewProp); }}>✏️ Edit</button>
                    <button className="prop-del-btn" style={{ flex: 1, padding: "10px" }} onClick={() => { setViewProp(null); handleDelete(viewProp.id); }}>🗑️ Delete</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit/Add Modal ── */}
      {showModal && (
        <div className="prop-overlay" onClick={() => setShowModal(false)}>
          <div className="prop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prop-modal-header">
              <h2>{editItem ? "Edit Property" : "Add New Property"}</h2>
              <button className="prop-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="prop-modal-body">
              <div className="prop-form-row">
                <label>Title *</label>
                <input className="prop-input" placeholder="e.g. 3-bedroom apartment in Maadi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="prop-form-row">
                <label>Owner Name</label>
                <input className="prop-input" placeholder="e.g. Ahmed Mohamed" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
              </div>
              <div className="prop-form-row">
                <label>Description</label>
                <textarea className="prop-input prop-textarea" placeholder="Detailed description of the property..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="prop-form-row">
                <label>Price (EGP) *</label>
                <input className="prop-input" type="number" placeholder="e.g. 5000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="prop-form-grid">
                <div className="prop-form-row">
                  <label>Latitude *</label>
                  <input className="prop-input" type="number" placeholder="e.g. 29.9792" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
                </div>
                <div className="prop-form-row">
                  <label>Longitude *</label>
                  <input className="prop-input" type="number" placeholder="e.g. 31.1342" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
                </div>
              </div>
              <div className="prop-form-row">
                <label>Contact Number</label>
                <input className="prop-input" placeholder="e.g. 01012345678, 01098765432" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
                <span className="prop-hint">Separate multiple numbers with a comma</span>
              </div>
              <div className="prop-form-row">
                <label>WhatsApp Number</label>
                <input className="prop-input" placeholder="e.g. 01012345678" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} />
              </div>
              <div className="prop-form-row">
                <label>Property Image</label>
                <input type="file" accept="image/*" className="prop-input" onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
                {editItem?.main_image_url && !form.image && (
                  <img src={editItem.main_image_url} alt="current" style={{ marginTop: "8px", width: "100%", borderRadius: "8px", maxHeight: "150px", objectFit: "cover" }} />
                )}
              </div>

              {error && <p className="prop-error">⚠️ {error}</p>}

              <button className="prop-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editItem ? "💾 Save Changes" : "✅ Add Property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}