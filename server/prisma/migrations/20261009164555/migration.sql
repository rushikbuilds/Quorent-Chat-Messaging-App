/*
  Warnings:

  - You are about to drop the `aisession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subtask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tasktag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `aisession` DROP FOREIGN KEY `AISession_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `notification` DROP FOREIGN KEY `Notification_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `subtask` DROP FOREIGN KEY `Subtask_task_id_fkey`;

-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `Task_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `tasktag` DROP FOREIGN KEY `TaskTag_task_id_fkey`;

-- DropTable
DROP TABLE `aisession`;

-- DropTable
DROP TABLE `notification`;

-- DropTable
DROP TABLE `subtask`;

-- DropTable
DROP TABLE `task`;

-- DropTable
DROP TABLE `tasktag`;
