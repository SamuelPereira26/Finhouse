import { CATEGORIES, CONFIDENCE_THRESHOLDS, FIXED_SUBSCRIPTION_RULES } from './constants.js';
import type { ClassificationResult, MasterRow, ParsedRow, RulesRow } from './types.js';
import { cleanText, generateUUID } from './utils.js';

function statusFromConfidence(confidence: number): ClassificationResult['review_status'] {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_OK) {
    return 'AUTO_OK';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.SUGERIDO_MIN) {
    return 'SUGERIDO';
  }
  return 'NEEDS_REVIEW';
}

export function loadActiveRules(rules: RulesRow[]): RulesRow[] {
  return rules
    .filter((rule) => rule.active)
    .sort((a, b) => a.priority - b.priority);
}

export function matchRule(rule: RulesRow, tx: ParsedRow): boolean {
  if (rule.source && rule.source !== tx.source) {
    return false;
  }

  if (rule.match_amount_min !== null && Math.abs(tx.amount) < rule.match_amount_min) {
    return false;
  }

  if (rule.match_amount_max !== null && Math.abs(tx.amount) > rule.match_amount_max) {
    return false;
  }

  const text = cleanText(tx.description_raw);
  const sender = cleanText(tx.merchant_or_counterparty ?? '');

  if (rule.match_sender && !sender.includes(cleanText(rule.match_sender))) {
    return false;
  }

  if (!rule.match_text) {
    return true;
  }

  const ruleText = cleanText(rule.match_text);
  const matchType = cleanText(rule.match_type ?? 'INCLUDES');

  if (matchType === 'EXACT') {
    return text === ruleText;
  }

  if (matchType === 'REGEX') {
    try {
      return new RegExp(rule.match_text, 'i').test(tx.description_raw);
    } catch {
      return false;
    }
  }

  return text.includes(ruleText);
}

export function buildClassification(
  tx: ParsedRow,
  patch: Partial<ClassificationResult>
): ClassificationResult {
  const baseConfidence = patch.confidence ?? 0;
  return {
    type: patch.type ?? tx.type,
    macro: patch.macro ?? tx.macro,
    subcat: patch.subcat ?? tx.subcat,
    reimbursement_target_macro: patch.reimbursement_target_macro ?? tx.reimbursement_target_macro,
    income_fixed_or_variable: patch.income_fixed_or_variable ?? tx.income_fixed_or_variable,
    income_detail: patch.income_detail ?? tx.income_detail,
    rule_id: patch.rule_id ?? null,
    confidence: baseConfidence,
    review_status: patch.review_status ?? statusFromConfidence(baseConfidence)
  };
}

export function matchFixedRules(tx: ParsedRow): ClassificationResult | null {
  const text = cleanText(tx.description_raw);
  const txDay = Number(tx.date.slice(8, 10));

  for (const rule of FIXED_SUBSCRIPTION_RULES) {
    if (!text.includes(cleanText(rule.matchText))) {
      continue;
    }
    if (Math.abs(txDay - rule.dayOfMonth) > 5) {
      continue;
    }

    return buildClassification(tx, {
      type: 'EXPENSE',
      macro: rule.macro,
      subcat: rule.subcat,
      rule_id: rule.id,
      confidence: rule.confidence
    });
  }

  return null;
}

export function matchCommonPatterns(tx: ParsedRow): ClassificationResult | null {
  const text = cleanText(tx.description_raw);

  if (text.includes('NOMINA') || text.includes('PAYROLL') || text.includes('SALARIO')) {
    return buildClassification(tx, {
      type: 'INCOME',
      macro: CATEGORIES.INGRESOS.name,
      subcat: 'Nomina',
      confidence: 0.95
    });
  }

  if (
    text.includes('MERCADONA') ||
    text.includes('LIDL') ||
    text.includes('CARREFOUR') ||
    text.includes('ALDI')
  ) {
    return buildClassification(tx, {
      type: 'EXPENSE',
      macro: CATEGORIES.SUPERMERCADO.name,
      subcat: 'Mercadona',
      confidence: 0.9
    });
  }

  if (text.includes('REPSOL') || text.includes('CEPSA') || text.includes('SHELL')) {
    return buildClassification(tx, {
      type: 'EXPENSE',
      macro: CATEGORIES.TRANSPORTE.name,
      subcat: 'Gasolina',
      confidence: 0.9
    });
  }

  if (text.includes('FARMACIA') || text.includes('PHARMACY')) {
    return buildClassification(tx, {
      type: 'EXPENSE',
      macro: CATEGORIES.CUIDADO_SALUD.name,
      subcat: 'Farmacia',
      confidence: 0.9
    });
  }

  if (text.includes('SPOTIFY') || text.includes('NETFLIX')) {
    return buildClassification(tx, {
      type: 'EXPENSE',
      macro: CATEGORIES.SUSCRIPCIONES.name,
      subcat: 'Otros servicios',
      confidence: 0.85
    });
  }

  if (text.includes('DONACION') || text.includes('IGLESIA')) {
    return buildClassification(tx, {
      type: 'EXPENSE',
      macro: CATEGORIES.DONACIONES.name,
      subcat: 'Iglesia',
      confidence: 0.9
    });
  }

  return null;
}

