-- ============================================================
-- نظام إدارة محل مياه وتوزيع — Database Schema
-- Phase 1: Foundation (Users, Customers, Products, Regions, Log)
-- ============================================================

-- ---------- المستخدمون ----------
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'driver')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  can_discount BOOLEAN NOT NULL DEFAULT false,
  can_delete_customer BOOLEAN NOT NULL DEFAULT false,
  can_edit_product_price BOOLEAN NOT NULL DEFAULT false,
  can_cancel_order BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ترقية آمنة لقاعدة بيانات موجودة مسبقًا: نسمح بالدور الجديد 'super_admin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'driver'));

-- مهم جدًا: ترقية أول حساب تم إنشاؤه إلى "مدير١" تلقائيًا إذا لا يوجد أي مدير١ بالنظام بعد.
-- هذا يمنع فقدان وصولك لصفحة المستخدمين بعد هذا التحديث (حسابك الحالي كان "مدير" بالتسمية القديمة).
-- آمن للتكرار: بعد أول مرة يصبح هناك مدير١، هذا السطر لا يفعل شيئًا بعدها.
UPDATE users SET role = 'super_admin'
WHERE id = (SELECT MIN(id) FROM users)
  AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin');

-- ---------- المناطق (قابلة للإضافة من الإدارة) ----------
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- العملاء ----------
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  sequential_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone_normalized VARCHAR(20) UNIQUE NOT NULL,
  phone_display VARCHAR(30) NOT NULL,
  phone_alt VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS customer_seq START 1;

-- ---------- موقع العميل ----------
CREATE TABLE IF NOT EXISTS customer_locations (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_url TEXT,
  region_id INTEGER REFERENCES regions(id),
  street VARCHAR(150),
  building_number VARCHAR(30),
  building_name VARCHAR(100),
  floor VARCHAR(30),
  apartment VARCHAR(30),
  side VARCHAR(30),
  access_notes TEXT,
  building_photo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- المنتجات ----------
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'standard',
  unit_price NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by INTEGER REFERENCES users(id)
);

-- ---------- سجل النشاطات ----------
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  record_id INTEGER,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- فهارس للأداء ----------
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_phone_display_pattern ON customers(phone_display text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_seq ON customers(sequential_number);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_record ON activity_log(record_type, record_id);

-- ============================================================
-- تنظيف أي تكرار سابق قبل إضافة القيد الفريد (آمن، لا يمس منتج داخل طلب)
-- ============================================================
DELETE FROM products a USING products b
WHERE a.id > b.id AND a.name = b.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_unique ON products(name);

-- ============================================================
-- Seed Data: المنتجات الابتدائية (قابلة للتعديل لاحقًا من لوحة الإدارة)
-- ============================================================
INSERT INTO products (name, type, unit_price, sort_order) VALUES
  ('قارورة 19 لتر (تعبئة)', 'standard', 1.00, 1),
  ('قارورة 10 لتر (تعبئة)', 'standard', 0.75, 2),
  ('شرنك كبير', 'standard', 1.10, 3),
  ('شرنك وسط', 'standard', 1.35, 4),
  ('شرنك بيبي', 'standard', 1.60, 5),
  ('قارورة 19 لتر جديدة + معبأة', 'standard', 4.00, 6),
  ('قارورة 10 لتر جديدة + معبأة', 'standard', 3.00, 7),
  ('كرتون مياه 250 مل', 'standard', 1.60, 8),
  ('كرتون مياه 200 مل', 'standard', 1.35, 9),
  ('كوبون 10', 'coupon', 10.00, 10),
  ('كوبون 27', 'coupon', 25.00, 11),
  ('كوبون 55', 'coupon', 50.00, 12)
ON CONFLICT (name) DO NOTHING;
