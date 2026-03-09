-- CreateTable
CREATE TABLE `BudgetPlan` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `keterangan` TEXT NULL,
    `totalPagu` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetPlanDetail` (
    `id` VARCHAR(191) NOT NULL,
    `budgetPlanId` VARCHAR(191) NOT NULL,
    `akun` VARCHAR(255) NOT NULL,
    `pagu` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BudgetPlanDetail_budgetPlanId_idx`(`budgetPlanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BudgetPlanDetail` ADD CONSTRAINT `BudgetPlanDetail_budgetPlanId_fkey` FOREIGN KEY (`budgetPlanId`) REFERENCES `BudgetPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
