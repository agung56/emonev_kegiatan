-- CreateTable
CREATE TABLE `Subbag` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Subbag_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `subbagId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetAccount` (
    `id` VARCHAR(191) NOT NULL,
    `kodeAkun` VARCHAR(191) NOT NULL,
    `namaAkun` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `BudgetAccount_kodeAkun_namaAkun_key`(`kodeAkun`, `namaAkun`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `subbagId` VARCHAR(191) NULL,
    `budgetAccountId` VARCHAR(191) NOT NULL,
    `pagu` INTEGER NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BudgetAllocation_tahun_subbagId_budgetAccountId_idx`(`tahun`, `subbagId`, `budgetAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategicGoal` (
    `id` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `kepemilikan` ENUM('LEMBAGA', 'SEKRETARIAT') NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StrategicGoal_tahun_kepemilikan_idx`(`tahun`, `kepemilikan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerformanceIndicator` (
    `id` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `kepemilikan` ENUM('LEMBAGA', 'SEKRETARIAT') NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `formulaPerhitungan` TEXT NULL,
    `sumberData` TEXT NULL,
    `strategicGoalId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PerformanceIndicator_tahun_kepemilikan_idx`(`tahun`, `kepemilikan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Activity` (
    `id` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `subbagId` VARCHAR(191) NOT NULL,
    `namaKegiatan` VARCHAR(191) NOT NULL,
    `lokus` VARCHAR(191) NOT NULL,
    `targetKinerja` VARCHAR(191) NOT NULL,
    `capaianKinerja` VARCHAR(191) NOT NULL,
    `kendala` VARCHAR(191) NOT NULL,
    `outputKegiatan` VARCHAR(191) NOT NULL,
    `budgetAccountId` VARCHAR(191) NULL,
    `realisasiAnggaran` INTEGER NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Activity_tahun_subbagId_idx`(`tahun`, `subbagId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityBudgetUsage` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `budgetAllocationId` VARCHAR(191) NOT NULL,
    `amountUsed` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActivityBudgetUsage_activityId_idx`(`activityId`),
    INDEX `ActivityBudgetUsage_budgetAllocationId_idx`(`budgetAllocationId`),
    UNIQUE INDEX `ActivityBudgetUsage_activityId_budgetAllocationId_key`(`activityId`, `budgetAllocationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityBudgetDetail` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(64) NULL,
    `uraian` TEXT NOT NULL,
    `volume` DECIMAL(18, 2) NOT NULL,
    `hargaSatuan` INTEGER NOT NULL,
    `jumlah` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActivityBudgetDetail_activityId_idx`(`activityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityIndicator` (
    `activityId` VARCHAR(191) NOT NULL,
    `indicatorId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`activityId`, `indicatorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetGlobal` (
    `id` VARCHAR(191) NOT NULL,
    `akun` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `pagu` INTEGER NOT NULL,
    `keterangan` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BudgetGlobal_tahun_idx`(`tahun`),
    UNIQUE INDEX `BudgetGlobal_akun_tahun_key`(`akun`, `tahun`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_subbagId_fkey` FOREIGN KEY (`subbagId`) REFERENCES `Subbag`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAllocation` ADD CONSTRAINT `BudgetAllocation_subbagId_fkey` FOREIGN KEY (`subbagId`) REFERENCES `Subbag`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAllocation` ADD CONSTRAINT `BudgetAllocation_budgetAccountId_fkey` FOREIGN KEY (`budgetAccountId`) REFERENCES `BudgetAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerformanceIndicator` ADD CONSTRAINT `PerformanceIndicator_strategicGoalId_fkey` FOREIGN KEY (`strategicGoalId`) REFERENCES `StrategicGoal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_subbagId_fkey` FOREIGN KEY (`subbagId`) REFERENCES `Subbag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_budgetAccountId_fkey` FOREIGN KEY (`budgetAccountId`) REFERENCES `BudgetAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityBudgetUsage` ADD CONSTRAINT `ActivityBudgetUsage_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityBudgetUsage` ADD CONSTRAINT `ActivityBudgetUsage_budgetAllocationId_fkey` FOREIGN KEY (`budgetAllocationId`) REFERENCES `BudgetAllocation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityBudgetDetail` ADD CONSTRAINT `ActivityBudgetDetail_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityIndicator` ADD CONSTRAINT `ActivityIndicator_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityIndicator` ADD CONSTRAINT `ActivityIndicator_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `PerformanceIndicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityEvidence` ADD CONSTRAINT `ActivityEvidence_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityEvidence` ADD CONSTRAINT `ActivityEvidence_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
