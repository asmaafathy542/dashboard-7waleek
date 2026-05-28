import { useState, useEffect } from "react";
import { addBranch, getCategories } from "../services/placesService";
import { useLanguage } from "../../../context/LanguageContext";
import "./AddBranchModal.css";

const EMPTY_FORM = {
  name:            "",
  description:     "",
  address:         "",
  phone:           "",
  website:         "",
  latitude:        "",
  longitude:       "",
  location_link:   "",
  category_id:     "",
  instagram_url:   "",
  facebook_url:    "",
  whatsapp_number: "",
  tiktok_url:      "",
  delivery_price:  "",
  working_hours:   "",
};

export default function AddBranchModal({ onClose, onSuccess }) {
  const { t } = useLanguage();
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim())    return setError(t("abm_err_name"));
    if (!form.address.trim()) return setError(t("abm_err_address"));
    if (!form.category_id)    return setError(t("abm_err_category"));

    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        phone:          form.phone          ? [form.phone]                : [],
        latitude:       form.latitude       ? Number(form.latitude)       : undefined,
        longitude:      form.longitude      ? Number(form.longitude)      : undefined,
        category_id:    form.category_id    ? Number(form.category_id)    : undefined,
        delivery_price: form.delivery_price ? Number(form.delivery_price) : undefined,
      };

      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === undefined) delete payload[k];
      });

      const newBranch = await addBranch(payload);
      onSuccess?.(newBranch);
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        t("abm_err_default");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="abm-overlay" onClick={onClose}>
      <div className="abm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="abm-header">
          <h2 className="abm-title">{t("abm_title")}</h2>
          <button className="abm-close" onClick={onClose}>✕</button>
        </div>

        <div className="abm-body">

          {/* ── Basic Info ── */}
          <div className="abm-section-title">{t("abm_basic_info")}</div>
          <div className="abm-row">
            <div className="abm-field abm-required">
              <label>{t("abm_branch_name")}</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t("abm_branch_name_placeholder")}
              />
            </div>
            <div className="abm-field abm-required">
              <label>{t("abm_category")}</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                disabled={catLoading}
              >
                <option value="">
                  {catLoading ? t("abm_loading_categories") : t("abm_select_category")}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="abm-field">
            <label>{t("abm_description")}</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder={t("abm_description_placeholder")}
              rows={3}
            />
          </div>

          {/* ── Location ── */}
          <div className="abm-section-title">{t("abm_location")}</div>
          <div className="abm-field abm-required">
            <label>{t("abm_address")}</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder={t("abm_address_placeholder")}
            />
          </div>

          {/* Location Link — auto-extract lat/lng */}
          <div className="abm-field">
            <label>
              Location Link
              <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "11px", marginRight: "6px" }}>
                (هيستخرج الكوردينيتس تلقائياً)
              </span>
            </label>
            <input
              name="location_link"
              type="url"
              value={form.location_link || ""}
              placeholder="https://maps.google.com/..."
              onChange={(e) => {
                const url = e.target.value;
                setForm((prev) => {
                  const updated = { ...prev, location_link: url };
                  const patterns = [
                    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
                    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
                    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
                    /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
                  ];
                  for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match) {
                      updated.latitude = match[1];
                      updated.longitude = match[2];
                      break;
                    }
                  }
                  return updated;
                });
              }}
            />
          </div>

          <div className="abm-row">
            <div className="abm-field">
              <label>
                {t("abm_latitude")}
                <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "11px", marginRight: "4px" }}>(22→32)</span>
              </label>
              <input
                name="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={handleChange}
                placeholder="e.g. 30.0444"
              />
            </div>
            <div className="abm-field">
              <label>
                {t("abm_longitude")}
                <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "11px", marginRight: "4px" }}>(24→37)</span>
              </label>
              <input
                name="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={handleChange}
                placeholder="e.g. 31.2357"
              />
            </div>
          </div>

          {/* Use My Location button */}
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
              navigator.geolocation.getCurrentPosition(
                (pos) => setForm((prev) => ({ ...prev, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) })),
                () => setError("Could not get location. Please allow access.")
              );
            }}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "8px",
              border: "1px solid #2563eb", background: "#eff6ff",
              color: "#2563eb", fontSize: "13px", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              marginBottom: "12px",
            }}
          >
            &#128205; {t("abm_use_my_location") || "Use My Location"}
          </button>

          {/* Map Preview */}
          {(() => {
            const lat = parseFloat(form.latitude);
            const lng = parseFloat(form.longitude);
            if (!form.latitude || !form.longitude || isNaN(lat) || isNaN(lng)) return null;
            const validEgypt = lat >= 22 && lat <= 32 && lng >= 24 && lng <= 37;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
            return (
              <div style={{ marginBottom: "12px" }}>
                {!validEgypt ? (
                  <div style={{ marginBottom: "8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "9px 13px", fontSize: "12px", color: "#92400e", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span>&#9888;&#65039;</span>
                    <span><strong>تحذير:</strong> الكوردينيتس خارج نطاق مصر — تأكد انك مش عكستهم!</span>
                  </div>
                ) : (
                  <div style={{ marginBottom: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "9px 13px", fontSize: "12px", color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                    &#10003; الكوردينيتس في النطاق الصح
                  </div>
                )}
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  &#128506;&#65039; Map Preview
                </div>
                <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e4e2dd" }}>
                  <iframe
                    title="branch-map-preview"
                    src={embedUrl}
                    width="100%"
                    height="200"
                    style={{ display: "block", border: "none" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "7px", fontSize: "12px", color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                  &#128279; افتح في Google Maps للتأكيد
                </a>
              </div>
            );
          })()}

          {/* ── Contact ── */}
          <div className="abm-section-title">{t("abm_contact")}</div>
          <div className="abm-row">
            <div className="abm-field">
              <label>{t("abm_phone")}</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder={t("abm_phone_placeholder")}
              />
            </div>
            <div className="abm-field">
              <label>{t("abm_whatsapp")}</label>
              <input
                name="whatsapp_number"
                value={form.whatsapp_number}
                onChange={handleChange}
                placeholder={t("abm_phone_placeholder")}
              />
            </div>
          </div>
          <div className="abm-field">
            <label>{t("abm_website")}</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          {/* ── Social ── */}
          <div className="abm-section-title">{t("abm_social")}</div>
          <div className="abm-row">
            <div className="abm-field">
              <label>{t("abm_instagram")}</label>
              <input
                name="instagram_url"
                value={form.instagram_url}
                onChange={handleChange}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="abm-field">
              <label>{t("abm_facebook")}</label>
              <input
                name="facebook_url"
                value={form.facebook_url}
                onChange={handleChange}
                placeholder="https://facebook.com/..."
              />
            </div>
          </div>
          <div className="abm-field">
            <label>{t("abm_tiktok")}</label>
            <input
              name="tiktok_url"
              value={form.tiktok_url}
              onChange={handleChange}
              placeholder="https://tiktok.com/..."
            />
          </div>

          {/* ── Business ── */}
          <div className="abm-section-title">{t("abm_business")}</div>
          <div className="abm-row">
            <div className="abm-field">
              <label>{t("abm_delivery_price")}</label>
              <input
                name="delivery_price"
                type="number"
                value={form.delivery_price}
                onChange={handleChange}
                placeholder="e.g. 25"
              />
            </div>
            <div className="abm-field">
              <label>{t("abm_working_hours")}</label>
              <input
                name="working_hours"
                value={form.working_hours}
                onChange={handleChange}
                placeholder='e.g. {"sat": "9:00-22:00"}'
              />
            </div>
          </div>

          {error && <div className="abm-error">⚠️ {error}</div>}

        </div>

        {/* Footer */}
        <div className="abm-footer">
          <button className="abm-cancel-btn" onClick={onClose} disabled={loading}>
            {t("abm_cancel")}
          </button>
          <button
            className="abm-submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t("abm_adding") : t("abm_add_branch")}
          </button>
        </div>

      </div>
    </div>
  );
}