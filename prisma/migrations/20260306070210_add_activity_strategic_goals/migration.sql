-- DropIndex
DROP INDEX `PerformanceIndicator_tahun_kepemilikan_strategicGoalId_nama_key` ON `performanceindicator`;

-- DropIndex
DROP INDEX `StrategicGoal_tahun_kepemilikan_nama_key` ON `strategicgoal`;

-- AlterTable
ALTER TABLE `activity` ALTER COLUMN `realisasiAnggaran` DROP DEFAULT;

-- CreateTable
CREATE TABLE `ActivityStrategicGoal` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,

    INDEX `ActivityStrategicGoal_activityId_idx`(`activityId`),
    INDEX `ActivityStrategicGoal_goalId_idx`(`goalId`),
    UNIQUE INDEX `ActivityStrategicGoal_activityId_goalId_key`(`activityId`, `goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ActivityStrategicGoal` ADD CONSTRAINT `ActivityStrategicGoal_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityStrategicGoal` ADD CONSTRAINT `ActivityStrategicGoal_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `StrategicGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
