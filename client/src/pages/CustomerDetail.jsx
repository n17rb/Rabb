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
