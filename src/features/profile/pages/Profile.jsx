import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, changePassword } from "../services/profileService";
import { useLanguage } from "../../../context/LanguageContext";
import "./profile.css";

export default function Profile() {
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  // Edit states
  const [showEdit, setShowEdit]         = useState(false);
  const [editForm, setEditForm]         = useState({ full_name: "", email: "", owner_type: "" });
  const [saving, setSaving]             = useState(false);
  const [editError, setEditError]       = useState("");
  const [editSuccess, setEditSuccess]   = useState("");

  // Password states
  const [showPassword, setShowPassword] = useState(false);
  const [passForm, setPassForm]         = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [passError, setPassError]       = useState("");
  const [passSuccess, setPassSuccess]   = useState("");
  const [savingPass, setSavingPass]     = useState(false);
  const [showPass, setShowPass]         = useState({ current: false, new: false, confirm: false });

  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ["profile"],
    queryFn:  getProfile,
    staleTime: 1000 * 60 * 10,
  });

  const openEdit = () => {
    setEditForm({
      full_name:  profile.full_name  || "",
      email:      profile.email      || "",
      owner_type: profile.owner_type || "",
    });
    setEditError("");
    setEditSuccess("");
    setShowEdit(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setEditError("");
    setEditSuccess("");
    try {
      const updated = await updateProfile(editForm);
      queryClient.setQueryData(["profile"], (prev) => ({ ...prev, ...updated }));
      setEditSuccess(ar ? "تم تحديث الملف بنجاح!" : "Profile updated successfully!");
      setTimeout(() => setShowEdit(false), 1000);
    } catch (err) {
      setEditError(ar ? "فشل التحديث. حاول مرة أخرى." : "Failed to update. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPassError("");
    setPassSuccess("");
    if (passForm.new_password !== passForm.confirm_password) {
      setPassError(ar ? "كلمتا المرور غير متطابقتين." : "Passwords don't match.");
      return;
    }
    setSavingPass(true);
    try {
      await changePassword({
        old_password: passForm.old_password,
        new_password: passForm.new_password,
      });
      setPassSuccess(ar ? "تم تغيير كلمة المرور بنجاح!" : "Password changed successfully!");
      setPassForm({ old_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setShowPassword(false), 1000);
    } catch (err) {
      setPassError(ar ? "فشل تغيير كلمة المرور. تحقق من كلمة المرور الحالية." : "Failed to change password. Check your current password.");
    } finally {
      setSavingPass(false);
    }
  };

  if (loading)  return <div className="pr-loading">{ar ? "جاري التحميل..." : "Loading..."}</div>;
  if (!profile) return <div className="pr-loading">{ar ? "لم يتم العثور على الملف الشخصي." : "No profile found."}</div>;

  return (
    <div className="pr-page">

      <div className="pr-header">
        <h1 className="pr-title">{ar ? "الملف الشخصي" : "Profile"}</h1>
        <p className="pr-subtitle">{ar ? "معلومات حسابك." : "Your account information."}</p>
      </div>

      <div className="pr-card">

        {/* Avatar */}
        <div className="pr-avatar-section">
          <div className="pr-avatar">
            {profile.full_name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <div className="pr-name">{profile.full_name}</div>
            <div className="pr-role">{profile.role} · {profile.owner_type}</div>
          </div>
        </div>

        <div className="pr-divider" />

        {/* Info */}
        <div className="pr-info-grid">
          <div className="pr-info-row">
            <span className="pr-info-label">{ar ? "البريد الإلكتروني" : "Email"}</span>
            <span className="pr-info-value">{profile.email}</span>
          </div>
          <div className="pr-info-row">
            <span className="pr-info-label">{ar ? "حالة الحساب" : "Account Status"}</span>
            <span className={`pr-badge ${profile.is_active ? "active" : "inactive"}`}>
              {profile.is_active ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}
            </span>
          </div>
          <div className="pr-info-row">
            <span className="pr-info-label">{ar ? "التحقق" : "Verified"}</span>
            <span className={`pr-badge ${profile.is_verified ? "active" : "inactive"}`}>
              {profile.is_verified ? (ar ? "موثق ✓" : "Verified ✓") : (ar ? "غير موثق" : "Not Verified")}
            </span>
          </div>
          <div className="pr-info-row">
            <span className="pr-info-label">{ar ? "عضو منذ" : "Member Since"}</span>
            <span className="pr-info-value">
              {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="pr-divider" />

        {/* Buttons */}
        <div className="pr-actions">
          <button className="pr-edit-btn" onClick={openEdit}>✏️ {ar ? "تعديل الملف" : "Edit Profile"}</button>
          <button className="pr-pass-btn" onClick={() => { setShowPassword(true); setPassError(""); setPassSuccess(""); }}>
            🔒 {ar ? "تغيير كلمة المرور" : "Change Password"}
          </button>
        </div>

      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="pr-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="pr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h2>{ar ? "تعديل الملف الشخصي" : "Edit Profile"}</h2>
              <button className="pr-modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <div className="pr-modal-body">
              <div className="pr-form-row">
                <label>{ar ? "الاسم الكامل" : "Full Name"}</label>
                <input className="pr-input" value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="pr-form-row">
                <label>{ar ? "البريد الإلكتروني" : "Email"}</label>
                <input className="pr-input" type="email" value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="pr-form-row">
                <label>{ar ? "نوع المالك" : "Owner Type"}</label>
                <input className="pr-input" value={editForm.owner_type}
                  onChange={(e) => setEditForm({ ...editForm, owner_type: e.target.value })} />
              </div>
              {editError   && <p className="pr-error">{editError}</p>}
              {editSuccess && <p className="pr-success">{editSuccess}</p>}
              <button className="pr-submit-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ التغييرات" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPassword && (
        <div className="pr-modal-overlay" onClick={() => setShowPassword(false)}>
          <div className="pr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h2>{ar ? "تغيير كلمة المرور" : "Change Password"}</h2>
              <button className="pr-modal-close" onClick={() => setShowPassword(false)}>✕</button>
            </div>
            <div className="pr-modal-body">
              <div className="pr-form-row">
                <label>{ar ? "كلمة المرور الحالية" : "Current Password"}</label>
                <div className="pr-input-wrapper">
                  <input className="pr-input" type={showPass.current ? "text" : "password"} value={passForm.old_password}
                    onChange={(e) => setPassForm({ ...passForm, old_password: e.target.value })} />
                  <button className="pr-eye-btn" onClick={() => setShowPass({ ...showPass, current: !showPass.current })}>
                    {showPass.current ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div className="pr-form-row">
                <label>{ar ? "كلمة المرور الجديدة" : "New Password"}</label>
                <div className="pr-input-wrapper">
                  <input className="pr-input" type={showPass.new ? "text" : "password"} value={passForm.new_password}
                    onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })} />
                  <button className="pr-eye-btn" onClick={() => setShowPass({ ...showPass, new: !showPass.new })}>
                    {showPass.new ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div className="pr-form-row">
                <label>{ar ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}</label>
                <div className="pr-input-wrapper">
                  <input className="pr-input" type={showPass.confirm ? "text" : "password"} value={passForm.confirm_password}
                    onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })} />
                  <button className="pr-eye-btn" onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}>
                    {showPass.confirm ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              {passError   && <p className="pr-error">{passError}</p>}
              {passSuccess && <p className="pr-success">{passSuccess}</p>}
              <button className="pr-submit-btn" onClick={handleChangePassword} disabled={savingPass}>
                {savingPass ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "تغيير كلمة المرور" : "Change Password")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}