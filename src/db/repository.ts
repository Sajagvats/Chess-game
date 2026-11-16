import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  leagueEntries,
  matchHistory,
  moradabadInstitutions,
  users,
  walletTransactions,
} from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const cleanName = (displayName || email.split('@')[0] || 'Challenger').trim().slice(0, 24);
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: cleanName || 'Challenger',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Unable to load user profile.', { cause: error });
  }
}

export async function getUserAccountSnapshot(uid: string) {
  try {
    const [userRow] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRow) return null;

    const txRows = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userUid, uid))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(60);

    const historyRows = await db
      .select()
      .from(matchHistory)
      .where(eq(matchHistory.userUid, uid))
      .orderBy(desc(matchHistory.playedAt))
      .limit(40);

    return {
      user: userRow,
      transactions: txRows.map((t) => ({
        id: t.referenceId,
        type: t.type as 'deposit' | 'withdraw' | 'entry_fee' | 'prize',
        method: t.method,
        referenceId: t.referenceId,
        amount: t.amount,
        timestampIso: t.createdAt.toISOString(),
        note: t.note,
      })),
      history: historyRows,
    };
  } catch (error) {
    console.error('Database error in getUserAccountSnapshot:', error);
    throw new Error('Unable to load account history.', { cause: error });
  }
}

export async function updateUserProfileStats(
  uid: string,
  payload: {
    displayName?: string;
    elo?: number;
    peakElo?: number;
    wins?: number;
    losses?: number;
    draws?: number;
    streak?: number;
    trophies?: number;
  }
) {
  try {
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof payload.displayName === 'string' && payload.displayName.trim()) {
      updateSet.displayName = payload.displayName.trim().slice(0, 24);
    }
    if (typeof payload.elo === 'number' && Number.isFinite(payload.elo)) {
      updateSet.elo = Math.max(400, Math.round(payload.elo));
    }
    if (typeof payload.peakElo === 'number' && Number.isFinite(payload.peakElo)) {
      updateSet.peakElo = Math.max(400, Math.round(payload.peakElo));
    }
    if (typeof payload.wins === 'number' && Number.isFinite(payload.wins)) {
      updateSet.wins = Math.max(0, Math.round(payload.wins));
    }
    if (typeof payload.losses === 'number' && Number.isFinite(payload.losses)) {
      updateSet.losses = Math.max(0, Math.round(payload.losses));
    }
    if (typeof payload.draws === 'number' && Number.isFinite(payload.draws)) {
      updateSet.draws = Math.max(0, Math.round(payload.draws));
    }
    if (typeof payload.streak === 'number' && Number.isFinite(payload.streak)) {
      updateSet.streak = Math.max(0, Math.round(payload.streak));
    }
    if (typeof payload.trophies === 'number' && Number.isFinite(payload.trophies)) {
      updateSet.trophies = Math.max(0, Math.round(payload.trophies));
    }

    const updated = await db
      .update(users)
      .set(updateSet)
      .where(eq(users.uid, uid))
      .returning();

    return updated[0] ?? null;
  } catch (error) {
    console.error('Database error in updateUserProfileStats:', error);
    throw new Error('Unable to update player statistics.', { cause: error });
  }
}

