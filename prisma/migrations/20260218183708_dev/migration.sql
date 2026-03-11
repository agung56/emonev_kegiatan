/*
  Warnings:

  - Added the required column `kepemilikan` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Activity` ADD COLUMN `kepemilikan` VARCHAR(191) NOT NULL;
