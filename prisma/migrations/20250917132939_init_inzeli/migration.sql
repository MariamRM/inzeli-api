-- CreateEnum
CREATE TYPE "public"."Outcome" AS ENUM ('WIN', 'LOSS');

-- DropForeignKey
ALTER TABLE "public"."RoomPlayer" DROP CONSTRAINT "RoomPlayer_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "creditPoints" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "permanentScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."Sponsor" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."UserSponsor" (
    "userId" TEXT NOT NULL,
    "sponsorCode" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSponsor_pkey" PRIMARY KEY ("userId","sponsorCode")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchParticipant" (
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" "public"."Outcome" NOT NULL,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("matchId","userId")
);

-- CreateTable
CREATE TABLE "public"."TimelineEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "roomCode" TEXT,
    "gameId" TEXT,
    "kind" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."RoomPlayer" ADD CONSTRAINT "RoomPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSponsor" ADD CONSTRAINT "UserSponsor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSponsor" ADD CONSTRAINT "UserSponsor_sponsorCode_fkey" FOREIGN KEY ("sponsorCode") REFERENCES "public"."Sponsor"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_roomCode_fkey" FOREIGN KEY ("roomCode") REFERENCES "public"."Room"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimelineEvent" ADD CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimelineEvent" ADD CONSTRAINT "TimelineEvent_roomCode_fkey" FOREIGN KEY ("roomCode") REFERENCES "public"."Room"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimelineEvent" ADD CONSTRAINT "TimelineEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
