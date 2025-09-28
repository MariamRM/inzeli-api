-- CreateEnum
CREATE TYPE "public"."TeamSide" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "public"."RoomPlayer" ADD COLUMN     "isLeader" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "team" "public"."TeamSide" DEFAULT 'A';
