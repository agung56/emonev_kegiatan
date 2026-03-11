-- Seed minimal data tanpa Node/Prisma (untuk shared hosting yang ketat).
-- Jalankan via phpMyAdmin (tab SQL) atau mysql client.
--
-- 1) Generate bcrypt hash di lokal (Windows/Mac/Linux):
--    node -e "console.log(require('bcryptjs').hashSync('admin123',10))"
--    node -e "console.log(require('bcryptjs').hashSync('user123',10))"
--
-- 2) Tempel hasilnya ke variabel di bawah, lalu jalankan SQL ini.

SET @ADMIN_EMAIL = 'admin@local';
SET @ADMIN_NAME = 'Super Admin';
SET @ADMIN_PASS_HASH = '$2a$10$tGRReCEdfvUHg6OiVrk0fu4YawoM/9U0MBdLdlIxrvwLfe0NG64BO';

SET @USER_PASS_HASH = '$2a$10$n1W.EznRivHDHTLfOMwX7OOsAFCXBPjy/0jCfsaj9.lmb3dWe4TMW';

-- Subbag (pakai INSERT IGNORE lalu SELECT id agar tidak double)
INSERT IGNORE INTO `Subbag` (`id`, `nama`, `createdAt`)
VALUES (REPLACE(UUID(), '-', ''), 'subbag KUL', NOW(3));
SELECT `id` INTO @SB_KUL FROM `Subbag` WHERE `nama` = 'subbag KUL' LIMIT 1;

INSERT IGNORE INTO `Subbag` (`id`, `nama`, `createdAt`)
VALUES (REPLACE(UUID(), '-', ''), 'subbag tekhum', NOW(3));
SELECT `id` INTO @SB_TEKHUM FROM `Subbag` WHERE `nama` = 'subbag tekhum' LIMIT 1;

INSERT IGNORE INTO `Subbag` (`id`, `nama`, `createdAt`)
VALUES (REPLACE(UUID(), '-', ''), 'subbag rendatin', NOW(3));
SELECT `id` INTO @SB_RENDATIN FROM `Subbag` WHERE `nama` = 'subbag rendatin' LIMIT 1;

INSERT IGNORE INTO `Subbag` (`id`, `nama`, `createdAt`)
VALUES (REPLACE(UUID(), '-', ''), 'subbag sdmparmas', NOW(3));
SELECT `id` INTO @SB_SDMPARMAS FROM `Subbag` WHERE `nama` = 'subbag sdmparmas' LIMIT 1;

-- Akun anggaran
INSERT IGNORE INTO `BudgetAccount` (`id`, `kodeAkun`, `namaAkun`)
VALUES (REPLACE(UUID(), '-', ''), '5.2.01', 'Belanja Barang');
SELECT `id` INTO @AKUN_BARANG FROM `BudgetAccount`
WHERE `kodeAkun` = '5.2.01' AND `namaAkun` = 'Belanja Barang'
LIMIT 1;

INSERT IGNORE INTO `BudgetAccount` (`id`, `kodeAkun`, `namaAkun`)
VALUES (REPLACE(UUID(), '-', ''), '5.2.02', 'Belanja Jasa');
SELECT `id` INTO @AKUN_JASA FROM `BudgetAccount`
WHERE `kodeAkun` = '5.2.02' AND `namaAkun` = 'Belanja Jasa'
LIMIT 1;

-- User (admin + 4 user subbag)
INSERT IGNORE INTO `User`
(`id`, `name`, `email`, `passwordHash`, `role`, `subbagId`, `isActive`, `createdAt`, `updatedAt`)
VALUES
(REPLACE(UUID(), '-', ''), @ADMIN_NAME, @ADMIN_EMAIL, @ADMIN_PASS_HASH, 'SUPER_ADMIN', NULL, TRUE, NOW(3), NOW(3));

INSERT IGNORE INTO `User`
(`id`, `name`, `email`, `passwordHash`, `role`, `subbagId`, `isActive`, `createdAt`, `updatedAt`)
VALUES
(REPLACE(UUID(), '-', ''), 'User Subbag A', 'a@local', @USER_PASS_HASH, 'USER', @SB_KUL, TRUE, NOW(3), NOW(3)),
(REPLACE(UUID(), '-', ''), 'User Subbag B', 'b@local', @USER_PASS_HASH, 'USER', @SB_TEKHUM, TRUE, NOW(3), NOW(3)),
(REPLACE(UUID(), '-', ''), 'User Subbag C', 'c@local', @USER_PASS_HASH, 'USER', @SB_RENDATIN, TRUE, NOW(3), NOW(3)),
(REPLACE(UUID(), '-', ''), 'User Subbag D', 'd@local', @USER_PASS_HASH, 'USER', @SB_SDMPARMAS, TRUE, NOW(3), NOW(3));

-- Default pagu per subbag per akun (tahun berjalan)
SET @TAHUN = YEAR(CURDATE());

-- helper: insert jika belum ada (tahun + subbag + akun)
INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_KUL, @AKUN_BARANG, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_KUL AND `budgetAccountId` = @AKUN_BARANG
  LIMIT 1
);
INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_KUL, @AKUN_JASA, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_KUL AND `budgetAccountId` = @AKUN_JASA
  LIMIT 1
);

INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_TEKHUM, @AKUN_BARANG, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_TEKHUM AND `budgetAccountId` = @AKUN_BARANG
  LIMIT 1
);
INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_TEKHUM, @AKUN_JASA, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_TEKHUM AND `budgetAccountId` = @AKUN_JASA
  LIMIT 1
);

INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_RENDATIN, @AKUN_BARANG, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_RENDATIN AND `budgetAccountId` = @AKUN_BARANG
  LIMIT 1
);
INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_RENDATIN, @AKUN_JASA, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_RENDATIN AND `budgetAccountId` = @AKUN_JASA
  LIMIT 1
);

INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_SDMPARMAS, @AKUN_BARANG, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_SDMPARMAS AND `budgetAccountId` = @AKUN_BARANG
  LIMIT 1
);
INSERT INTO `BudgetAllocation`
(`id`, `tahun`, `subbagId`, `budgetAccountId`, `pagu`, `updatedBy`, `updatedAt`, `createdAt`)
SELECT REPLACE(UUID(), '-', ''), @TAHUN, @SB_SDMPARMAS, @AKUN_JASA, 100000000, 'seed', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `BudgetAllocation`
  WHERE `tahun` = @TAHUN AND `subbagId` = @SB_SDMPARMAS AND `budgetAccountId` = @AKUN_JASA
  LIMIT 1
);
