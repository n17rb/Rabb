import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, API_ORIGIN } from "../api.js";
import { FiEdit2, FiTrash2, FiCamera, FiMapPin, FiArrowRight } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

export default function CustomerDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    try {
      const full = await api.getCustomer(id);
      setCustomer(full);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="page"><p className="text-secondary">جاري التحميل...</p></div>;
  if (error && !customer) return <div className="page"><div className="error-box">{error}</div></div>;
  if (!customer) return null;

  return (
    <div className="page">
      <button className="btn-danger-text icon-row" style={{ marginBottom: 10 }} onClick={() => navigate("/customers")}>
        <FiArrowRight /> رجوع لقائمة العملاء
      </button>

      {error && <div className="error-box">{error}</div>}

      <CustomerHeader customer={customer} user={user} onChanged={load} onDeleted={() => navigate("/customers")} />
      <PhotoSection customer={customer} onChanged={load} />
      <LocationSection customer={customer} onChanged={load} />
    </div>
  );
}

function CustomerHeader({ customer, user, onChanged, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone_display);
  const [seq, setSeq] = useState(customer.sequential_number);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isPrivileged = user.role === "super_admin" || user.role === "admin";
  const canDelete = isPrivileged || user.can_delete_customer;

  const whatsappLink = `https://wa.me/${customer.phone_normalized}`;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.updateCustomer(customer.id, { name, phone, sequential_number: seq });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!confirm(`متأكد إنك بدك تحذف "${customer.name}"؟`)) return;
    api.archiveCustomer(customer.id).then(onDeleted).catch((err) => setError(err.message));
  }

  if (editing) {
    return (
      <div className="card">
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>اسم العميل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>رقم الهاتف</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div className="field">
          <label>الرقم التسلسلي</label>
          <input value={seq} onChange={(e) => setSeq(e.target.value)} />
        </div>
        <button className="btn-primary" style={{ marginBottom: 10 }} disabled={saving} onClick={handleSave}>
          {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>إلغاء</button>
      </div>
    );
  }

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="title-md" style={{ marginBottom: 4 }}>{customer.name}</h2>
          <p className="tabular-num text-secondary" style={{ margin: 0 }}>
            {customer.phone_display} · #{customer.sequential_number}
          </p>
        </div>
        <div className="icon-row">
          <a className="icon-btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer" title="فتح واتساب">
            <FaWhatsapp size={18} />
          </a>
          <button className="icon-btn" onClick={() => setEditing(true)} title="تعديل">
            <FiEdit2 size={16} />
          </button>
          {canDelete && (
            <button className="icon-btn" style={{ color: "var(--urgent)", borderColor: "#f6cfcb" }} onClick={handleDelete} title="حذف">
              <FiTrash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoSection({ customer, onChanged }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fullPhotoUrl = customer.building_photo_url
    ? (customer.building_photo_url.startsWith("http") ? customer.building_photo_url : API_ORIGIN + customer.building_photo_url)
    : null;

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await api.uploadCustomerPhoto(customer.id, file);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}
      {fullPhotoUrl ? (
        <img src={fullPhotoUrl} alt="صورة العمارة" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
      ) : (
        <p className="text-secondary">لا توجد صورة للعمارة بعد.</p>
      )}
      <label className="btn-secondary icon-row" style={{ justifyContent: "center" }}>
        <FiCamera />
        {uploading ? "جاري الرفع..." : "رفع / تغيير صورة العمارة"}
        <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
      </label>
    </div>
  );
}

function LocationSection({ customer, onChanged }) {
  const [regions, setRegions] = useState([]);
  const [regionId, setRegionId] = useState(customer.region_id || "");
  const [newRegionName, setNewRegionName] = useState("");
  const [street, setStreet] = useState(customer.street || "");
  const [buildingNumber, setBuildingNumber] = useState(customer.building_number || "");
  const [buildingName, setBuildingName] = useState(customer.building_name || "");
  const [floor, setFloor] = useState(customer.floor || "");
  const [apartment, setApartment] = useState(customer.apartment || "");
  const [side, setSide] = useState(customer.side || "");
  const [accessNotes, setAccessNotes] = useState(customer.access_notes || "");
  const [latitude, setLatitude] = useState(customer.latitude || null);
  const [longitude, setLongitude] = useState(customer.longitude || null);
  const [pastedLink, setPastedLink] = useState(customer.maps_url || "");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.getRegions().then(setRegions).catch(() => {});
  }, []);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("هذا المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setPastedLink("");
        setLocating(false);
      },
      (err) => {
        setError("تعذّر تحديد الموقع: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function tryParseCoordsFromLink(link) {
    const match = link.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    return null;
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let finalRegionId = regionId || null;
      if (newRegionName.trim()) {
        const created = await api.createRegion({ name: newRegionName.trim() });
        finalRegionId = created.id;
      }

      let finalLat = latitude;
      let finalLng = longitude;
      let finalMapsUrl;

      if (pastedLink.trim()) {
        finalMapsUrl = pastedLink.trim();
        const parsed = tryParseCoordsFromLink(pastedLink.trim());
        if (parsed) {
          finalLat = parsed.lat;
          finalLng = parsed.lng;
        }
      } else if (latitude && longitude) {
        finalMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      }

      await api.updateCustomer(customer.id, {
        region_id: finalRegionId,
        street,
        building_number: buildingNumber,
        building_name: buildingName,
        floor,
        apartment,
        side,
        access_notes: accessNotes,
        latitude: finalLat,
        longitude: finalLng,
        maps_url: finalMapsUrl,
      });

      setSuccess("تم حفظ الموقع والعنوان بنجاح.");
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasLocation = Boolean(customer.maps_url || (latitude && longitude));

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="title-md" style={{ margin: 0 }}>الموقع والعنوان</h2>
        {hasLocation && (
          <a
            className="icon-btn map"
            href={customer.maps_url || `https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            title="فتح موقع العميل على الخريطة"
          >
            <FiMapPin size={18} />
          </a>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <button
        type="button"
        className="btn-secondary"
        style={{ marginBottom: 10 }}
        onClick={useCurrentLocation}
        disabled={locating}
      >
        {locating ? "جاري تحديد الموقع..." : "📍 أنا واقف عند بيت العميل الآن"}
      </button>

      {latitude && longitude && !pastedLink && (
        <p className="text-secondary tabular-num" style={{ marginTop: -4, marginBottom: 10 }}>
          تم تحديد الموقع ✅ ({latitude.toFixed(5)}, {longitude.toFixed(5)})
        </p>
      )}

      <div className="field">
        <label>أو الصق رابط موقع Google Maps مباشرة (بدون الحاجة للوقوف عند البيت)</label>
        <input
          value={pastedLink}
          onChange={(e) => setPastedLink(e.target.value)}
          placeholder="https://maps.google.com/..."
        />
      </div>

      <div className="field">
        <label>المنطقة</label>
        <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setNewRegionName(""); }}>
          <option value="">اختر منطقة...</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>أو أضف منطقة جديدة (اتركه فارغ إذا اخترت من الأعلى)</label>
        <input value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} placeholder="مثال: الرابية" />
      </div>

      <div className="field-row">
        <div className="field">
          <label>الشارع</label>
          <input value={street} onChange={(e) => setStreet(e.target.value)} />
        </div>
        <div className="field">
          <label>رقم العمارة</label>
          <input value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>اسم العمارة (اختياري)</label>
        <input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>الطابق</label>
          <input value={floor} onChange={(e) => setFloor(e.target.value)} />
        </div>
        <div className="field">
          <label>رقم الشقة</label>
          <input value={apartment} onChange={(e) => setApartment(e.target.value)} />
        </div>
        <div className="field">
          <label>الجهة</label>
          <input value={side} onChange={(e) => setSide(e.target.value)} placeholder="يمين/يسار" />
        </div>
      </div>

      <div className="field">
        <label>وصف الوصول (ملاحظة توضح المكان)</label>
        <textarea rows={2} value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} />
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? "جاري الحفظ..." : "حفظ الموقع والعنوان"}
      </button>
    </div>
  );
}
