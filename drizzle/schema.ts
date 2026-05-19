import {
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const weekendStatusEnum = pgEnum("weekend_status", ["active", "completed"]);
export const scheduleEntryKindEnum = pgEnum("schedule_entry_kind", ["round", "dinner"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  handicap: real("handicap").notNull().default(0),
  role: userRoleEnum("role").notNull().default("member"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weekends = pgTable("weekends", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  status: weekendStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey(),
  weekendId: uuid("weekend_id")
    .notNull()
    .references(() => weekends.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  players: jsonb("players").$type<string[]>().notNull().default([]),
});

export const golfCourses = pgTable("golf_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  holePars: jsonb("hole_pars").$type<number[]>().notNull(),
  strokeIndexes: jsonb("stroke_indexes").$type<number[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scheduleEntries = pgTable("schedule_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekendId: uuid("weekend_id")
    .notNull()
    .references(() => weekends.id, { onDelete: "cascade" }),
  kind: scheduleEntryKindEnum("kind").notNull().default("round"),
  title: text("title").notNull(),
  course: text("course").notNull(),
  courseId: uuid("course_id").references(() => golfCourses.id, { onDelete: "set null" }),
  date: date("date", { mode: "string" }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scorecards = pgTable("scorecards", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekendId: uuid("weekend_id")
    .notNull()
    .references(() => weekends.id, { onDelete: "cascade" }),
  scheduleEntryId: uuid("schedule_entry_id").references(() => scheduleEntries.id, {
    onDelete: "set null",
  }),
  courseId: uuid("course_id").references(() => golfCourses.id, { onDelete: "set null" }),
  course: text("course").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  players: jsonb("players")
    .$type<{ playerName: string; holes: number[] }[]>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
