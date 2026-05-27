import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: "", description: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // ── useQuery بدل useRef + fetchSubCats ───────────────────────────
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
        if (!form.name.trim()) return setError("Name is required.");
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
                "Something went wrong."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this subcategory?")) return;
        await deleteSubCategory(id);
        invalidateSubCats();
    };

    if (loading) return <div className="sc-loading">Loading...</div>;

    return (
        <div className="sc-page">
            <div className="sc-header">
                <div>
                    <h1 className="sc-title">Sub Categories</h1>
                    <p className="sc-subtitle">{subCats.length} subcategor{subCats.length !== 1 ? "ies" : "y"}</p>
                </div>
                <button className="sc-add-btn" onClick={openAdd}>+ Add SubCategory</button>
            </div>

            {subCats.length === 0 ? (
                <div className="sc-empty">
                    <div className="sc-empty-icon">📂</div>
                    <p>No subcategories yet. Add your first one!</p>
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
                                <button className="sc-edit-btn" onClick={() => openEdit(sc)}>Edit</button>
                                <button className="sc-del-btn" onClick={() => handleDelete(sc.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="sc-overlay" onClick={() => setShowModal(false)}>
                    <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="sc-modal-title">
                            {editItem ? "Edit SubCategory" : "Add SubCategory"}
                        </h2>

                        <label className="sc-label">Name *</label>
                        <input
                            className="sc-input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. مشويات"
                        />

                        <label className="sc-label">Description</label>
                        <textarea
                            className="sc-input sc-textarea"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Optional description"
                            rows={3}
                        />

                        {error && <div className="sc-error">⚠️ {error}</div>}

                        <div className="sc-modal-actions">
                            <button className="sc-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="sc-save-btn" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}