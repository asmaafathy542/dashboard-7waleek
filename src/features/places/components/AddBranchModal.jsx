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
          <div className="abm-row">
            <div className="abm-field">
              <label>{t("abm_latitude")}</label>
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
              <label>{t("abm_longitude")}</label>
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