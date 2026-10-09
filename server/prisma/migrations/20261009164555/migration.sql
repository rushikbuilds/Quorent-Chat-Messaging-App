/*
  Warnings:
  - Dropping tables safely ignoring case mismatch and foreign key constraints
*/
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `AISession`;
DROP TABLE IF EXISTS `aisession`;

DROP TABLE IF EXISTS `Notification`;
DROP TABLE IF EXISTS `notification`;

DROP TABLE IF EXISTS `Subtask`;
DROP TABLE IF EXISTS `subtask`;

DROP TABLE IF EXISTS `Task`;
DROP TABLE IF EXISTS `task`;

DROP TABLE IF EXISTS `TaskTag`;
DROP TABLE IF EXISTS `tasktag`;

SET FOREIGN_KEY_CHECKS=1;
