import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Challenger'),
  elo: integer('elo').notNull().default(1200),
  peakElo: integer('peak_elo').notNull().default(1200),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  trophies: integer('trophies').notNull().default(0),
  walletBalance: integer('wallet_balance').notNull().default(500),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const walletTransactions = pgTable('wallet_transactions', {
  id: serial('id').primaryKey(),
  referenceId: text('reference_id').notNull().unique(),
  idempotencyKey: text('idempotency_key').unique(),
  userUid: text('user_uid')
    .references(() => users.uid)
    .notNull(),
  type: text('type').notNull(), // 'deposit' | 'withdraw' | 'entry_fee' | 'prize'
  method: text('method').notNull(),
  amount: integer('amount').notNull(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const moradabadInstitutions = pgTable('moradabad_institutions', {
  id: text('id').primaryKey(),
  passCode: text('pass_code').notNull().unique(),
  division: text('division').notNull(), // 'school' | 'college' | 'company'
  name: text('name').notNull(),
  city: text('city').notNull().default('Moradabad, Uttar Pradesh'),
  coordinatorName: text('coordinator_name').notNull(),
  feePaid: integer('fee_paid').notNull().default(10000),
  paymentMethod: text('payment_method').notNull(),
  studentSeats: integer('student_seats').notNull().default(20),
  ownerUid: text('owner_uid').references(() => users.uid),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
});

export const leagueEntries = pgTable(
  'league_entries',
  {
    id: serial('id').primaryKey(),
    leagueKind: text('league_kind').notNull(), // 'world' | 'moradabad_school' | 'moradabad_college' | 'moradabad_company'
    playerId: text('player_id').notNull(),
    userUid: text('user_uid').references(() => users.uid),
    playerName: text('player_name').notNull(),
    elo: integer('elo').notNull().default(1200),
    tierId: text('tier_id').notNull().default('normal'),
    entryFeePaid: integer('entry_fee_paid').notNull().default(0),
    institutionId: text('institution_id'),
    institutionName: text('institution_name'),
    wins: integer('wins').notNull().default(0),
    draws: integer('draws').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    points: doublePrecision('points').notNull().default(0),
    matchesPlayed: integer('matches_played').notNull().default(0),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('league_kind_player_uidx').on(table.leagueKind, table.playerId)]
);

export const matchHistory = pgTable('match_history', {
  id: serial('id').primaryKey(),
  matchUid: text('match_uid').notNull().unique(),
  userUid: text('user_uid').references(() => users.uid),
  leagueKind: text('league_kind').notNull(),
  whiteName: text('white_name').notNull(),
  blackName: text('black_name').notNull(),
  whiteInstitution: text('white_institution'),
  blackInstitution: text('black_institution'),
  winner: text('winner').notNull(), // 'w' | 'b' | 'draw'
  reason: text('reason').notNull(),
  opening: text('opening').notNull().default('Standard Opening'),
  movesCount: integer('moves_count').notNull().default(0),
  eloDelta: integer('elo_delta').notNull().default(0),
  playedAt: timestamp('played_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  walletTransactions: many(walletTransactions),
  institutions: many(moradabadInstitutions),
  leagueEntries: many(leagueEntries),
  matches: many(matchHistory),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  user: one(users, {
    fields: [walletTransactions.userUid],
    references: [users.uid],
  }),
}));

export const moradabadInstitutionsRelations = relations(moradabadInstitutions, ({ one }) => ({
  owner: one(users, {
    fields: [moradabadInstitutions.ownerUid],
    references: [users.uid],
  }),
}));

export const leagueEntriesRelations = relations(leagueEntries, ({ one }) => ({
  user: one(users, {
    fields: [leagueEntries.userUid],
    references: [users.uid],
  }),
}));

export const matchHistoryRelations = relations(matchHistory, ({ one }) => ({
  user: one(users, {
    fields: [matchHistory.userUid],
    references: [users.uid],
  }),
}));
