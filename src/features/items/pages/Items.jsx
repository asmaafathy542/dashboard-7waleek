import { useState, useRef, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import { PageThemeToggle } from "../../../shared/components/ui/ThemeToggle";
import {
    getItems,
    getItemsBySubCategory,
    createItem,
    updateItem,
    deleteItem,
    deleteItemsBulk,
    uploadItemImage,
    getSubCategories,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    createSubItem,
    updateSubItem,
    deleteSubItem,
    toggleSubItemAvailability,
} from "../services/itemsService";
import "./Items.css";

// ─── Bulk Import Modal ───────────────────────────────────────────────────────
function BulkImportModal({ onClose, onDone, subCategories, selectedPlaceId, selectedSubCat, t }) {
    const fileRef = useRef();
    const [rows, setRows] = useState([]);
    const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] });
    const [step, setStep] = useState("upload");
    const [createdItems, setCreatedItems] = useState([]);
    const [imageMap, setImageMap] = useState({});
    const [imgProgress, setImgProgress] = useState({ done: 0, total: 0, errors: [] });

    const fuzzyMatchSubCat = (itemName) => {
        if (!itemName || !subCategories.length) return "";
        const name = itemName.toLowerCase().trim();
        const exact = subCategories.find((sc) => sc.name?.toLowerCase().trim() === name);
        if (exact) return exact.id;
        const contains = subCategories.find((sc) => name.includes(sc.name?.toLowerCase().trim() ?? "____"));
        if (contains) return contains.id;
        const firstWord = name.split(" ")[0];
        if (firstWord.length >= 2) {
            const partial = subCategories.find((sc) => (sc.name?.toLowerCase() ?? "").includes(firstWord));
            if (partial) return partial.id;
        }
        return "";
    };

    const ARABIC_HEADER_MAP = {
        "الصنف": "name", "الاسم": "name", "اسم": "name",
        "الوصف": "description", "وصف": "description",
        "السعر": "price", "سعر": "price",
        "القسم": "sub_category_id", "التصنيف": "sub_category_id",
        "متاح": "is_available", "متوفر": "is_available",
    };

    const parseFile = (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = new Uint8Array(ev.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            const parsed = json.map((row, idx) => {
                const r = {};
                Object.keys(row).forEach((k) => {
                    const cleanKey = k.toLowerCase().trim();
                    const mappedKey = ARABIC_HEADER_MAP[k.trim()] || cleanKey;
                    r[mappedKey] = row[k];
                });
                const obj = { _rowIdx: idx, _error: "", ...r };
                const hasAnySize = [1, 2, 3, 4].some((n) => obj[`size${n}_name`] && obj[`size${n}_price`]);
                if (!obj.name) obj._error = t("it_err_no_name");
                else if ((!obj.price || isNaN(Number(obj.price))) && !hasAnySize) obj._error = t("it_err_bad_price");
                if (selectedSubCat != null) {
                    obj.sub_category_id = String(selectedSubCat);
                    obj._autoMatched = true;
                } else if (!obj.sub_category_id) {
                    const matchedId = fuzzyMatchSubCat(obj.name);
                    if (matchedId) { obj.sub_category_id = String(matchedId); obj._autoMatched = true; }
                }
                return obj;
            });
            setRows(parsed);
            setStep("preview");
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFile = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
    const updateRow = (idx, field, val) => setRows((prev) => prev.map((r) => r._rowIdx === idx ? { ...r, [field]: val, _error: "" } : r));
    const removeRow = (idx) => setRows((prev) => prev.filter((r) => r._rowIdx !== idx));
    const validRows = rows.filter((r) => !r._error);
    const invalidRows = rows.filter((r) => r._error);

    const subCatIdByName = (name) => {
        if (!name) return "";
        const found = subCategories.find((sc) => sc.name?.toLowerCase() === name?.toLowerCase());
        return found ? found.id : "";
    };

    const runImport = async () => {
        setStep("importing");
        const total = validRows.length;
        setProgress({ done: 0, total, errors: [] });
        const errors = [], created = [];
        for (let i = 0; i < validRows.length; i++) {
            const r = validRows[i];
            try {
                const resolvedSubId =
                    r.sub_category_id ||
                    subCatIdByName(r.subcategory || r.sub_category || r.category) ||
                    fuzzyMatchSubCat(r.name) ||
                    (selectedSubCat != null ? selectedSubCat : undefined);
                const subId = resolvedSubId ? Number(resolvedSubId) : undefined;

                // لو فيه أعمدة أحجام (size1_name/size1_price ... size4_name/size4_price)
                // نستخدم أول سعر حجم موجود كسعر أساسي للآيتم لو price مش متوفر
                const sizePairs = [1, 2, 3, 4]
                    .map((n) => ({ name: r[`size${n}_name`], price: r[`size${n}_price`] }))
                    .filter((s) => s.name && s.price && !isNaN(Number(s.price)));

                const basePrice = r.price && !isNaN(Number(r.price))
                    ? Number(r.price)
                    : (sizePairs[0]?.price ? Number(sizePairs[0].price) : 0);

                const saved = await createItem({
                    name: r.name, description: r.description || "",
                    price: basePrice, sub_category_id: subId || undefined,
                    is_available: r.is_available !== "false", place_id: selectedPlaceId,
                });
                const itemId = saved?.id ?? saved?.data?.id;
                if (itemId) {
                    created.push({ id: itemId, name: r.name });
                    for (const sp of sizePairs) {
                        try {
                            await createSubItem(itemId, {
                                name: String(sp.name), price: Number(sp.price), is_available: true,
                            });
                        } catch { errors.push(`${r.name} (${sp.name}): ${t("it_bulk_img_failed")}`); }
                    }
                }
            } catch { errors.push(`${t("it_bulk_row")} ${i + 1} (${r.name}): ${t("it_bulk_failed")}`); }
            setProgress({ done: i + 1, total, errors: [...errors] });
        }
        setCreatedItems(created);
        setStep("images");
        setProgress((p) => ({ ...p, errors }));
    };

    const assignImage = (itemId, file) => setImageMap((prev) => ({ ...prev, [itemId]: file }));

    const uploadAllImages = async () => {
        const toUpload = createdItems.filter((it) => imageMap[it.id]);
        if (!toUpload.length) { setStep("done"); return; }
        setStep("uploading_images");
        setImgProgress({ done: 0, total: toUpload.length, errors: [] });
        const errors = [];
        for (let i = 0; i < toUpload.length; i++) {
            try { await uploadItemImage(toUpload[i].id, imageMap[toUpload[i].id]); }
            catch { errors.push(`${toUpload[i].name}: ${t("it_bulk_img_failed")}`); }
            setImgProgress({ done: i + 1, total: toUpload.length, errors: [...errors] });
        }
        setImgProgress((p) => ({ ...p, errors }));
        setStep("done");
    };

    const downloadSample = () => {
        const data = [
            { name: "بيتزا مارجريتا", description: "صلصة وجبنة موزاريلا", price: "", sub_category_id: 1, is_available: true, size1_name: "S", size1_price: 90, size2_name: "M", size2_price: 130, size3_name: "L", size3_price: 175, size4_name: "F", size4_price: 350 },
            { name: "نص فرخة مشوية", description: "فراخ مشوية عالفحم", price: 120, sub_category_id: 1, is_available: true, size1_name: "", size1_price: "", size2_name: "", size2_price: "", size3_name: "", size3_price: "", size4_name: "", size4_price: "" },
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "items");
        XLSX.writeFile(wb, "items_sample.xlsx");
    };

    const selectedSubCatName = selectedSubCat != null
        ? subCategories.find((sc) => sc.id === selectedSubCat)?.name
        : null;

    return (
        <div className="it-overlay" onClick={onClose}>
            <div className="it-modal it-bulk-modal" onClick={(e) => e.stopPropagation()}>
                {step === "upload" && (<>
                    <h2 className="it-modal-title">📦 {t("it_bulk_title")}</h2>
                    <p className="it-bulk-hint">{t("it_bulk_hint")}<br />
                        <span style={{ color: "#f59e0b", fontWeight: 600 }}>📸 {t("it_bulk_img_hint")}</span>
                    </p>
                    <div className="it-bulk-columns">
                        <p className="it-label" style={{ marginBottom: 6 }}>{t("it_bulk_required_cols")}</p>
                        <div className="it-bulk-tags">
                            {["name *", "description", "price *", "sub_category_id", "is_available"].map((c) => (
                                <span key={c} className={`it-bulk-tag ${c.includes("*") ? "it-bulk-tag-req" : ""}`}>{c}</span>
                            ))}
                        </div>
                        <p className="it-label" style={{ marginTop: 10, marginBottom: 6 }}>عايز تضيف أحجام (S/M/L/F)؟ — اختياري</p>
                        <div className="it-bulk-tags">
                            {["size1_name", "size1_price", "size2_name", "size2_price", "size3_name", "size3_price", "size4_name", "size4_price"].map((c) => (
                                <span key={c} className="it-bulk-tag">{c}</span>
                            ))}
                        </div>
                        <p style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.6 }}>
                            لو الآيتم عنده أكتر من حجم، سيبي خانة price فاضية واملي size1_name/size1_price لـ S، size2_name/size2_price لـ M، وهكذا. لو عنده حجم واحد بس استخدمي price العادي.
                        </p>
                    </div>
                    {selectedSubCatName ? (
                        <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#1e40af", marginBottom: "12px", lineHeight: 1.7 }}>
                            📂 <strong>{t("it_bulk_auto_cat")}</strong> {selectedSubCatName}
                            <br /><span style={{ opacity: 0.8 }}>{t("it_bulk_can_change")}</span>
                        </div>
                    ) : (
                        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#166534", marginBottom: "12px", lineHeight: 1.7 }}>
                            ✨ <strong>{t("it_bulk_automatch_title")}</strong> {t("it_bulk_automatch_desc")}
                        </div>
                    )}
                    <div className="it-bulk-dropzone" onClick={() => fileRef.current.click()}>
                        <div className="it-bulk-drop-icon">📁</div>
                        <p>{t("it_bulk_drop_text")}</p>
                        <span>.xlsx {t("it_bulk_or")} .csv</span>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
                    </div>
                    <div className="it-modal-actions">
                        <button className="it-cancel-btn" onClick={onClose}>{t("it_cancel")}</button>
                        <button className="it-bulk-sample-btn" onClick={downloadSample}>⬇ {t("it_bulk_sample")}</button>
                    </div>
                </>)}

                {step === "preview" && (<>
                    <h2 className="it-modal-title">🔍 {t("it_bulk_preview")} — {rows.length} {t("it_bulk_rows")}</h2>
                    {invalidRows.length > 0 && <div className="it-bulk-warn">⚠️ {invalidRows.length} {t("it_bulk_rows_problem")}</div>}
                    {(() => {
                        const autoMatched = rows.filter((r) => !r._error && r.sub_category_id && r._autoMatched).length;
                        return autoMatched > 0 ? (
                            <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "6px 12px", fontSize: 13, marginBottom: 8 }}>
                                ✨ {autoMatched} {t("it_bulk_will_add_in")} "{selectedSubCatName || t("it_bulk_auto_subcat")}"
                            </div>
                        ) : null;
                    })()}
                    <div className="it-bulk-table-wrap">
                        <table className="it-bulk-table">
                            <thead><tr><th>#</th><th>{t("it_col_name")} *</th><th>{t("it_col_desc")}</th><th>{t("it_col_price")} *</th><th>{t("it_col_subcat")}</th><th>Sizes</th><th>{t("it_col_available")}</th><th></th></tr></thead>
                            <tbody>
                                {rows.map((r, i) => {
                                    const rowSizes = [1, 2, 3, 4]
                                        .map((n) => ({ name: r[`size${n}_name`], price: r[`size${n}_price`] }))
                                        .filter((s) => s.name && s.price);
                                    return (
                                    <tr key={r._rowIdx} className={r._error ? "it-bulk-row-err" : ""}>
                                        <td className="it-bulk-num">{i + 1}</td>
                                        <td><input className="it-bulk-cell-input" value={r.name} onChange={(e) => updateRow(r._rowIdx, "name", e.target.value)} /></td>
                                        <td><input className="it-bulk-cell-input" value={r.description || ""} onChange={(e) => updateRow(r._rowIdx, "description", e.target.value)} /></td>
                                        <td><input className="it-bulk-cell-input it-bulk-price" type="number" value={r.price} onChange={(e) => updateRow(r._rowIdx, "price", e.target.value)} placeholder={rowSizes.length ? "—" : ""} /></td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <select className="it-bulk-cell-input" value={r.sub_category_id || ""} onChange={(e) => updateRow(r._rowIdx, "sub_category_id", e.target.value)} style={r._autoMatched && r.sub_category_id ? { borderColor: "#22c55e" } : {}}>
                                                    <option value="">--</option>
                                                    {subCategories.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                                                </select>
                                                {r._autoMatched && r.sub_category_id && <span title="Auto-matched" style={{ fontSize: 14 }}>✨</span>}
                                            </div>
                                        </td>
                                        <td>
                                            {rowSizes.length > 0 ? (
                                                <span title={rowSizes.map((s) => `${s.name}: ${s.price}`).join(" | ")} style={{
                                                    fontSize: 11, fontWeight: 600, color: "#1d4ed8",
                                                    background: "#eff6ff", border: "1px solid #bfdbfe",
                                                    borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap", cursor: "help",
                                                }}>🧩 {rowSizes.length}</span>
                                            ) : <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                                        </td>
                                        <td><input type="checkbox" checked={r.is_available !== "false" && r.is_available !== false} onChange={(e) => updateRow(r._rowIdx, "is_available", e.target.checked)} /></td>
                                        <td><button className="it-bulk-del-row" onClick={() => removeRow(r._rowIdx)}>✕</button></td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="it-modal-actions">
                        <button className="it-cancel-btn" onClick={() => setStep("upload")}>← {t("it_back")}</button>
                        <button className="it-save-btn" onClick={runImport} disabled={!validRows.length}>🚀 {t("it_bulk_import_btn")} {validRows.length} {t("it_items")}</button>
                    </div>
                </>)}

                {step === "importing" && (
                    <div className="it-bulk-progress-wrap">
                        <div className="it-bulk-spinner">⏳</div>
                        <h2 className="it-modal-title">{t("it_bulk_uploading")}</h2>
                        <p className="it-bulk-prog-text">{progress.done} / {progress.total}</p>
                        <div className="it-bulk-bar-bg"><div className="it-bulk-bar-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
                    </div>
                )}

                {step === "images" && (<>
                    <h2 className="it-modal-title">📸 {t("it_bulk_add_images")}</h2>
                    <p className="it-bulk-hint">{t("it_bulk_pick_img_or_skip")}</p>
                    {progress.errors.length > 0 && <div className="it-bulk-warn">⚠️ {progress.errors.length} {t("it_bulk_items_failed")}</div>}
                    <div className="it-bulk-table-wrap">
                        <table className="it-bulk-table">
                            <thead><tr><th>#</th><th>{t("it_item")}</th><th>{t("it_image")}</th><th>{t("it_preview")}</th></tr></thead>
                            <tbody>
                                {createdItems.map((item, i) => (
                                    <tr key={item.id}>
                                        <td className="it-bulk-num">{i + 1}</td>
                                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                                        <td>
                                            <label className="it-bulk-img-label">
                                                {imageMap[item.id] ? "✅ " + imageMap[item.id].name : "📁 " + t("it_pick_image")}
                                                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && assignImage(item.id, e.target.files[0])} />
                                            </label>
                                        </td>
                                        <td>{imageMap[item.id] && <img src={URL.createObjectURL(imageMap[item.id])} alt={item.name} className="it-bulk-img-preview" />}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="it-bulk-img-count">{Object.keys(imageMap).length} / {createdItems.length} {t("it_image")}</p>
                    <div className="it-modal-actions">
                        <button className="it-cancel-btn" onClick={() => { onDone(); onClose(); }}>{t("it_skip")}</button>
                        <button className="it-save-btn" onClick={uploadAllImages} disabled={!Object.keys(imageMap).length}>📤 {t("it_upload")} {Object.keys(imageMap).length} {t("it_image")}</button>
                    </div>
                </>)}

                {step === "uploading_images" && (
                    <div className="it-bulk-progress-wrap">
                        <div className="it-bulk-spinner">🖼️</div>
                        <h2 className="it-modal-title">{t("it_bulk_uploading_imgs")}</h2>
                        <p className="it-bulk-prog-text">{imgProgress.done} / {imgProgress.total}</p>
                        <div className="it-bulk-bar-bg"><div className="it-bulk-bar-fill" style={{ width: `${(imgProgress.done / imgProgress.total) * 100}%`, background: "#10b981" }} /></div>
                    </div>
                )}

                {step === "done" && (
                    <div className="it-bulk-progress-wrap">
                        <div className="it-bulk-spinner">✅</div>
                        <h2 className="it-modal-title">{t("it_bulk_done")}</h2>
                        <p className="it-bulk-prog-text">
                            {t("it_bulk_success_msg")} {progress.done - progress.errors.length} {t("it_item")}
                            {imgProgress.total > 0 && ` • ${imgProgress.done - imgProgress.errors.length} ${t("it_image")}`}
                            {(progress.errors.length > 0 || imgProgress.errors.length > 0) && ` • ${progress.errors.length + imgProgress.errors.length} ${t("it_bulk_failed_count")}`}
                        </p>
                        <div className="it-modal-actions" style={{ justifyContent: "center" }}>
                            <button className="it-save-btn" onClick={() => { onDone(); onClose(); }}>{t("it_done")} 👍</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SubItems Modal ───────────────────────────────────────────────────────────
function SubItemsModal({ item, onClose, onDone, t }) {
    const [subItems, setSubItems] = useState(item.sub_items ?? []);
    const [showForm, setShowForm] = useState(false);
    const [editSub, setEditSub] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", price: "", is_available: true });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const openAdd = () => { setEditSub(null); setForm({ name: "", description: "", price: "", is_available: true }); setError(""); setShowForm(true); };
    const openEdit = (sub) => { setEditSub(sub); setForm({ name: sub.name, description: sub.description ?? "", price: sub.price, is_available: sub.is_available }); setError(""); setShowForm(true); };

    const handleSave = async () => {
        if (!form.name.trim()) return setError(t("it_name_required"));
        if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) return setError(t("it_err_bad_price"));
        setSaving(true); setError("");
        try {
            const payload = { name: form.name.trim(), description: form.description || undefined, price: Number(form.price), is_available: form.is_available };
            let result;
            if (editSub) result = await updateSubItem(editSub.id, payload);
            else result = await createSubItem(item.id, payload);
            const updated = editSub
                ? subItems.map((s) => s.id === editSub.id ? result : s)
                : [...subItems, result];
            setSubItems(updated);
            setShowForm(false);
            onDone();
        } catch (err) {
            setError(err?.response?.data?.error?.message || err?.response?.data?.message || t("it_something_wrong"));
        } finally { setSaving(false); }
    };

    const handleDelete = async (subId) => {
        if (!window.confirm(t("it_confirm_delete"))) return;
        await deleteSubItem(subId);
        setSubItems((prev) => prev.filter((s) => s.id !== subId));
        onDone();
    };

    const handleToggle = async (sub) => {
        const result = await toggleSubItemAvailability(sub.id);
        setSubItems((prev) => prev.map((s) => s.id === sub.id ? result : s));
        onDone();
    };

    return (
        <div className="it-overlay" onClick={onClose}>
            <div className="it-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h2 className="it-modal-title" style={{ margin: 0 }}>🧩 {t("it_variants")} — {item.name}</h2>
                    <button onClick={openAdd} className="it-save-btn" style={{ padding: "6px 14px", fontSize: 13 }}>+ {t("it_add_variant")}</button>
                </div>

                {subItems.length === 0 && !showForm && (
                    <div className="it-empty" style={{ padding: "24px 0" }}>
                        <div className="it-empty-icon">🧩</div>
                        <p>{t("it_no_variants")}</p>
                    </div>
                )}

                {subItems.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                        {subItems.map((sub) => (
                            <div key={sub.id} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 14px", borderRadius: 10,
                                background: sub.is_available ? "var(--bg-card, #f8fafc)" : "#f1f5f9",
                                border: "1.5px solid var(--border-color, #e2e8f0)",
                                opacity: sub.is_available ? 1 : 0.6,
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-main, #0f172a)" }}>{sub.name}</div>
                                    {sub.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{sub.description}</div>}
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: "#2563eb", whiteSpace: "nowrap" }}>{sub.price} {t("it_egp")}</span>
                                <button
                                    onClick={() => handleToggle(sub)}
                                    title={sub.is_available ? t("it_hide") : t("it_show")}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 4px" }}
                                >{sub.is_available ? "👁️" : "🙈"}</button>
                                <button onClick={() => openEdit(sub)} className="it-edit-btn" style={{ padding: "4px 10px", fontSize: 12 }}>{t("it_edit")}</button>
                                <button onClick={() => handleDelete(sub.id)} className="it-del-btn" style={{ padding: "4px 10px", fontSize: 12 }}>{t("it_delete")}</button>
                            </div>
                        ))}
                    </div>
                )}

                {showForm && (
                    <div style={{ background: "var(--bg-card, #f8fafc)", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: 16, marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#1e40af" }}>
                            {editSub ? `✏️ ${t("it_edit_variant")}` : `➕ ${t("it_new_variant")}`}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div>
                                <label className="it-label">{t("it_name")} *</label>
                                <input className="it-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: Large" />
                            </div>
                            <div>
                                <label className="it-label">{t("it_price")} ({t("it_egp")}) *</label>
                                <input className="it-input" type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                            </div>
                        </div>
                        <label className="it-label" style={{ marginTop: 8 }}>{t("it_description")}</label>
                        <input className="it-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("it_optional")} />
                        <label className="it-label it-avail-label" style={{ marginTop: 8 }}>
                            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
                            {t("it_available")}
                        </label>
                        {error && <div className="it-error">⚠️ {error}</div>}
                        <div className="it-modal-actions" style={{ marginTop: 12 }}>
                            <button className="it-cancel-btn" onClick={() => setShowForm(false)}>{t("it_cancel")}</button>
                            <button className="it-save-btn" onClick={handleSave} disabled={saving}>{saving ? t("it_saving") : t("it_save")}</button>
                        </div>
                    </div>
                )}

                <div className="it-modal-actions">
                    <button className="it-cancel-btn" onClick={onClose}>{t("it_done")} ✓</button>
                </div>
            </div>
        </div>
    );
}


function SubCatModal({ onClose, onDone, editSc, selectedPlaceId, t }) {
    const [form, setForm] = useState({ name: editSc?.name ?? "", description: editSc?.description ?? "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!form.name.trim()) return setError(t("it_name_required"));
        setSaving(true);
        setError("");
        try {
            const payload = { name: form.name, description: form.description, place_id: selectedPlaceId };
            if (editSc) await updateSubCategory(editSc.id, payload);
            else await createSubCategory(payload);
            onDone();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error?.message || err?.response?.data?.message || t("it_something_wrong"));
        } finally { setSaving(false); }
    };

    return (
        <div className="it-overlay" onClick={onClose}>
            <div className="it-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="it-modal-title">{editSc ? t("it_edit_subcat") : t("it_add_subcat")}</h2>
                <label className="it-label">{t("it_name")} *</label>
                <input className="it-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("it_subcat_placeholder")} />
                <label className="it-label">{t("it_description")}</label>
                <textarea className="it-input it-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("it_optional")} rows={3} />
                {error && <div className="it-error">⚠️ {error}</div>}
                <div className="it-modal-actions">
                    <button className="it-cancel-btn" onClick={onClose}>{t("it_cancel")}</button>
                    <button className="it-save-btn" onClick={handleSave} disabled={saving}>{saving ? t("it_saving") : t("it_save")}</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Items Page ─────────────────────────────────────────────────────────
export default function Items() {
    const context = useOutletContext() ?? {};
    const { selectedPlaceId } = context;
    const queryClient = useQueryClient();
    const { t, lang } = useLanguage();

    const [selectedSubCat, setSelectedSubCat] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [showSubCatModal, setShowSubCatModal] = useState(false);
    const [editSubCat, setEditSubCat] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const [subItemsTarget, setSubItemsTarget] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", price: "", sub_category_id: "", is_available: true });
    const [imageFile, setImageFile] = useState(null);
    const [hasSizes, setHasSizes] = useState(false);
    const [sizes, setSizes] = useState({ S: "", M: "", L: "", F: "" });
    const [saving, setSaving] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [pageSize, setPageSize] = useState(12);
    const [searchQuery, setSearchQuery] = useState("");
    const [showHiddenModal, setShowHiddenModal] = useState(false);
    const [activatingId, setActivatingId] = useState(null);

    const { data: subCategories = [] } = useQuery({
        queryKey: ["sub-categories", selectedPlaceId],
        queryFn: () => getSubCategories(selectedPlaceId),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: items = [], isLoading: loading } = useQuery({
        queryKey: ["items", selectedPlaceId, selectedSubCat ?? "all"],
        queryFn: () =>
            selectedSubCat
                ? getItemsBySubCategory(selectedSubCat)
                : getItems(selectedPlaceId),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 2,
    });

    const invalidateItems = () =>
        queryClient.invalidateQueries({ queryKey: ["items", selectedPlaceId] });

    const invalidateSubCats = () =>
        queryClient.invalidateQueries({ queryKey: ["sub-categories", selectedPlaceId] });

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) =>
            item.name?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.subcategory_name?.toLowerCase().includes(q)
        );
    }, [items, searchQuery]);

    const pagination = usePagination(filteredItems, pageSize);
    const { paginated, reset: resetPage } = pagination;
    useMemo(() => { resetPage(); }, [selectedSubCat, filteredItems.length]);

    const openAdd = () => {
        setEditItem(null);
        setForm({ name: "", description: "", price: "", sub_category_id: selectedSubCat ?? "", is_available: true });
        setImageFile(null);
        setHasSizes(false);
        setSizes({ S: "", M: "", L: "", F: "" });
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({ name: item.name ?? "", description: item.description ?? "", price: item.price ?? "", sub_category_id: item.sub_category_id ?? "", is_available: item.is_available ?? true });
        setImageFile(null);
        setHasSizes(false);
        setSizes({ S: "", M: "", L: "", F: "" });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const basePrice = hasSizes
                ? Number(Object.values(sizes).find((v) => v && Number(v) > 0) || 0)
                : Number(form.price);

            const payload = {
                name: form.name, description: form.description,
                price: basePrice, sub_category_id: Number(form.sub_category_id),
                is_available: form.is_available, place_id: selectedPlaceId,
            };
            let saved;
            if (editItem) saved = await updateItem(editItem.id, payload);
            else saved = await createItem(payload);
            if (imageFile && saved?.id) await uploadItemImage(saved.id, imageFile);

            if (hasSizes && saved?.id) {
                const sizeLabels = { S: "صغير", M: "وسط", L: "كبير", F: "فاميلي" };
                for (const [key, val] of Object.entries(sizes)) {
                    if (val && Number(val) > 0) {
                        await createSubItem(saved.id, {
                            name: sizeLabels[key],
                            price: Number(val),
                            is_available: true,
                        });
                    }
                }
            }

            setShowModal(false);
            invalidateItems();
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t("it_confirm_delete"))) return;
        await deleteItem(id);
        invalidateItems();
    };

    const handleToggle = async (item) => {
        await updateItem(item.id, { ...item, is_available: !item.is_available });
        invalidateItems();
    };

    const handleDeleteSubCat = async (id) => {
        if (!window.confirm(t("it_confirm_delete_subcat"))) return;
        await deleteSubCategory(id);
        if (selectedSubCat === id) setSelectedSubCat(null);
        invalidateSubCats();
    };

    const handleDeleteAll = async () => {
        const label = selectedSubCat
            ? subCategories.find((s) => s.id === selectedSubCat)?.name
            : t("it_all_items");
        if (!window.confirm(`${t("it_confirm_delete_all")} "${label}"؟`)) return;
        setDeletingAll(true);
        try {
            await deleteItemsBulk(items.map((i) => i.id));
            invalidateItems();
        } catch (err) {
            console.error("Delete all failed", err);
        } finally {
            setDeletingAll(false);
        }
    };

    const getImageUrl = (url) => {
        if (!url) return null;
        return url.startsWith("http") ? url : `https://aroundubackend-production.up.railway.app/${url}`;
    };

    return (
        <div className="it-page-split">

            {/* ── SubCategories Sidebar ── */}
            <div className="it-subcat-sidebar">
                <div className="it-subcat-header">
                    <span className="it-subcat-title">{t("it_categories")}</span>
                    <button className="it-subcat-add" onClick={() => { setEditSubCat(null); setShowSubCatModal(true); }} title={t("it_add_subcat")}>+</button>
                </div>

                <div className="it-subcat-list">
                    <button
                        className={`it-subcat-item ${selectedSubCat === null ? "it-subcat-active" : ""}`}
                        onClick={() => setSelectedSubCat(null)}
                    >
                        <span className="it-subcat-name">📋 {t("it_all")}</span>
                        <span className="it-subcat-count">{items.length}</span>
                    </button>

                    {subCategories.map((sc) => (
                        <div key={sc.id} className={`it-subcat-item ${selectedSubCat === sc.id ? "it-subcat-active" : ""}`}>
                            <button className="it-subcat-btn" onClick={() => setSelectedSubCat(sc.id)}>
                                <span className="it-subcat-name">
                                    {sc.name}
                                    <span style={{ fontSize: 10, color: "#94a3b8", marginRight: 4, fontWeight: 400 }}>#{sc.id}</span>
                                </span>
                            </button>
                            <div className="it-subcat-actions">
                                <button className="it-subcat-edit" onClick={() => { setEditSubCat(sc); setShowSubCatModal(true); }} title={t("it_edit")}>✏️</button>
                                <button className="it-subcat-del" onClick={() => handleDeleteSubCat(sc.id)} title={t("it_delete")}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Items Content ── */}
            <div className="it-content">
                <div className="it-header">
                    <div>
                        <h1 className="it-title">
                            {selectedSubCat ? subCategories.find(s => s.id === selectedSubCat)?.name : t("it_all_items")}
                        </h1>
                        <p className="it-subtitle">{searchQuery ? `${filteredItems.length} / ${items.length}` : items.length} {t("it_item")}</p>
                    </div>
                    <div className="it-header-actions">
                        <PageThemeToggle />
                        <button className="it-bulk-btn" onClick={() => setShowBulk(true)}>📦 {t("it_bulk_import")}</button>

                        {items.length > 0 && (
                            <button
                                onClick={handleDeleteAll}
                                disabled={deletingAll}
                                style={{
                                    background: "#fef2f2", color: "#b91c1c", border: "1.5px solid #fecaca",
                                    borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600,
                                    cursor: deletingAll ? "not-allowed" : "pointer", opacity: deletingAll ? 0.6 : 1,
                                    transition: "all 0.2s", whiteSpace: "nowrap",
                                }}
                            >
                                {deletingAll ? `⏳ ${t("it_deleting")}` : `🗑️ ${t("it_delete_all")}`}
                            </button>
                        )}

                        <button className="it-add-btn" onClick={openAdd}>+ {t("it_add_item")}</button>
                    </div>
                </div>

                {/* ── Unavailable Items Warning ── */}
                {!loading && (() => {
                    const unavailableCount = items.filter(i => !i.is_available).length;
                    if (unavailableCount === 0) return null;
                    return (
                        <>
                            {/* Banner */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "10px 16px",
                                marginBottom: "14px",
                                background: "var(--warning-bg, #FBF3DC)",
                                border: "1.5px solid var(--warning, #B07D20)",
                                borderRadius: "12px",
                            }}>
                                <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--warning, #B07D20)", flex: 1 }}>
                                    {lang === "ar"
                                        ? `لديك ${unavailableCount} ${unavailableCount > 1 ? "منتجات" : "منتج"} مخفية — مش هتظهر للعملاء`
                                        : `You have ${unavailableCount} hidden item${unavailableCount > 1 ? "s" : ""} — not visible to customers`}
                                </span>
                                <button
                                    onClick={() => setShowHiddenModal(true)}
                                    style={{
                                        padding: "6px 14px",
                                        background: "var(--warning, #B07D20)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        flexShrink: 0,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {lang === "ar" ? "عرض المخفية" : "View hidden items"}
                                </button>
                            </div>

                            {/* Hidden Items Modal */}
                            {showHiddenModal && (() => {
                                const hiddenItems = items.filter(i => !i.is_available);
                                return (
                                    <>
                                        <div
                                            onClick={() => setShowHiddenModal(false)}
                                            style={{
                                                position: "fixed", inset: 0, zIndex: 1000,
                                                background: "rgba(0,0,0,0.45)",
                                                backdropFilter: "blur(2px)",
                                            }}
                                        />
                                        <div style={{
                                            position: "fixed",
                                            top: "50%", left: "50%",
                                            transform: "translate(-50%, -50%)",
                                            zIndex: 1001,
                                            background: "var(--bg-card)",
                                            borderRadius: "16px",
                                            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
                                            width: "min(480px, 90vw)",
                                            maxHeight: "70vh",
                                            display: "flex",
                                            flexDirection: "column",
                                            overflow: "hidden",
                                        }}>
                                            {/* Modal Header */}
                                            <div style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "18px 20px",
                                                borderBottom: "1px solid var(--border)",
                                                flexShrink: 0,
                                            }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                                                        🙈 {lang === "ar" ? "المنتجات المخفية" : "Hidden Items"}
                                                    </h3>
                                                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-sub)" }}>
                                                        {lang === "ar"
                                                            ? `${hiddenItems.length} منتج مش ظاهر للعملاء`
                                                            : `${hiddenItems.length} item${hiddenItems.length > 1 ? "s" : ""} not visible to customers`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setShowHiddenModal(false)}
                                                    style={{
                                                        background: "var(--bg-surface)", border: "none",
                                                        borderRadius: "8px", width: "32px", height: "32px",
                                                        cursor: "pointer", fontSize: "16px",
                                                        color: "var(--text-sub)", display: "flex",
                                                        alignItems: "center", justifyContent: "center",
                                                    }}
                                                >✕</button>
                                            </div>

                                            {/* Modal Body */}
                                            <div style={{ overflowY: "auto", padding: "12px 16px", flex: 1 }}>
                                                {hiddenItems.map((item) => {
                                                    const imgUrl = item.image_url
                                                        ? (item.image_url.startsWith("http") ? item.image_url : `https://aroundubackend-production.up.railway.app/${item.image_url}`)
                                                        : null;
                                                    const isActivating = activatingId === item.id;
                                                    return (
                                                        <div key={item.id} style={{
                                                            display: "flex", alignItems: "center", gap: "12px",
                                                            padding: "12px",
                                                            marginBottom: "8px",
                                                            background: "var(--bg-surface)",
                                                            border: "1px solid var(--border)",
                                                            borderRadius: "12px",
                                                        }}>
                                                            {/* Image or placeholder */}
                                                            <div style={{
                                                                width: "48px", height: "48px",
                                                                borderRadius: "10px", flexShrink: 0,
                                                                overflow: "hidden",
                                                                background: "var(--border)",
                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                            }}>
                                                                {imgUrl
                                                                    ? <img src={imgUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                    : <span style={{ fontSize: "22px" }}>🍽️</span>
                                                                }
                                                            </div>

                                                            {/* Info */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    fontWeight: 600, fontSize: "14px",
                                                                    color: "var(--text-main)",
                                                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                                }}>{item.name}</div>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                                                                    {item.subcategory_name && (
                                                                        <span style={{
                                                                            fontSize: "11px", color: "var(--text-sub)",
                                                                            background: "var(--bg-card)",
                                                                            padding: "1px 7px", borderRadius: "999px",
                                                                            border: "1px solid var(--border)",
                                                                        }}>{item.subcategory_name}</span>
                                                                    )}
                                                                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--success)" }}>
                                                                        {Number(item.price).toLocaleString()} EGP
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Activate button */}
                                                            <button
                                                                disabled={isActivating}
                                                                onClick={async () => {
                                                                    setActivatingId(item.id);
                                                                    await handleToggle(item);
                                                                    setActivatingId(null);
                                                                    if (items.filter(i => !i.is_available && i.id !== item.id).length === 0) {
                                                                        setShowHiddenModal(false);
                                                                    }
                                                                }}
                                                                style={{
                                                                    padding: "7px 14px",
                                                                    background: isActivating ? "var(--bg-surface)" : "#dcfce7",
                                                                    color: isActivating ? "var(--text-sub)" : "#15803d",
                                                                    border: "1.5px solid",
                                                                    borderColor: isActivating ? "var(--border)" : "#86efac",
                                                                    borderRadius: "8px",
                                                                    fontSize: "12px", fontWeight: 600,
                                                                    cursor: isActivating ? "not-allowed" : "pointer",
                                                                    flexShrink: 0,
                                                                    transition: "all 0.15s",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {isActivating ? "⏳" : (lang === "ar" ? "✓ تفعيل" : "✓ Activate")}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    );
                })()}

                {/* ── Search Bar ── */}
                {!loading && items.length > 0 && (
                    <div style={{
                        margin: "0 0 18px",
                        position: "relative",
                        maxWidth: "420px",
                    }}>
                        <span style={{
                            position: "absolute",
                            top: "50%", left: "14px",
                            transform: "translateY(-50%)",
                            fontSize: "16px",
                            pointerEvents: "none",
                            color: "var(--icon-muted)",
                        }}>🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
                            placeholder={lang === "ar" ? "ابحث عن اسم الايتم..." : "Search by item name..."}
                            style={{
                                width: "100%",
                                padding: "10px 14px 10px 42px",
                                border: "1.5px solid var(--border)",
                                borderRadius: "12px",
                                fontSize: "14px",
                                background: "var(--bg-card)",
                                color: "var(--text-main)",
                                outline: "none",
                                boxSizing: "border-box",
                                transition: "border-color 0.2s",
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
                            onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                style={{
                                    position: "absolute", top: "50%", right: "12px",
                                    transform: "translateY(-50%)",
                                    background: "none", border: "none",
                                    cursor: "pointer", fontSize: "16px",
                                    color: "var(--icon-muted)", padding: 0,
                                }}
                            >✕</button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="it-loading">{t("loading")}</div>
                ) : items.length === 0 ? (
                    <div className="it-empty">
                        <div className="it-empty-icon">🍔</div>
                        <p>{t("it_no_items")}</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="it-empty">
                        <div className="it-empty-icon">🔍</div>
                        <p style={{ color: "var(--text-sub)" }}>No items match "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="it-grid">
                        {paginated.map((item) => (
                            <div className={`it-card ${!item.is_available ? "it-card-hidden" : ""}`} key={item.id}>
                                {item.image_url && <img src={getImageUrl(item.image_url)} alt={item.name} className="it-img" />}
                                <div className="it-card-body">
                                    <div className="it-card-top">
                                        <span className="it-name">{item.name}</span>
                                        {item.subcategory_name && <span className="it-category">{item.subcategory_name}</span>}
                                    </div>
                                    {item.description && <p className="it-desc">{item.description}</p>}

                                    {/* Sub-items preview */}
                                    {item.sub_items?.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "6px 0" }}>
                                            {item.sub_items.slice(0, 3).map((s) => (
                                                <span key={s.id} style={{
                                                    fontSize: 11, fontWeight: 600,
                                                    padding: "2px 8px", borderRadius: 999,
                                                    background: s.is_available ? "#eff6ff" : "#f1f5f9",
                                                    color: s.is_available ? "#1d4ed8" : "#94a3b8",
                                                    border: `1px solid ${s.is_available ? "#bfdbfe" : "#e2e8f0"}`,
                                                }}>
                                                    {s.name} · {s.price} {t("it_egp")}
                                                </span>
                                            ))}
                                            {item.sub_items.length > 3 && (
                                                <span style={{ fontSize: 11, color: "#64748b", padding: "2px 4px" }}>+{item.sub_items.length - 3}</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="it-card-footer">
                                        <span className="it-price">{item.price} {t("it_egp")}</span>
                                        <div className="it-actions">
                                            <button
                                                className={`it-toggle ${item.is_available ? "it-toggle-on" : "it-toggle-off"}`}
                                                onClick={() => handleToggle(item)}
                                                title={item.is_available ? t("it_hide") : t("it_show")}
                                            >
                                                {item.is_available ? "✓" : "✗"}
                                            </button>
                                            <button
                                                className="it-variants-btn"
                                                onClick={() => setSubItemsTarget(item)}
                                                title={t("it_variants")}
                                            >
                                                <span className="it-variants-icon">⚙️</span>
                                                {item.sub_items?.length > 0 && (
                                                    <span className="it-variants-count">{item.sub_items.length}</span>
                                                )}
                                            </button>
                                            <button className="it-edit-btn" onClick={() => openEdit(item)}>{t("it_edit")}</button>
                                            <button className="it-del-btn" onClick={() => handleDelete(item.id)}><span className="it-del-text">{t("it_delete")}</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {items.length > 0 && (
                    <Pagination
                        {...pagination}
                        pageSize={pageSize}
                        onPageSize={(s) => { setPageSize(s); resetPage(); }}
                        onNext={pagination.next}
                        onPrev={pagination.prev}
                        onGoTo={pagination.goTo}
                        pageSizeOptions={[12, 24, 48]}
                    />
                )}
            </div>

            {/* ── Item Modal ── */}
            {showModal && (
                <div className="it-overlay" onClick={() => setShowModal(false)}>
                    <div className="it-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="it-modal-title">{editItem ? t("it_edit_item") : t("it_add_item")}</h2>
                        <label className="it-label">{t("it_name")}</label>
                        <input className="it-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <label className="it-label">{t("it_description")}</label>
                        <textarea className="it-input it-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        <label className="it-label it-avail-label">
                            <input type="checkbox" checked={hasSizes} onChange={(e) => setHasSizes(e.target.checked)} />
                            عنده أحجام مختلفة؟ (S / M / L / F)
                        </label>
                        {!hasSizes ? (
                            <>
                                <label className="it-label">{t("it_price")} ({t("it_egp")})</label>
                                <input className="it-input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                            </>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                                {Object.keys(sizes).map((key) => (
                                    <div key={key}>
                                        <label className="it-label">{key}</label>
                                        <input
                                            className="it-input"
                                            type="number"
                                            placeholder="--"
                                            value={sizes[key]}
                                            onChange={(e) => setSizes({ ...sizes, [key]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        <label className="it-label">{t("it_sub_category")}</label>
                        <select className="it-input" value={form.sub_category_id} onChange={(e) => setForm({ ...form, sub_category_id: e.target.value })}>
                            <option value="">-- {t("it_select")} --</option>
                            {subCategories.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                        </select>
                        <label className="it-label">{t("it_image")}</label>
                        <input className="it-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                        <label className="it-label it-avail-label">
                            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
                            {t("it_available")}
                        </label>
                        <div className="it-modal-actions">
                            <button className="it-cancel-btn" onClick={() => setShowModal(false)}>{t("it_cancel")}</button>
                            <button className="it-save-btn" onClick={handleSave} disabled={saving}>{saving ? t("it_saving") : t("it_save")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SubCat Modal ── */}
            {showSubCatModal && (
                <SubCatModal
                    onClose={() => setShowSubCatModal(false)}
                    onDone={invalidateSubCats}
                    editSc={editSubCat}
                    selectedPlaceId={selectedPlaceId}
                    t={t}
                />
            )}

            {/* ── SubItems Modal ── */}
            {subItemsTarget && (
                <SubItemsModal
                    item={subItemsTarget}
                    onClose={() => setSubItemsTarget(null)}
                    onDone={invalidateItems}
                    t={t}
                />
            )}

            {/* ── Bulk Modal ── */}
            {showBulk && (
                <BulkImportModal
                    onClose={() => setShowBulk(false)}
                    onDone={invalidateItems}
                    subCategories={subCategories}
                    selectedPlaceId={selectedPlaceId}
                    selectedSubCat={selectedSubCat}
                    t={t}
                />
            )}
        </div>
    );
}