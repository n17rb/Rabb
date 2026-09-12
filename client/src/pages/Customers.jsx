import { useEffect, useState } from "react";
import { api, API_ORIGIN } from "../api.js";

export default function Customers() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState(null);

  async function search(q) {
    setLoading(true);
    setError("");
    try {
      const result = await api.getCustomers(q);
      setCustomers(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search("");
  }, []);

  function handleSearchChange(e) {
    const q = e.target.value;
    setQuery(q);
    search(q);
  }

  async function openCustomer(c) {
    // نجيب أحدث نسخة كاملة من العميل (فيها كل حقول الموقع)
    try {
      const full = await api.getCustomer(c.id);
      setSelected(full);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1 className="title-lg">العملاء</h1>

      {!showAddForm && !selected && (
        <>
          <div className="field">
            <input
              placeholder="ابحث برقم الهاتف، الاسم، أو رقم العميل..."
              value={query}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>

          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowAddForm(true)}>
            ＋ زبون جديد
          </button>

          {error && <div className="error-box">{error}</div>}
          {loading && <p className="text-secondary">جاري البحث...</p>}

          <div className="card" style={{ padding: 0 }}>
            {customers.length === 0 && !loading && (
              <p className="text-secondary" style={{ padding: 14 }}>لا يوجد عملاء مطابقون.</p>
            )}
            {customers.map((c) => (
              <div key={c.id} className="customer-row" onClick={() => openCustomer(c)} style={{ cursor: "pointer", padding: "10px 14px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="text-secondary tabular-num">{c.phone_display} · #{c.sequential_number}</div>
                </div>
                {c.region_name && <span className="badge">{c.region_name}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {showAddForm && (
        <AddCustomerForm
          onCancel={() => setShowAddForm(false)}
          onSaved={async (c) => {
            setShowAddForm(false);
            search(query);
            await openCustomer(c);
          }}
        />
      )}

      {selected && !showAddForm && (
        <CustomerDetail customer={selected} onBack={() => { setSelected(null); search(query); }} />
      )}
    </div>
  );
}

function AddCustomerForm({ onCancel, onSaved }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const result = await api.createCustomer({ name, phone });
      if (result.alreadyExists) {
        setInfo(result.message);
      }
      onSaved(result.customer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="title-md">إضافة زبون جديد</h2>
      {error && <div className="error-box">{error}</div>}
      {info && <div className="success-box">{info}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>اسم العميل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>رقم الهاتف</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="07xxxxxxxx" />
        </div>
        <button className="btn-primary" disabled={loading} style={{ marginBottom: 10 }}>
          {loading ? "جاري الحفظ..." : "حفظ العميل"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>إلغاء</button>
      </form>
    </div>
  );
}

function CustomerDetail({ customer, onBack }) {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(customer.building_photo_url || null);
  const [error, setError] = useState("");

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await api.uploadCustomerPhoto(customer.id, file);
      setPhotoUrl(result.photoUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // الصورة تُخزَّن كرابط نسبي من السيرفر (/uploads/xxx.webp)
  // لازم نضيف عنوان السيرفر قبلها حتى تظهر صح من الواجهة المنشورة على دومين مختلف
  const fullPhotoUrl = photoUrl
    ? (photoUrl.startsWith("http") ? photoUrl : API_ORIGIN + photoUrl)
    : null;

  return (
    <div className="card">
      <button className="btn-danger-text" style={{ marginBottom: 10 }} onClick={onBack}>← رجوع لقائمة العملاء</button>

      <h2 className="title-md">{customer.name}</h2>
      <p className="tabular-num text-secondary">{customer.phone_display} · #{customer.sequential_number}</p>

      {error && <div className="error-box">{error}</div>}

      {fullPhotoUrl ? (
        <img src={fullPhotoUrl} alt="صورة العمارة" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
      ) : (
        <p className="text-secondary">لا توجد صورة للعمارة بعد.</p>
      )}

      <label className="btn-secondary" style={{ display: "block", textAlign: "center", marginBottom: 20 }}>
        {uploading ? "جاري الرفع..." : "📸 رفع / تغيير صورة العمارة"}
        <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
      </label>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      <LocationForm customer={customer} />
    </div>
  );
}

function LocationForm({ customer }) {
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
        setLocating(false);
      },
      (err) => {
        setError("تعذّر تحديد الموقع: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let finalRegionId = regionId || null;

      // لو كتب اسم منطقة جديدة بدل ما يختار من القائمة
      if (newRegionName.trim()) {
        const created = await api.createRegion({ name: newRegionName.trim() });
        finalRegionId = created.id;
      }

      const maps_url =
        latitude && longitude
          ? `https://www.google.com/maps?q=${latitude},${longitude}`
          : undefined;

      await api.updateCustomer(customer.id, {
        region_id: finalRegionId,
        street,
        building_number: buildingNumber,
        building_name: buildingName,
        floor,
        apartment,
        side,
        access_notes: accessNotes,
        latitude,
        longitude,
        maps_url,
      });

      setSuccess("تم حفظ الموقع والعنوان بنجاح.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="title-md">الموقع والعنوان</h2>
      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <button
        type="button"
        className="btn-secondary"
        style={{ marginBottom: 14 }}
        onClick={useCurrentLocation}
        disabled={locating}
      >
        {locating ? "جاري تحديد الموقع..." : "📍 استخدام موقعي الحالي (وأنا واقف عند البيت)"}
      </button>

      {latitude && longitude && (
        <p className="text-secondary tabular-num" style={{ marginTop: -8, marginBottom: 14 }}>
          تم تحديد الموقع ✅ ({latitude.toFixed(5)}, {longitude.toFixed(5)})
        </p>
      )}

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

      <div className="field">
        <label>الشارع</label>
        <input value={street} onChange={(e) => setStreet(e.target.value)} />
      </div>

      <div className="field">
        <label>رقم العمارة</label>
        <input value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} />
      </div>

      <div className="field">
        <label>اسم العمارة (اختياري)</label>
        <input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
      </div>

      <div className="field">
        <label>الطابق</label>
        <input value={floor} onChange={(e) => setFloor(e.target.value)} />
      </div>

      <div className="field">
        <label>رقم الشقة</label>
        <input value={apartment} onChange={(e) => setApartment(e.target.value)} />
      </div>

      <div className="field">
        <label>جهة الشقة (يمين / يسار...)</label>
        <input value={side} onChange={(e) => setSide(e.target.value)} />
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
