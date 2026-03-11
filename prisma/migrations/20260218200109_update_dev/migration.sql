/*
  Warnings:

  - A unique constraint covering the columns `[tahun,kepemilikan,strategicGoalId,nama]` on the table `PerformanceIndicator` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tahun,kepemilikan,nama]` on the table `StrategicGoal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Activity` MODIFY `realisasiAnggaran` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `PerformanceIndicator_tahun_kepemilikan_strategicGoalId_nama_key` ON `PerformanceIndicator`(`tahun`, `kepemilikan`, `strategicGoalId`, `nama`);

-- CreateIndex
CREATE UNIQUE INDEX `StrategicGoal_tahun_kepemilikan_nama_key` ON `StrategicGoal`(`tahun`, `kepemilikan`, `nama`);