export async function executeWalletMutation(params: {
  uid: string;
  email: string;
  displayName?: string;
  type: 'deposit' | 'withdraw' | 'entry_fee' | 'prize';
  amount: number;
  method: string;
  referenceId: string;
  note: string;
  idempotencyKey?: string;
}) {
  try {
    await getOrCreateUser(params.uid, params.email, params.displayName);

    return await db.transaction(async (tx) => {
      if (params.idempotencyKey) {
        const [existingTx] = await tx
          .select()
          .from(walletTransactions)
          .where(eq(walletTransactions.idempotencyKey, params.idempotencyKey))
          .limit(1);

        if (existingTx) {
          const [currentUser] = await tx
            .select()
            .from(users)
            .where(eq(users.uid, params.uid))
            .limit(1);

          return {
            ok: true as const,
            deduped: true,
            balance: currentUser?.walletBalance ?? 0,
            transaction: {
              id: existingTx.referenceId,
              type: existingTx.type as 'deposit' | 'withdraw' | 'entry_fee' | 'prize',
              method: existingTx.method,
              referenceId: existingTx.referenceId,
              amount: existingTx.amount,
              timestampIso: existingTx.createdAt.toISOString(),
              note: existingTx.note,
            },
          };
        }
      }

      const isDebit = params.type === 'withdraw' || params.type === 'entry_fee';
      let nextBalance = 0;

      if (isDebit) {
        const updated = await tx
          .update(users)
          .set({
            walletBalance: sql`${users.walletBalance} - ${params.amount}`,
            updatedAt: new Date(),
          })
          .where(and(eq(users.uid, params.uid), gte(users.walletBalance, params.amount)))
          .returning();

        if (!updated.length) {
          const [currentUser] = await tx
            .select()
            .from(users)
            .where(eq(users.uid, params.uid))
            .limit(1);
          return {
            ok: false as const,
            status: 400,
            error: `Insufficient balance (Available: ₹${(currentUser?.walletBalance ?? 0).toLocaleString('en-IN')}).`,
          };
        }
        nextBalance = updated[0].walletBalance;
      } else {
        const updated = await tx
          .update(users)
          .set({
            walletBalance: sql`${users.walletBalance} + ${params.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, params.uid))
          .returning();

        nextBalance = updated[0]?.walletBalance ?? 0;
      }

      const [insertedTx] = await tx
        .insert(walletTransactions)
        .values({
          referenceId: params.referenceId,
          idempotencyKey: params.idempotencyKey || null,
          userUid: params.uid,
          type: params.type,
          method: params.method,
          amount: params.amount,
          note: params.note,
        })
        .returning();

      return {
        ok: true as const,
        deduped: false,
        balance: nextBalance,
        transaction: {
          id: insertedTx.referenceId,
          type: insertedTx.type as 'deposit' | 'withdraw' | 'entry_fee' | 'prize',
          method: insertedTx.method,
          referenceId: insertedTx.referenceId,
          amount: insertedTx.amount,
          timestampIso: insertedTx.createdAt.toISOString(),
          note: insertedTx.note,
        },
      };
    });
  } catch (error) {
    console.error('Database error in executeWalletMutation:', error);
    throw new Error('Wallet transaction could not be completed.', { cause: error });
  }
}

export async function listMoradabadInstitutionsFromDb() {
  try {
    return await db
      .select()
      .from(moradabadInstitutions)
      .orderBy(desc(moradabadInstitutions.registeredAt));
  } catch (error) {
    console.error('Database error in listMoradabadInstitutionsFromDb:', error);
    throw new Error('Unable to fetch Moradabad institutions.', { cause: error });
  }
}

export async function insertMoradabadInstitutionToDb(inst: {
  id: string;
  passCode: string;
  division: 'school' | 'college' | 'company';
  name: string;
  city: string;
  coordinatorName: string;
  feePaid: number;
  paymentMethod: string;
  studentSeats: number;
  ownerUid?: string | null;
}) {
  try {
    const [row] = await db
      .insert(moradabadInstitutions)
      .values({
        id: inst.id,
        passCode: inst.passCode,
        division: inst.division,
        name: inst.name,
        city: inst.city,
        coordinatorName: inst.coordinatorName,
        feePaid: inst.feePaid,
        paymentMethod: inst.paymentMethod,
        studentSeats: inst.studentSeats,
        ownerUid: inst.ownerUid ?? null,
      })
      .returning();
    return row;
  } catch (error) {
    console.error('Database error in insertMoradabadInstitutionToDb:', error);
    throw new Error('Unable to register institution in database.', { cause: error });
  }
}

export async function upsertLeagueEntryToDb(entry: {
  leagueKind: string;
  playerId: string;
  userUid?: string | null;
  playerName: string;
  elo: number;
  tierId?: string;
  entryFeePaid?: number;
  institutionId?: string | null;
  institutionName?: string | null;
}) {
  try {
    const [row] = await db
      .insert(leagueEntries)
      .values({
        leagueKind: entry.leagueKind,
        playerId: entry.playerId,
        userUid: entry.userUid ?? null,
        playerName: entry.playerName,
        elo: entry.elo,
        tierId: entry.tierId ?? 'normal',
        entryFeePaid: entry.entryFeePaid ?? 0,
        institutionId: entry.institutionId ?? null,
        institutionName: entry.institutionName ?? null,
      })
      .onConflictDoUpdate({
        target: [leagueEntries.leagueKind, leagueEntries.playerId],
        set: {
          playerName: entry.playerName,
          elo: entry.elo,
          institutionId: entry.institutionId ?? null,
          institutionName: entry.institutionName ?? null,
        },
      })
      .returning();
    return row;
  } catch (error) {
    console.error('Database error in upsertLeagueEntryToDb:', error);
    throw new Error('Unable to save league entry.', { cause: error });
  }
}

export async function updateLeagueStandingInDb(params: {
  leagueKind: string;
  playerId: string;
  winInc: number;
  drawInc: number;
  lossInc: number;
  pointsInc: number;
}) {
  try {
    await db
      .update(leagueEntries)
      .set({
        wins: sql`${leagueEntries.wins} + ${params.winInc}`,
        draws: sql`${leagueEntries.draws} + ${params.drawInc}`,
        losses: sql`${leagueEntries.losses} + ${params.lossInc}`,
        points: sql`${leagueEntries.points} + ${params.pointsInc}`,
        matchesPlayed: sql`${leagueEntries.matchesPlayed} + 1`,
      })
      .where(
        and(
          eq(leagueEntries.leagueKind, params.leagueKind),
          eq(leagueEntries.playerId, params.playerId)
        )
      );
  } catch (error) {
    console.error('Database error in updateLeagueStandingInDb:', error);
    throw new Error('Unable to update league standings.', { cause: error });
  }
}

export async function listLeagueEntriesFromDb(leagueKind?: string) {
  try {
    if (leagueKind) {
      return await db
        .select()
        .from(leagueEntries)
        .where(eq(leagueEntries.leagueKind, leagueKind))
        .orderBy(desc(leagueEntries.points), desc(leagueEntries.wins), desc(leagueEntries.elo));
    }
    return await db
      .select()
      .from(leagueEntries)
      .orderBy(desc(leagueEntries.points), desc(leagueEntries.wins), desc(leagueEntries.elo));
  } catch (error) {
    console.error('Database error in listLeagueEntriesFromDb:', error);
    throw new Error('Unable to fetch league standings.', { cause: error });
  }
}

export async function recordMatchHistoryToDb(match: {
  matchUid: string;
  userUid?: string | null;
  leagueKind: string;
  whiteName: string;
  blackName: string;
  whiteInstitution?: string | null;
  blackInstitution?: string | null;
  winner: 'w' | 'b' | 'draw';
  reason: string;
  opening?: string;
  movesCount?: number;
  eloDelta?: number;
}) {
  try {
    const [row] = await db
      .insert(matchHistory)
      .values({
        matchUid: match.matchUid,
        userUid: match.userUid ?? null,
        leagueKind: match.leagueKind,
        whiteName: match.whiteName,
        blackName: match.blackName,
        whiteInstitution: match.whiteInstitution ?? null,
        blackInstitution: match.blackInstitution ?? null,
        winner: match.winner,
        reason: match.reason,
        opening: match.opening ?? 'Standard Opening',
        movesCount: match.movesCount ?? 0,
        eloDelta: match.eloDelta ?? 0,
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  } catch (error) {
    console.error('Database error in recordMatchHistoryToDb:', error);
    throw new Error('Unable to save match result.', { cause: error });
  }
}

export async function listRecentMatchesFromDb(leagueKind?: string) {
  try {
    if (leagueKind) {
      return await db
        .select()
        .from(matchHistory)
        .where(eq(matchHistory.leagueKind, leagueKind))
        .orderBy(desc(matchHistory.playedAt))
        .limit(20);
    }
    return await db
      .select()
      .from(matchHistory)
      .orderBy(desc(matchHistory.playedAt))
      .limit(40);
  } catch (error) {
    console.error('Database error in listRecentMatchesFromDb:', error);
    throw new Error('Unable to load recent matches.', { cause: error });
  }
}
