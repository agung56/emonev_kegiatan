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
   JWT_SECRET="ganti_dengan_string_panjang_acak"
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
- Login + proteksi halaman (middleware)
- Role:
  - SUPER_ADMIN: bisa lihat semua subbag
  - USER: hanya data subbag miliknya
- Dashboard rekap kegiatan per tahun (+ filter subbag untuk admin)
- Tombol **Rekap Capaian Kinerja** (per bulan / per 6 bulan / tahunan) + detail kegiatan & anggaran
- CRUD Kegiatan (Create, Update, Delete) via UI
- Upload bukti dukung foto (jpg/png/webp) ke `/public/uploads`
- Halaman **/users**: CRUD user lewat UI (tambah/edit/hapus + reset password)
- Halaman **/budgets**: Super Admin bisa tambah pagu baru & update pagu lewat UI
- Halaman **/sasaran**: Super Admin bisa CRUD Sasaran Strategis & Indikator lewat UI

## 6) Import Master Indikator dari Excel

Sesuai pedoman excel:
- Sheet: **Master**
- Kolom C: Sasaran Program
- Kolom D: Indikator Kinerja
- Kolom AD: Formula Perhitungan
- Kolom AE: Sumber Data

Jalankan (contoh):

```bash
npm run import:master -- --file "/path/to/Master Cascading PK 2025-2029_27 Jan 2026_14.44 WIB.xlsx" --tahun 2026 --kepemilikan LEMBAGA
```

## 7) Catatan produksi
- Ganti `JWT_SECRET` di `.env` dengan string panjang & random
- Untuk upload bukti dukung, disarankan pakai storage (S3/MinIO) supaya aman & tidak hilang saat deploy.

Selamat mencoba.
