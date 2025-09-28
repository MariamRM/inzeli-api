-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "allowZeroCredit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "targetWinPoints" INTEGER;

-- CreateTable
CREATE TABLE "public"."RoomStake" (
    "roomCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomStake_pkey" PRIMARY KEY ("roomCode","userId")
);

-- AddForeignKey
ALTER TABLE "public"."RoomStake" ADD CONSTRAINT "RoomStake_roomCode_fkey" FOREIGN KEY ("roomCode") REFERENCES "public"."Room"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomStake" ADD CONSTRAINT "RoomStake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
