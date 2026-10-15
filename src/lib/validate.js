"use strict";

/**
 * Validação explícita de entrada. Cada rota declara exatamente quais campos aceita;
 * campos extras (ex.: role, condominium, status, userId) são ignorados, o que
 * impede atribuição em massa (mass assignment).
 */

const mongoose = require("mongoose");
const { unprocessable } = require("./errors");
const { isValidDateString, isValidTimeString } = require("./time");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const rules = {
  string: ({ min = 0, max = 255, required = true, label, trim = true } = {}) => ({
    required,
    label,
    check(value) {
      if (typeof value !== "string") return { error: `${label} inválido.` };
      const v = trim ? value.trim() : value;
      if (required && v.length === 0) return { error: `${label} é obrigatório.` };
      if (v.length < min) return { error: `${label} deve ter pelo menos ${min} caracteres.` };
      if (v.length > max) return { error: `${label} deve ter no máximo ${max} caracteres.` };
      return { value: v };
    },
  }),
  email: ({ required = true, label = "E-mail" } = {}) => ({
    required,
    label,
    check(value) {
      if (typeof value !== "string") return { error: "Informe um e-mail válido." };
      const v = value.trim().toLowerCase();
      if (!EMAIL_RE.test(v) || v.length > 160) return { error: "Informe um e-mail válido." };
      return { value: v };
    },
  }),
  password: ({ required = true, label = "Senha" } = {}) => ({
    required,
    label,
    check(value) {
      if (typeof value !== "string" || value.length < 8)
        return { error: "A senha deve ter pelo menos 8 caracteres." };
      if (value.length > 128) return { error: "A senha deve ter no máximo 128 caracteres." };
      if (!/[A-Za-z]/.test(value) || !/\d/.test(value))
        return { error: "A senha deve conter letras e números." };
      return { value };
    },
  }),
  oneOf: (values, { required = true, label } = {}) => ({
    required,
    label,
    check(value) {
      if (!values.includes(value)) return { error: `${label} inválido.` };
      return { value };
    },
  }),
  date: ({ required = true, label = "Data" } = {}) => ({
    required,
    label,
    check(value) {
      if (!isValidDateString(value)) return { error: `${label} inválida (use AAAA-MM-DD).` };
      return { value };
    },
  }),
  time: ({ required = true, label = "Horário" } = {}) => ({
    required,
    label,
    check(value) {
      if (!isValidTimeString(value)) return { error: `${label} inválido (use HH:mm).` };
      return { value };
    },
  }),
  isoDateTime: ({ required = true, label = "Data e hora" } = {}) => ({
    required,
    label,
    check(value) {
      const d = typeof value === "string" ? new Date(value) : null;
      if (!d || Number.isNaN(d.getTime())) return { error: `${label} inválida.` };
      return { value: d };
    },
  }),
  objectId: ({ required = true, label = "Identificador" } = {}) => ({
    required,
    label,
    check(value) {
      if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value))
        return { error: `${label} inválido.` };
      return { value };
    },
  }),
  int: ({ min, max, required = true, label } = {}) => ({
    required,
    label,
    check(value) {
      const n = typeof value === "string" ? Number(value) : value;
      if (!Number.isInteger(n) || (min !== undefined && n < min) || (max !== undefined && n > max))
        return { error: `${label} inválido.` };
      return { value: n };
    },
  }),
  bool: ({ required = true, label } = {}) => ({
    required,
    label,
    check(value) {
      if (value === true || value === "true") return { value: true };
      if (value === false || value === "false") return { value: false };
      return { error: `${label} inválido.` };
    },
  }),
};

/** Valida `source` segundo `schema` e devolve somente os campos declarados. */
function validate(source, schema) {
  const out = {};
  const errors = [];
  const input = source && typeof source === "object" ? source : {};
  for (const [field, rule] of Object.entries(schema)) {
    const raw = input[field];
    const missing = raw === undefined || raw === null || raw === "";
    if (missing) {
      if (rule.required) errors.push(`${rule.label || field} é obrigatório.`);
      continue;
    }
    const { value, error } = rule.check(raw);
    if (error) errors.push(error);
    else out[field] = value;
  }
  if (errors.length) throw unprocessable(errors[0], { details: errors });
  return out;
}

function assertObjectId(id, label = "Identificador") {
  if (!mongoose.Types.ObjectId.isValid(id)) throw unprocessable(`${label} inválido.`);
  return id;
}

module.exports = { rules, validate, assertObjectId };
