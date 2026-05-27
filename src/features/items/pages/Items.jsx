//items.jsx
import { useState, useRef, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
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
} from "../services/itemsService";
import "./Items.css";

// ─── Bulk Import Modal ───────────────────────────────────────────────────────
function BulkImportModal({ onClose, onDone, subCategories, selectedPlaceId, selectedSubCat }) {
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

    const parseFile = (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = new Uint8Array(ev.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            const parsed = json.map((row, idx) => {
                const r = {};
                Object.keys(row).forEach((k) => { r[k.toLowerCase().trim()] = row[k]; });
                const obj = { _rowIdx: idx, _error: "", ...r };
                if (!obj.name) obj._error = "name مفيش";
                else if (!obj.price || isNaN(Number(obj.price))) obj._error = "price غلط";
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
                const saved = await createItem({
                    name: r.name, description: r.description || "",
                    price: Number(r.price), sub_category_id: subId || undefined,
                    is_available: r.is_available !== "false", place_id: selectedPlaceId,
                });
                const itemId = saved?.id ?? saved?.data?.id;
                if (itemId) created.push({ id: itemId, name: r.name });
            } catch { errors.push(`Row ${i + 1} (${r.name}): فشل`); }
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
            catch { errors.push(`${toUpload[i].name}: فشل رفع الصورة`); }
            setImgProgress({ done: i + 1, total: toUpload.length, errors: [...errors] });
        }
        setImgProgress((p) => ({ ...p, errors }));
        setStep("done");
    };

    const downloadSample = () => {
        const data = [
            { name: "نص فرخة مشوية", description: "فراخ مشوية عالفحم", price: 120, sub_category_id: 1, is_available: true },
            { name: "كفتة مشوية", description: "كفتة بالخضار", price: 90, sub_category_id: 1, is_available: true },
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
                    <h2 className="it-modal-title">📦 Bulk Import Items</h2>
                    <p className="it-bulk-hint">ارفع Excel (.xlsx) أو CSV file فيه الـ items.<br />
                        <span style={{ color: "#f59e0b", fontWeight: 600 }}>📸 الصور مش موجودة في الـ bulk — بعد الرفع افتح كل item وضيف صورته بـ Edit.</span>
                    </p>
                    <div className="it-bulk-columns">
                        <p className="it-label" style={{ marginBottom: 6 }}>الـ Columns المطلوبة:</p>
                        <div className="it-bulk-tags">
                            {["name *", "description", "price *", "sub_category_id", "is_available"].map((c) => (
                                <span key={c} className={`it-bulk-tag ${c.includes("*") ? "it-bulk-tag-req" : ""}`}>{c}</span>
                            ))}
                        </div>
                    </div>
                    {selectedSubCatName ? (
                        <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#1e40af", marginBottom: "12px", lineHeight: 1.7 }}>
                            📂 <strong>الـ Items هتتضاف تلقائياً في:</strong> {selectedSubCatName}
                            <br /><span style={{ opacity: 0.8 }}>تقدري تغيري ده في الـ preview لو حبيتي.</span>
                        </div>
                    ) : (
                        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#166534", marginBottom: "12px", lineHeight: 1.7 }}>
                            ✨ <strong>Auto-Match:</strong> لو ما حددتش sub_category_id، الـ app هيحاول يختار الـ category التلقائي بناءً على اسم الـ item.
                            <br />مثال: "كفتة مشوية" → هيختار تلقائي "مشويات" لو موجودة.
                        </div>
                    )}
                    <div className="it-bulk-dropzone" onClick={() => fileRef.current.click()}>
                        <div className="it-bulk-drop-icon">📁</div>
                        <p>اضغط لترفع الـ Excel أو CSV</p>
                        <span>.xlsx أو .csv</span>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
                    </div>
                    <div className="it-modal-actions">
                        <button className="it-cancel-btn" onClick={onClose}>إلغاء</button>
                        <button className="it-bulk-sample-btn" onClick={downloadSample}>⬇ Sample Excel</button>
                    </div>
                </>)}

                {step === "preview" && (<>
                    <h2 className="it-modal-title">🔍 Preview — {rows.length} rows</h2>
                    {invalidRows.length > 0 && <div className="it-bulk-warn">⚠️ {invalidRows.length} row فيها مشكلة.</div>}
                    {(() => {
                        const autoMatched = rows.filter((r) => !r._error && r.sub_category_id && r._autoMatched).length;
                        return autoMatched > 0 ? (
                            <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "6px 12px", fontSize: 13, marginBottom: 8 }}>
                                ✨ {autoMatched} item هيتضاف في "{selectedSubCatName || 'subcategory تلقائية'}"
                            </div>
                        ) : null;
                    })()}
                    <div className="it-bulk-table-wrap">
                        <table className="it-bulk-table">
                            <thead><tr><th>#</th><th>Name *</th><th>Description</th><th>Price *</th><th>SubCat</th><th>Available</th><th></th></tr></thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={r._rowIdx} className={r._error ? "it-bulk-row-err" : ""}>
                                        <td className="it-bulk-num">{i + 1}</td>
                                        <td><input className="it-bulk-cell-input" value={r.name} onChange={(e) => updateRow(r._rowIdx, "name", e.target.value)} /></td>
                                        <td><input className="it-bulk-cell-input" value={r.description || ""} onChange={(e) => updateRow(r._rowIdx, "description", e.target.value)} /></td>
                                        <td><input className="it-bulk-cell-input it-bulk-price" type="number" value={r.price} onChange={(e) => updateRow(r._rowIdx, "price", e.target.value)} /></td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <select className="it-bulk-cell-input" value={r.sub_category_id || ""} onChange={(e) => updateRow(r._rowIdx, "sub_category_id", e.target.value)} style={r._autoMatched && r.sub_category_id ? { borderColor: "#22c55e" } : {}}>
                                                    <option value="">--</option>
                                                    {subCategories.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                                                </select>
                                                {r._autoMatched && r.sub_category_id && <span title="Auto-matched" style={{ fontSize: 14 }}>✨</span>}
                                            </div>
                                        </td>
                                        <td><input type="checkbox" checked={r.is_available !== "false" && r.is_available !== false} onChange={(e) => updateRow(r._rowIdx, "is_available", e.target.checked)} /></td>
                                        <td><button className="it-bulk-del-row" onClick={() => removeRow(r._rowIdx)}>✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="it-modal-actions">
                        <button className="it-cancel-btn" onClick={() => setStep("upload")}>← رجوع</button>
                        <button className="it-save-btn" onClick={runImport} disabled={!validRows.length}>🚀 Import {validRows.length} Items</button>
                    </div>
                </>)}

                {step === "importing" && (
                    <div className="it-bulk-progress-wrap">
                        <div className="it-bulk-spinner">⏳</div>
                        <h2 className="it-modal-title">جاري الرفع...</h2>
                        <p className="it-bulk-prog-text">{progress.done} / {progress.total}</p>
                        <div className="it-bulk-bar-bg"><div className="it-bulk-bar-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
                    </div>
                )}

                {step === "images" && (<>
                    <h2 className="it-modal-title">📸 ضيف صور الـ Items</h2>
                    <p className="it-bulk-hint">اختار صورة لكل item أو اضغط تخطي.</p>
                    {progress.errors.length > 0 && <div className="it-bulk-warn">⚠️ {progress.errors.length} item فشلوا.</div>}
                    <div className="it-bulk-table-wrap">
                        <table className="it-bulk-table">
                            <thead><tr><th>#</th><th>Item</th><th>الصورة</th><th>Preview</th></tr></thead>
                            <tbody>
                                {createdItems.map((item, i) => (
                                    <tr key={item.id}>
                                        <td className="it-bulk-num">{i + 1}</td>
                                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                                        <td>
                                            <label className="it-bulk-img-label">
                                                {imageMap[item.id] ? "✅ " + imageMap[item.id].name : "📁 اختار صورة"}
                                                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && assignImage(item.id, e.target.files[0])} />
                                            </label>
                                        </td>
                                        <td>{imageMap[item.id] && <img src={URL.createObjectURL(imageMap[item.id])} alt={item.name} className="it-bulk-img-preview" />}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="it-bulk-img-count">{Object.keys(imageMap).length} / {createdItems.length} صورة</p>
                    <div className="it-modal-actions">
                        <button className="it-cancel-btn" onClick={() => { onDone(); onClose(); }}>تخطي</button>
                        <button className="it-save-btn" onClick={uploadAllImages} disabled={!Object.keys(imageMap).length}>📤 Upload {Object.keys(imageMap).length} صورة</button>
                    </div>
                </>)}

                {step === "uploading_images" && (
                    <div className="it-bulk-progress-wrap">
                        <div className="it-bulk-spinner">🖼️</div>
                        <h2 className="it-modal-title">جاري رفع الصور...</h2>
                        <p className="it-bulk-prog-text">{imgProgress.done} / {imgProgress.total}</p>
                        <div className="it-bulk-bar-bg"><div className="it-bulk-bar-fill" style={{ width: `${(imgProgress.done / imgProgress.total) * 100}%`, background: "#10b981" }} /></div>
                    </div>
                )}

                {step === "done" && (
                    <div className="it-bulk-progress-wrap">
                        <div className="it-bulk-spinner">✅</div>
                        <h2 className="it-modal-title">خلص!</h2>
                        <p className="it-bulk-prog-text">
                            تم رفع {progress.done - progress.errors.length} item بنجاح
                            {imgProgress.total > 0 && ` • ${imgProgress.done - imgProgress.errors.length} صورة`}
                            {(progress.errors.length > 0 || imgProgress.errors.length > 0) && ` • ${progress.errors.length + imgProgress.errors.length} فشلوا`}
                        </p>
                        <div className="it-modal-actions" style={{ justifyContent: "center" }}>
                            <button className="it-save-btn" onClick={() => { onDone(); onClose(); }}>تمام 👍</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SubCategory Modal ───────────────────────────────────────────────────────
function SubCatModal({ onClose, onDone, editSc, selectedPlaceId }) {
    const [form, setForm] = useState({ name: editSc?.name ?? "", description: editSc?.description ?? "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!form.name.trim()) return setError("Name is required.");
        setSaving(true);
        setError("");
        try {
            const payload = { name: form.name, description: form.description, place_id: selectedPlaceId };
            if (editSc) await updateSubCategory(editSc.id, payload);
            else await createSubCategory(payload);
            onDone();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error?.message || err?.response?.data?.message || "Something went wrong.");
        } finally { setSaving(false); }
    };

    return (
        <div className="it-overlay" onClick={onClose}>
            <div className="it-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="it-modal-title">{editSc ? "Edit SubCategory" : "Add SubCategory"}</h2>
                <label className="it-label">Name *</label>
                <input className="it-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. مشويات" />
                <label className="it-label">Description</label>
                <textarea className="it-input it-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" rows={3} />
                {error && <div className="it-error">⚠️ {error}</div>}
                <div className="it-modal-actions">
                    <button className="it-cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="it-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
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

    const [selectedSubCat, setSelectedSubCat] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [showSubCatModal, setShowSubCatModal] = useState(false);
    const [editSubCat, setEditSubCat] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", price: "", sub_category_id: "", is_available: true });
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [pageSize, setPageSize] = useState(12);

    // ── useQuery للـ SubCategories ────────────────────────────────────
    const { data: subCategories = [] } = useQuery({
        queryKey: ["sub-categories", selectedPlaceId],
        queryFn: () => getSubCategories(selectedPlaceId),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 5,
    });

    // ── useQuery للـ Items ────────────────────────────────────────────
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

    const pagination = usePagination(items, pageSize);
    const { paginated, reset: resetPage } = pagination;
    useMemo(() => { resetPage(); }, [selectedSubCat, items.length]);

    const openAdd = () => {
        setEditItem(null);
        setForm({ name: "", description: "", price: "", sub_category_id: selectedSubCat ?? "", is_available: true });
        setImageFile(null);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({ name: item.name ?? "", description: item.description ?? "", price: item.price ?? "", sub_category_id: item.sub_category_id ?? "", is_available: item.is_available ?? true });
        setImageFile(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: form.name, description: form.description,
                price: Number(form.price), sub_category_id: Number(form.sub_category_id),
                is_available: form.is_available, place_id: selectedPlaceId,
            };
            let saved;
            if (editItem) saved = await updateItem(editItem.id, payload);
            else saved = await createItem(payload);
            if (imageFile && saved?.id) await uploadItemImage(saved.id, imageFile);
            setShowModal(false);
            invalidateItems();
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this item?")) return;
        await deleteItem(id);
        invalidateItems();
    };

    const handleToggle = async (item) => {
        await updateItem(item.id, { ...item, is_available: !item.is_available });
        invalidateItems();
    };

    const handleDeleteSubCat = async (id) => {
        if (!window.confirm("Delete this subcategory? Items inside won't be deleted.")) return;
        await deleteSubCategory(id);
        if (selectedSubCat === id) setSelectedSubCat(null);
        invalidateSubCats();
    };

    const handleDeleteAll = async () => {
        const label = selectedSubCat
            ? subCategories.find((s) => s.id === selectedSubCat)?.name
            : "All Items";
        if (!window.confirm(`هتحذف كل الـ items في "${label}"؟ مش هترجع!`)) return;
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
                    <span className="it-subcat-title">Categories</span>
                    <button className="it-subcat-add" onClick={() => { setEditSubCat(null); setShowSubCatModal(true); }} title="Add SubCategory">+</button>
                </div>

                <div className="it-subcat-list">
                    <button
                        className={`it-subcat-item ${selectedSubCat === null ? "it-subcat-active" : ""}`}
                        onClick={() => setSelectedSubCat(null)}
                    >
                        <span className="it-subcat-name">📋 الكل</span>
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
                                <button className="it-subcat-edit" onClick={() => { setEditSubCat(sc); setShowSubCatModal(true); }} title="Edit">✏️</button>
                                <button className="it-subcat-del" onClick={() => handleDeleteSubCat(sc.id)} title="Delete">🗑️</button>
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
                            {selectedSubCat ? subCategories.find(s => s.id === selectedSubCat)?.name : "All Items"}
                        </h1>
                        <p className="it-subtitle">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="it-header-actions">
                        <button className="it-bulk-btn" onClick={() => setShowBulk(true)}>📦 Bulk Import</button>

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
                                {deletingAll ? "⏳ جاري الحذف..." : "🗑️ Delete All"}
                            </button>
                        )}

                        <button className="it-add-btn" onClick={openAdd}>+ Add Item</button>
                    </div>
                </div>

                {loading ? (
                    <div className="it-loading">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="it-empty">
                        <div className="it-empty-icon">🍔</div>
                        <p>No items yet. Add your first item!</p>
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
                                    <div className="it-card-footer">
                                        <span className="it-price">{item.price} EGP</span>
                                        <div className="it-actions">
                                            <button className={`it-toggle ${item.is_available ? "it-toggle-on" : "it-toggle-off"}`} onClick={() => handleToggle(item)}>
                                                {item.is_available ? "👁️" : "🙈"}
                                            </button>
                                            <button className="it-edit-btn" onClick={() => openEdit(item)}>Edit</button>
                                            <button className="it-del-btn" onClick={() => handleDelete(item.id)}><span className="it-del-text">Delete</span></button>
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
                        <h2 className="it-modal-title">{editItem ? "Edit Item" : "Add Item"}</h2>
                        <label className="it-label">Name</label>
                        <input className="it-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <label className="it-label">Description</label>
                        <textarea className="it-input it-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        <label className="it-label">Price (EGP)</label>
                        <input className="it-input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        <label className="it-label">Sub Category</label>
                        <select className="it-input" value={form.sub_category_id} onChange={(e) => setForm({ ...form, sub_category_id: e.target.value })}>
                            <option value="">-- Select --</option>
                            {subCategories.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                        </select>
                        <label className="it-label">Image</label>
                        <input className="it-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                        <label className="it-label it-avail-label">
                            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
                            Available
                        </label>
                        <div className="it-modal-actions">
                            <button className="it-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="it-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
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
                />
            )}
        </div>
    );
}