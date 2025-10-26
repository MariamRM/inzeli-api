-- CreateIndex
CREATE INDEX "Game_name_idx" ON "public"."Game"("name");

-- CreateIndex
CREATE INDEX "Game_category_idx" ON "public"."Game"("category");

-- CreateIndex
CREATE INDEX "Match_gameId_createdAt_idx" ON "public"."Match"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "Match_sponsorCode_gameId_createdAt_idx" ON "public"."Match"("sponsorCode", "gameId", "createdAt");

-- CreateIndex
CREATE INDEX "Match_roomCode_createdAt_idx" ON "public"."Match"("roomCode", "createdAt");

-- CreateIndex
CREATE INDEX "Match_createdAt_idx" ON "public"."Match"("createdAt");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_matchId_idx" ON "public"."MatchParticipant"("userId", "matchId");

-- CreateIndex
CREATE INDEX "MatchParticipant_outcome_idx" ON "public"."MatchParticipant"("outcome");

-- CreateIndex
CREATE INDEX "Room_gameId_idx" ON "public"."Room"("gameId");

-- CreateIndex
CREATE INDEX "Room_hostUserId_idx" ON "public"."Room"("hostUserId");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "public"."Room"("status");

-- CreateIndex
CREATE INDEX "Room_createdAt_idx" ON "public"."Room"("createdAt");

-- CreateIndex
CREATE INDEX "Room_startedAt_idx" ON "public"."Room"("startedAt");

-- CreateIndex
CREATE INDEX "RoomPlayer_roomCode_idx" ON "public"."RoomPlayer"("roomCode");

-- CreateIndex
CREATE INDEX "RoomPlayer_userId_idx" ON "public"."RoomPlayer"("userId");

-- CreateIndex
CREATE INDEX "RoomPlayer_roomCode_team_idx" ON "public"."RoomPlayer"("roomCode", "team");

-- CreateIndex
CREATE INDEX "RoomPlayer_roomCode_isLeader_idx" ON "public"."RoomPlayer"("roomCode", "isLeader");

-- CreateIndex
CREATE INDEX "RoomStake_reservedAt_idx" ON "public"."RoomStake"("reservedAt");

-- CreateIndex
CREATE INDEX "Sponsor_active_idx" ON "public"."Sponsor"("active");

-- CreateIndex
CREATE INDEX "Sponsor_name_idx" ON "public"."Sponsor"("name");

-- CreateIndex
CREATE INDEX "SponsorGame_sponsorCode_idx" ON "public"."SponsorGame"("sponsorCode");

-- CreateIndex
CREATE INDEX "SponsorGame_gameId_idx" ON "public"."SponsorGame"("gameId");

-- CreateIndex
CREATE INDEX "SponsorGameWallet_sponsorCode_gameId_pearls_idx" ON "public"."SponsorGameWallet"("sponsorCode", "gameId", "pearls");

-- CreateIndex
CREATE INDEX "SponsorGameWallet_userId_idx" ON "public"."SponsorGameWallet"("userId");

-- CreateIndex
CREATE INDEX "SponsorGameWallet_updatedAt_idx" ON "public"."SponsorGameWallet"("updatedAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_userId_createdAt_idx" ON "public"."TimelineEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_roomCode_createdAt_idx" ON "public"."TimelineEvent"("roomCode", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_gameId_createdAt_idx" ON "public"."TimelineEvent"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_kind_createdAt_idx" ON "public"."TimelineEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_createdAt_idx" ON "public"."TimelineEvent"("createdAt");

-- CreateIndex
CREATE INDEX "User_displayName_idx" ON "public"."User"("displayName");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "UserSponsor_userId_idx" ON "public"."UserSponsor"("userId");

-- CreateIndex
CREATE INDEX "UserSponsor_activatedAt_idx" ON "public"."UserSponsor"("activatedAt");
