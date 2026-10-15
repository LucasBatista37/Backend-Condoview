"use strict";

/**
 * Datas de reservas e convites são tratadas no fuso do condomínio
 * (padrão America/Sao_Paulo) para evitar deslocamentos de UTC.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDateString(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isValidTimeString(value) {
  return typeof value === "string" && TIME_RE.test(value);
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Data e hora "de parede" atuais no fuso informado. */
function nowInZone(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Diferença (ms) entre o horário de parede no fuso e UTC para um instante. */
function zoneOffsetMs(timeZone, instant) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

/** Converte data/hora locais do condomínio para um instante absoluto (Date). */
function zonedToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = zoneOffsetMs(timeZone, guess);
  const result = new Date(guess.getTime() - offset);
  // Ajuste para transições de horário de verão.
  const offset2 = zoneOffsetMs(timeZone, result);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2);
}

function overlaps(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}

module.exports = {
  isValidDateString,
  isValidTimeString,
  toMinutes,
  nowInZone,
  zonedToUtc,
  overlaps,
};
