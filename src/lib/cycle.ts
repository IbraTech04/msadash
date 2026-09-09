import { parseLocalDate } from '@/lib/dates';
import { addDays, differenceInCalendarDays } from 'date-fns';
import type { CycleInfo, DevelopmentCycle } from '@/types';

// Ported from legacy/js/cycle-view.js.
// The marketing team runs fixed 14-day (2-week) development cycles, anchored to
// a known cycle-zero start date. Content produced during a development cycle is
// posted during the following 14-day window.
// TODO confirm cycle math with the backend (/api/workload/cycle-info is the
// source of truth when available; this is the local fallback).
const CYCLE_START_DATE = '2026-09-14'; // Collection runs the fortnight before, Aug 31 - Sep 13
export const CYCLE_LENGTH_DAYS = 14;

export interface CycleWindow {
  cycleNumber: number;
  /** yyyy-MM-dd */
  developmentStart: string;
  /** yyyy-MM-dd */
  developmentEnd: string;
}

export interface CycleWindows {
  current: CycleWindow & {
    totalDays: number;
    daysElapsed: number;
    daysRemaining: number;
    /** 0–100 percentage of the current cycle elapsed. */
    progress: number;
  };
  next: CycleWindow & {
    daysUntilStart: number;
    /** Posting window for content produced in the next cycle. */
    postingStart: string;
    postingEnd: string;
    daysUntilPosting: number;
  };
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Which fixed 14-day cycle a date falls in (0-indexed from CYCLE_START_DATE). */
export function cycleNumberForDate(date: Date): number {
  const start = parseLocalDate(CYCLE_START_DATE) ?? new Date(CYCLE_START_DATE);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor(differenceInCalendarDays(d, start) / CYCLE_LENGTH_DAYS);
}

/** Start/end dates (inclusive) of a given 0-indexed cycle number. */
export function cycleDateRange(cycleNumber: number): { start: Date; end: Date } {
  const start = parseLocalDate(CYCLE_START_DATE) ?? new Date(CYCLE_START_DATE);
  start.setHours(0, 0, 0, 0);
  const rangeStart = addDays(start, cycleNumber * CYCLE_LENGTH_DAYS);
  const rangeEnd = addDays(rangeStart, CYCLE_LENGTH_DAYS - 1);
  return { start: rangeStart, end: rangeEnd };
}

/** Compute the current development cycle purely from the calendar (local fallback). */
export function computeLocalCurrentCycle(reference: Date = new Date()): DevelopmentCycle {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);

  const start = parseLocalDate(CYCLE_START_DATE) ?? new Date(CYCLE_START_DATE);
  start.setHours(0, 0, 0, 0);

  const daysSinceStart = differenceInCalendarDays(today, start);
  const cycleIndex = Math.floor(daysSinceStart / CYCLE_LENGTH_DAYS);

  const currentStart = addDays(start, cycleIndex * CYCLE_LENGTH_DAYS);
  const currentEnd = addDays(currentStart, CYCLE_LENGTH_DAYS - 1);

  return {
    cycleNumber: cycleIndex + 1, // 1-indexed for display
    developmentStart: toYMD(currentStart),
    developmentEnd: toYMD(currentEnd),
  };
}

/**
 * Build the current + next cycle windows. Prefers backend `cycle-info` when
 * provided; otherwise falls back to the local calendar calculation.
 */
export function computeCycleWindows(
  info?: CycleInfo | null,
  reference: Date = new Date(),
): CycleWindows {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);

  const current = info?.currentDevelopmentCycle ?? computeLocalCurrentCycle(today);

  const curStart = parseLocalDate(current.developmentStart) ?? today;
  const curEnd = parseLocalDate(current.developmentEnd) ?? addDays(curStart, CYCLE_LENGTH_DAYS - 1);

  const totalDays = differenceInCalendarDays(curEnd, curStart) + 1;
  const daysElapsed = Math.max(0, differenceInCalendarDays(today, curStart));
  const daysRemaining = Math.max(0, differenceInCalendarDays(curEnd, today));
  const progress = totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0;

  // Next cycle: from backend if present, else immediately after current.
  let nextStart: Date;
  let nextEnd: Date;
  let nextNumber: number;

  if (info?.nextDevelopmentCycle) {
    nextStart = parseLocalDate(info.nextDevelopmentCycle.developmentStart) ?? addDays(curEnd, 1);
    nextEnd =
      parseLocalDate(info.nextDevelopmentCycle.developmentEnd) ??
      addDays(nextStart, CYCLE_LENGTH_DAYS - 1);
    nextNumber = info.nextDevelopmentCycle.cycleNumber;
  } else {
    nextStart = addDays(curEnd, 1);
    nextEnd = addDays(nextStart, CYCLE_LENGTH_DAYS - 1);
    nextNumber = current.cycleNumber + 1;
  }

  // Posting window starts the day after the next development cycle ends.
  const postingStart = addDays(nextEnd, 1);
  const postingEnd = addDays(postingStart, CYCLE_LENGTH_DAYS - 1);

  return {
    current: {
      ...current,
      totalDays,
      daysElapsed,
      daysRemaining,
      progress,
    },
    next: {
      cycleNumber: nextNumber,
      developmentStart: toYMD(nextStart),
      developmentEnd: toYMD(nextEnd),
      daysUntilStart: differenceInCalendarDays(nextStart, today),
      postingStart: toYMD(postingStart),
      postingEnd: toYMD(postingEnd),
      daysUntilPosting: differenceInCalendarDays(postingStart, today),
    },
  };
}
