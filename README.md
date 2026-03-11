# Rekap Kegiatan Subbag (Next.js + Node.js + Prisma + MySQL)

Project ini sudah *langsung jalan* (frontend & backend dalam 1 project Next.js) dan **database menggunakan MySQL**.

## 1) Prasyarat
- Node.js >= 20.9 (disarankan 20.x, sesuai `package.json`)
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
   cd emonev_kegiatan
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

### Troubleshooting Windows (npm EPERM/EACCES)
- Pastikan Node **20.x** (`node -v`), jangan Node 24.x.
- Jika PowerShell memblok `npm` (ExecutionPolicy), gunakan `npm.cmd`:
  - `npm.cmd ci --no-audit --no-fund --cache .\\.npm-cache`
- Jika masih `EPERM spawn` / `EACCES`, coba:
  - Jalankan terminal sebagai Administrator, atau
  - Tambahkan folder project ke exception antivirus/Defender, dan pastikan folder cache (`.npm-cache`) writable.

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

## 6) Catatan produksi
- **Wajib set `JWT_SECRET`**. Di production minimal 32 karakter (random) dan jangan pakai value default.
- Akses langsung ke `/uploads/*` **diblock** oleh proxy (404). Gunakan route ber-auth seperti `/files/docs/...` untuk preview/download.
- Security headers (CSP minimal, HSTS di production, dsb) sudah diset di `next.config.js`.
- Jalankan di belakang HTTPS (reverse proxy Nginx/Caddy/Cloudflare).
- Untuk upload file, disarankan pakai storage (S3/MinIO) + backup supaya aman & tidak hilang saat deploy.

## 7) Deploy di cPanel (tanpa Node.js tidak bisa)
Next.js + API routes **butuh Node.js runtime**. Jadi kalau di cPanel Anda **belum ada menu** `Setup Node.js App` / `Node.js Selector`, aplikasi ini tidak bisa jalan di hosting tersebut (opsinya: upgrade paket/aktifkan Node.js, atau pindah ke VPS/hosting yang support Node.js).

Jika cPanel Anda support Node.js:
1. Upload project ke server (Git/FTP/File Manager).
2. Siapkan database MySQL & set env (`DATABASE_URL`, `JWT_SECRET`) di `.env` atau via Environment Variables di cPanel.
3. Buka `Setup Node.js App`:
   - Pilih Node.js versi **20.x** (sesuai `package.json`).
   - Set **Application root** ke folder project.
   - Set **Application startup file** ke `server.js`.
4. Install & build (via Terminal/SSH atau fitur Run NPM di cPanel):
   ```bash
   npm ci
   npx prisma generate
   npm run migrate:deploy
   npm run build
   ```
5. Restart aplikasi dari cPanel.

### Jika `npm ci` gagal (mis. `SIGABRT` saat `unrs-resolver` / limit thread)
Di shared hosting, proses install dependency kadang gagal karena limit thread/proses. Solusi paling aman: **build di lokal** lalu upload hasil build **standalone** sehingga server tidak perlu `npm ci` / `npm run build`.

1. Di lokal (PC/laptop):
   ```bash
   npm ci
   # penting: prisma generate harus dijalankan di lokal supaya Prisma Client ikut ter-bundle
   npx prisma generate
   # opsional: kalau DATABASE_URL bisa akses database server (mis. via SSH tunnel)
   npm run migrate:deploy
   npm run seed
   npm run build:standalone
   ```
   Hasilnya ada di folder `dist/`.
2. Upload **isi** folder `dist/` ke server (jadikan itu Application root), lalu di cPanel:
   - **Application root**: folder hasil upload `dist/`
   - **Application startup file**: `server.js`
3. Set env di cPanel (minimal `DATABASE_URL`, `JWT_SECRET`) lalu restart.

Catatan penting (shared hosting ketat):
- Jangan jalankan `npm install` / `npm ci` di server. Paket `dist/` sudah membawa `node_modules` yang dibutuhkan Next.js runtime.
- `dist/package.json` dibuat minimal supaya kalau cPanel menawarkan `npm install`, tidak mengunduh dependency besar yang bisa memicu limit proses.
- (Opsional) Kalau Anda sudah tahu target Prisma engine di server, Anda bisa kecilkan `dist/` saat packaging dengan env `DIST_PRISMA_TARGET` (lihat `dist/DEPLOY_CPANEL.md`).
- File upload (dokumentasi/evidence) di server disimpan di `public/uploads`. Paket `dist/` **tidak** membawa `public/uploads` dari lokal agar ukuran upload kecil; pastikan folder `public/uploads` di server tetap ada dan writable.

#### Versi command (cPanel Terminal)
Misal Application root Anda ada di `~/public_html/emonev_kegiatan/dist`:
```bash
cd ~/public_html/emonev_kegiatan/dist

# cek runtime
node -v

# cek health (bisa juga buka lewat browser: /api/health dan /api/health?db=1)
node -e "const p=process.env.PORT||3000;fetch('http://127.0.0.1:'+p+'/api/health?db=1').then(r=>r.text()).then(console.log).catch(console.error)"

# (opsional) lihat apakah env sudah kebaca
echo "$DATABASE_URL"

# jalankan migrasi (kalau punya akses mysql client)
# jalankan per file, urut sesuai timestamp folder
for f in prisma/migrations/*/migration.sql; do
  echo "Running $f"
  mysql -h localhost -u DB_USER -p DB_NAME < "$f"
done

# seed (buat akun default) - jalankan via phpMyAdmin: `prisma/seed.sql`
```
Lalu restart aplikasi via tombol **Restart** di `Setup Node.js App`.

Catatan:
- Paket `dist/` **tidak** menyertakan `.env` (biar tidak ikut keupload), jadi pastikan env di-set via cPanel.
- Jalankan perintah dari terminal yang sudah memakai environment Node.js App (di cPanel `Setup Node.js App` → **Open Terminal**). Kalau `node -v` menunjukkan versi di luar 20.x, biasanya terminalnya belum masuk environment app.
- Jika database **hanya bisa diakses dari server**, Anda bisa:
  - Jalankan migrasi manual via phpMyAdmin/MySQL client dengan file `prisma/migrations/*/migration.sql` (folder `prisma/migrations` ikut dipaketkan ke `dist/`), lalu
  - Seed:
    - Jalankan seed via SQL (`prisma/seed.sql`) di phpMyAdmin (lebih ringan, tidak bikin Node/Prisma jalan).

Selamat mencoba.