export function classifyTransaction(tx: ParsedRow, rules: RulesRow[]): ClassificationResult {
  if (tx.macro || tx.subcat) {
    return buildClassification(tx, {
      confidence: 1,
      review_status: 'USER_CONFIRMED'
    });
  }

  const fixed = matchFixedRules(tx);
  if (fixed) {
    return fixed;
  }

  for (const rule of loadActiveRules(rules)) {
    if (!matchRule(rule, tx)) {
      continue;
    }
    return buildClassification(tx, {
      type: rule.assign_type ?? tx.type,
      macro: rule.assign_macro,
      subcat: rule.assign_subcat,
      income_fixed_or_variable: rule.assign_income_fixed_or_variable,
      income_detail: rule.assign_income_detail,
      reimbursement_target_macro: rule.assign_reimbursement_target_macro,
      rule_id: rule.rule_id,
      confidence: rule.confidence_default
    });
  }

  const common = matchCommonPatterns(tx);
  if (common) {
    return common;
  }

  return buildClassification(tx, {
    type: tx.type,
    macro: tx.type === 'INCOME' ? CATEGORIES.INGRESOS.name : CATEGORIES.OTROS.name,
    subcat: tx.type === 'INCOME' ? 'Otros ingresos' : 'No clasificado',
    confidence: 0.2
  });
}

export type PatternSuggestion = {
  pattern: string;
  count: number;
  avg_amount: number;
  source: string;
};

export function detectRepeatPatterns(transactions: MasterRow[]): PatternSuggestion[] {
  const counter = new Map<string, { count: number; amount: number; source: string }>();

  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') {
      continue;
    }

    const pattern = cleanText(tx.merchant_or_counterparty ?? tx.description_raw).slice(0, 40);
    if (!pattern) {
      continue;
    }

    const item = counter.get(pattern) ?? { count: 0, amount: 0, source: tx.source };
    item.count += 1;
    item.amount += Math.abs(tx.amount);
    counter.set(pattern, item);
  }

  return [...counter.entries()]
    .filter(([, value]) => value.count >= 3)
    .map(([pattern, value]) => ({
      pattern,
      count: value.count,
      avg_amount: value.amount / value.count,
      source: value.source
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function createRule(input: {
  pattern: string;
  source?: string | null;
  macro: string;
  subcat: string;
  type?: 'INCOME' | 'EXPENSE' | 'REIMBURSEMENT' | 'TRANSFER';
}): RulesRow {
  return {
    rule_id: `rule_${generateUUID()}`,
    priority: 100,
    active: true,
    source: input.source ?? null,
    match_type: 'INCLUDES',
    match_sender: null,
    match_text: input.pattern,
    match_amount_min: null,
    match_amount_max: null,
    assign_type: input.type ?? 'EXPENSE',
    assign_macro: input.macro,
    assign_subcat: input.subcat,
    assign_income_fixed_or_variable: null,
    assign_income_detail: null,
    assign_reimbursement_target_macro: null,
    confidence_default: 0.9
  };
}

export function checkPatternSuggestions(
  transactions: MasterRow[],
  notify?: (message: string) => Promise<void>
): Promise<PatternSuggestion[]> {
  const suggestions = detectRepeatPatterns(transactions);
  if (!notify || suggestions.length === 0) {
    return Promise.resolve(suggestions);
  }

  const lines = suggestions.map(
    (item) =>
      `Patron: ${item.pattern} | repeticiones: ${item.count} | media: ${item.avg_amount.toFixed(2)} EUR`
  );

  return notify(`Sugerencias de reglas detectadas:\n${lines.join('\n')}`).then(() => suggestions);
}
