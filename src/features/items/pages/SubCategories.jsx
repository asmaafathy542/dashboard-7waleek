import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";
import {
    getSubCategories,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
} from "../services/itemsService";
import "./SubCategories.css";

export default function SubCategories() {
    const context = useOutletContext() ?? {};
    const { selectedPlaceId } = context;
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: "", description: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const { data: subCats = [], isLoading: loading } = useQuery({
        queryKey: ["sub-categories", selectedPlaceId],
        queryFn: () => getSubCategories(selectedPlaceId),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 5,
    });

    const invalidateSubCats = () =>
        queryClient.invalidateQueries({ queryKey: ["sub-categories", selectedPlaceId] });

    const openAdd = () => {
        setEditItem(null);
        setForm({ name: "", description: "" });
        setError("");
        setShowModal(true);
    };

    const openEdit = (sc) => {
        setEditItem(sc);
        setForm({ name: sc.name ?? "", description: sc.description ?? "" });
        setError("");
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return setError(t("it_name_required"));
        setSaving(true);
        setError("");
        try {
            const payload = { name: form.name, description: form.description, place_id: selectedPlaceId };
            if (editItem) await updateSubCategory(editItem.id, payload);
            else await createSubCategory(payload);
            setShowModal(false);
            invalidateSubCats();
        } catch (err) {
            setError(
                err?.response?.data?.error?.message ||
                err?.response?.data?.message ||
                t("it_something_wrong")
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t("sc_confirm_delete"))) return;
        await deleteSubCategory(id);
        invalidateSubCats();
    };

    if (loading) return <div className="sc-loading">{t("loading")}</div>;

    return (
        <div className="sc-page">
            <div className="sc-header">
                <div>
                    <h1 className="sc-title">{t("sc_title")}</h1>
                    <p className="sc-subtitle">{subCats.length} {t("sc_count")}</p>
                </div>
                <button className="sc-add-btn" onClick={openAdd}>+ {t("sc_add_btn")}</button>
            </div>

            {subCats.length === 0 ? (
                <div className="sc-empty">
                    <div className="sc-empty-icon">📂</div>
                    <p>{t("sc_empty")}</p>
                </div>
            ) : (
                <div className="sc-list">
                    {subCats.map((sc) => (
                        <div className="sc-card" key={sc.id}>
                            <div className="sc-card-info">
                                <span className="sc-name">{sc.name}</span>
                                {sc.description && <span className="sc-desc">{sc.description}</span>}
                            </div>
                            <div className="sc-actions">
                                <button className="sc-edit-btn" onClick={() => openEdit(sc)}>{t("it_edit")}</button>
                                <button className="sc-del-btn" onClick={() => handleDelete(sc.id)}>{t("it_delete")}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="sc-overlay" onClick={() => setShowModal(false)}>
                    <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="sc-modal-title">
                            {editItem ? t("it_edit_subcat") : t("it_add_subcat")}
                        </h2>

                        <label className="sc-label">{t("it_name")} *</label>
                        <input
                            className="sc-input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder={t("it_subcat_placeholder")}
                        />

                        <label className="sc-label">{t("it_description")}</label>
                        <textarea
                            className="sc-input sc-textarea"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder={t("it_optional")}
                            rows={3}
                        />

                        {error && <div className="sc-error">⚠️ {error}</div>}

                        <div className="sc-modal-actions">
                            <button className="sc-cancel-btn" onClick={() => setShowModal(false)}>{t("it_cancel")}</button>
                            <button className="sc-save-btn" onClick={handleSave} disabled={saving}>
                                {saving ? t("it_saving") : t("it_save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}