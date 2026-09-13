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

  const canManage = ["super_admin", "admin", "data_entry"].includes(user.role);

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

      <CustomerHeader customer={customer} canManage={canManage} onChanged={load} onDeleted={() => navigate("/customers")} />
      <LocationSection customer={customer} canManage={canManage} onChanged={load} />
    </div>
  );
}

function CustomerHeader({ customer, canManage, onChanged, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone_display);
  const [seq, setSeq] = useState(customer.sequential_number);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const whatsappLink = `https://wa.me/${customer.phone_normalized}`;

  const currentPhotoUrl = customer.building_photo_url
    ? (customer.building_photo_url.startsWith("http") ? customer.building_photo_url : API_ORIGIN + customer.building_photo_url)
    : null;

  function handlePickPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.updateCustomer(customer.id, { name, phone, sequential_number: seq });
      if (photoFile) {
        await api.uploadCustomerPhoto(customer.id, photoFile);
      }
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
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

        {(photoPreview || currentPhotoUrl) && (
          <img
            src={photoPreview || currentPhotoUrl}
            alt="صورة العمارة"
            style={{ width: "100%", borderRadius: 8, marginBottom: 12 }}
          />
        )}
        <label className="btn-secondary icon-row" style={{ justifyContent: "center", marginBottom: 16 }}>
          <FiCamera />
          {photoFile ? "تم اختيار صورة جديدة — اضغط حفظ لتثبيتها" : "تغيير صورة العمارة"}
          <input type="file" accept="image/*" capture="environment" onChange={handlePickPhoto} style={{ display: "none" }} />
        </label>

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
        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null); }}
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}

      {currentPhotoUrl ? (
        <img src={currentPhotoUrl} alt="صورة العمارة" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
      ) : (
        <p className="text-secondary">لا توجد صورة للعمارة بعد — اضغط تعديل لإضافتها.</p>
      )}

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
          {canManage && (
            <button className="icon-btn" onClick={() => setEditing(true)} title="تعديل">
              <FiEdit2 size={16} />
            </button>
          )}
          {canManage && (
            <button className="icon-btn" style={{ color: "var(--urgent)", borderColor: "#f6cfcb" }} onClick={handleDelete} title="حذف">
              <FiTrash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

async function reverseGeocodeStreet(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    return data?.address?.road || data?.address?.neighbourhood || null;
  } catch {
    return null;
  }
}

function LocationSection({ customer, canManage, onChanged }) {
  const hasSavedLocation = Boolean(customer.maps_url);
  const [editingLocation, setEditingLocation] = useState(!hasSavedLocation);

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
  const [pastedLink, setPastedLink] = useState("");
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
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const confirmed = confirm("هل تريد تأكيد موقعك الحالي كموقع هذا العميل؟");
        if (!confirmed) {
          setLocating(false);
          return;
        }
        setLatitude(lat);
        setLongitude(lng);
        setPastedLink("");

        if (!street.trim()) {
          const detectedStreet = await reverseGeocodeStreet(lat, lng);
          if (detectedStreet) setStreet(detectedStreet);
        }
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
      let finalMapsUrl = customer.maps_url;

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

      setEditingLocation(false);
      setSuccess("تم حفظ الموقع بنجاح");
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box" style={{ color: "green", marginBottom: 10 }}>{success}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 className="title-md" style={{ margin: 0 }}>موقع التوصيل</h3>
        {hasSavedLocation && !editingLocation && canManage && (
          <button className="btn-secondary" onClick={() => setEditingLocation(true)}>
            تعديل الموقع
          </button>
        )}
      </div>

      {!editingLocation && hasSavedLocation ? (
        <div>
          <p style={{ margin: "4px 0" }}><strong>المنطقة:</strong> {regions.find(r => r.id === customer.region_id)?.name || "غير محددة"}</p>
          <p style={{ margin: "4px 0" }}><strong>الشارع:</strong> {customer.street || "-"}</p>
          <p style={{ margin: "4px 0" }}><strong>العمارة:</strong> {customer.building_name || customer.building_number || "-"}</p>
          <p style={{ margin: "4px 0" }}><strong>الطابق / الشقة:</strong> طابق {customer.floor || "-"} · شقة {customer.apartment || "-"}</p>
          {customer.maps_url && (
            <a href={customer.maps_url} target="_blank" rel="noreferrer" className="btn-primary icon-row" style={{ marginTop: 12, justifyContent: "center", textDecoration: "none" }}>
              <FiMapPin /> فتح على خرائط جوجل
            </a>
          )}
        </div>
      ) : (
        <div>
          <button type="button" className="btn-secondary icon-row" style={{ width: "100%", justifyContent: "center", marginBottom: 16 }} onClick={useCurrentLocation} disabled={locating}>
            <FiMapPin /> {locating ? "جاري تحديد الموقع..." : "استخدام موقعي الحالي"}
          </button>

          <div className="field">
            <label>رابط خرائط جوجل (اختياري)</label>
            <input value={pastedLink} onChange={(e) => setPastedLink(e.target.value)} placeholder="الصق رابط خرائط جوجل هنا" />
          </div>

          <div className="field">
            <label>المنطقة</label>
            <select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
              <option value="">اختر المنطقة...</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>أو إضافة منطقة جديدة</label>
            <input value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} placeholder="اسم المنطقة الجديدة" />
          </div>

          <div className="field">
            <label>الشارع</label>
            <input value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="field">
              <label>رقم العمارة</label>
              <input value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} />
            </div>
            <div className="field">
              <label>اسم العمارة</label>
              <input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="field">
              <label>الطابق</label>
              <input value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
            <div className="field">
              <label>الشقة</label>
              <input value={apartment} onChange={(e) => setApartment(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>ملاحظات الوصول</label>
            <textarea value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder="تعليمات إضافية للمندوب..." rows={2} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-primary" style={{ flex: 1 }} disabled={saving} onClick={handleSave}>
              {saving ? "جاري الحفظ..." : "حفظ الموقع"}
            </button>
            {hasSavedLocation && (
              <button type="button" className="btn-secondary" onClick={() => setEditingLocation(false)}>
                إلغاء
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
