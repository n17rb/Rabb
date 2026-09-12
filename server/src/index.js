import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

import authRoutes from "./routes/auth.js";
import setupRoutes from "./routes/setup.js";
import customerRoutes from "./routes/customers.js";
import productRoutes from "./routes/products.js";
import regionRoutes from "./routes/regions.js";
import userRoutes from "./routes/users.js";
import { UPLOADS_DIR } from "./middleware/upload.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/setup", setupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/users", userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "حدث خطأ غير متوقع في السيرفر." });
});

// ✅ تهيئة قاعدة البيانات تلقائيًا عند بدء تشغيل السيرفر (بدون الحاجة لـ Shell)
// الأمر آمن للتكرار: IF NOT EXISTS وON CONFLICT DO NOTHING تمنع أي تكرار أو ضرر
async function initDbIfNeeded() {
  try {
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    await pool.query(sql);
    console.log("✅ تم التأكد من وجود الجداول والبيانات الابتدائية.");
  } catch (err) {
    console.error("❌ خطأ أثناء تهيئة قاعدة البيانات:", err.message);
  }
}

const PORT = process.env.PORT || 4000;

initDbIfNeeded().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ السيرفر شغال على المنفذ ${PORT}`);
  });
});
