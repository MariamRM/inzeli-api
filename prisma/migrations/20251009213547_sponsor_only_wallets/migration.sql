-- AlterTable
ALTER TABLE "public"."Match" ADD COLUMN     "sponsorCode" TEXT;

-- CreateTable
CREATE TABLE "public"."SponsorGame" (
    "sponsorCode" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "prizeAmount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SponsorGame_pkey" PRIMARY KEY ("sponsorCode","gameId")
);

-- CreateTable
CREATE TABLE "public"."SponsorGameWallet" (
    "userId" TEXT NOT NULL,
    "sponsorCode" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "pearls" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorGameWallet_pkey" PRIMARY KEY ("userId","sponsorCode","gameId")
);

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_sponsorCode_fkey" FOREIGN KEY ("sponsorCode") REFERENCES "public"."Sponsor"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorGame" ADD CONSTRAINT "SponsorGame_sponsorCode_fkey" FOREIGN KEY ("sponsorCode") REFERENCES "public"."Sponsor"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorGame" ADD CONSTRAINT "SponsorGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorGameWallet" ADD CONSTRAINT "SponsorGameWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorGameWallet" ADD CONSTRAINT "SponsorGameWallet_sponsorCode_fkey" FOREIGN KEY ("sponsorCode") REFERENCES "public"."Sponsor"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorGameWallet" ADD CONSTRAINT "SponsorGameWallet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
