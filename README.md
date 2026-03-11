# Rekap Kegiatan Subbag (Next.js + Node.js + Prisma + MySQL)

Project ini sudah *langsung jalan* (frontend & backend dalam 1 project Next.js) dan **database menggunakan MySQL**.

## 1) Prasyarat
- Node.js >= 18
- MySQL Server >= 8 (atau MariaDB yang kompatibel)
- NPM (atau pnpm/yarn)

## 2) Setup database MySQL
1. Buat database:
   ```sql
   CREATE DATABASE rekap_kegiatan;
   ```
2. Copy env:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` dan sesuaikan koneksi MySQL:
   ```env
   DATABASE_URL="mysql://root:password@localhost:3306/rekap_kegiatan"
   JWT_SECRET="ganti_dengan_string_panjang_acak_min_32_karakter"
   ```

## 3) Cara menjalankan (lokal)
1. Extract ZIP ini
2. Masuk folder project:
   ```bash
   cd ohgitu-rekap-kegiatan
   ```
3. Install dependency:
   ```bash
   npm install
   ```
4. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```
5. Jalankan migrasi ke MySQL:
   ```bash
   npm run migrate -- --name init
   ```
6. Seed data (buat user + subbag + akun + pagu default):
   ```bash
   npm run seed
   ```
7. Jalankan:
   ```bash
   npm run dev
   ```
8. Buka:
   - http://localhost:3000

## 4) Akun default (hasil seed)
- Super Admin: `admin@local` / `admin123`
- User subbag:
  - `a@local` / `user123`
  - `b@local` / `user123`
  - `c@local` / `user123`
  - `d@local` / `user123`

## 5) Fitur yang sudah ada
- Login + proteksi halaman (proxy)
- Dark mode / light mode (toggle tema)
- Role:
  - SUPER_ADMIN: bisa lihat semua subbag
  - USER: hanya data subbag miliknya
- Dashboard rekap kegiatan per tahun (+ filter subbag untuk admin)
- Tombol **Rekap Capaian Kinerja** (per bulan / per 6 bulan / tahunan) + detail kegiatan & anggaran
- CRUD Kegiatan (Create, Update, Delete) via UI
- Upload bukti dukung & dokumentasi (PDF/JPG/PNG/WEBP) ke folder `public/uploads`
- Preview dokumentasi membuka tab baru (via route `/files/docs/...`) dan tombol download pakai nama file asli
- Notifikasi error/sukses menggunakan toast (muncul di atas layar) + konfirmasi aksi delete menggunakan modal
- Halaman **/users**:
  - CRUD user lewat UI (tambah/edit/hapus)
  - Ganti password user (kolom password baru per user)
  - Super Admin bisa mengubah email & password akunnya sendiri (Pengaturan Akun)
- Halaman **/budgets**: Super Admin bisa tambah/edit pagu kegiatan & detail akun (Pagu Global) lewat UI
- Halaman **/sasaran**: Super Admin bisa CRUD Sasaran Strategis & Indikator lewat UI
- Halaman **/logs**: Super Admin bisa hapus log per hari / per bulan

## 6) Catatan produksi
- **Wajib set `JWT_SECRET`**. Di production minimal 32 karakter (random) dan jangan pakai value default.
- Akses langsung ke `/uploads/*` **diblock** oleh proxy (404). Gunakan route ber-auth seperti `/files/docs/...` untuk preview/download.
- Security headers (CSP minimal, HSTS di production, dsb) sudah diset di `next.config.js`.
- Jalankan di belakang HTTPS (reverse proxy Nginx/Caddy/Cloudflare).
- Untuk upload file, disarankan pakai storage (S3/MinIO) + backup supaya aman & tidak hilang saat deploy.

Selamat mencoba.
