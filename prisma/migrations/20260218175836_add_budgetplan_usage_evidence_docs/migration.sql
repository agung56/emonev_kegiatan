-- AlterTable
ALTER TABLE `Activity` ADD COLUMN `budgetPlanId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ActivityBudgetPlanUsage` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `budgetPlanDetailId` VARCHAR(191) NOT NULL,
    `amountUsed` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActivityBudgetPlanUsage_activityId_idx`(`activityId`),
    INDEX `ActivityBudgetPlanUsage_budgetPlanDetailId_idx`(`budgetPlanDetailId`),
    UNIQUE INDEX `ActivityBudgetPlanUsage_activityId_budgetPlanDetailId_key`(`activityId`, `budgetPlanDetailId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityBudgetEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `usageId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityBudgetEvidence_activityId_idx`(`activityId`),
    INDEX `ActivityBudgetEvidence_usageId_idx`(`usageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityDocumentation` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityDocumentation_activityId_idx`(`activityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_budgetPlanId_fkey` FOREIGN KEY (`budgetPlanId`) REFERENCES `BudgetPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityBudgetPlanUsage` ADD CONSTRAINT `ActivityBudgetPlanUsage_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityBudgetPlanUsage` ADD CONSTRAINT `ActivityBudgetPlanUsage_budgetPlanDetailId_fkey` FOREIGN KEY (`budgetPlanDetailId`) REFERENCES `BudgetPlanDetail`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityBudgetEvidence` ADD CONSTRAINT `ActivityBudgetEvidence_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityBudgetEvidence` ADD CONSTRAINT `ActivityBudgetEvidence_usageId_fkey` FOREIGN KEY (`usageId`) REFERENCES `ActivityBudgetPlanUsage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityDocumentation` ADD CONSTRAINT `ActivityDocumentation_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
