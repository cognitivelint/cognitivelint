import type { Rule } from '@dkoul/cognitivelint-core';

import {
  missingLoadingState,
  missingEmptyState,
  missingSuccessFeedback,
  noProgressIndicator,
} from './feedback/index.js';

import {
  unexplainedDisabled,
  ownershipAmbiguity,
  missingOwnership,
} from './trust-confidence/index.js';

import {
  destructiveNoConfirm,
  noUndo,
  modalNesting,
  confirmationFatigue,
} from './error-prevention/index.js';

import {
  excessivePrimaryActions,
  longForms,
  filterOverload,
  denseTables,
} from './cognitive-load/index.js';

import {
  missingSearch,
  hiddenPrimaryAction,
  emptyNavigation,
} from './discoverability/index.js';

import { inconsistentButtonLabels } from './consistency/index.js';

export * from './feedback/index.js';
export * from './trust-confidence/index.js';
export * from './error-prevention/index.js';
export * from './cognitive-load/index.js';
export * from './discoverability/index.js';
export * from './consistency/index.js';

export function getAllRules(): Rule[] {
  return [
    // Feedback (15%)
    missingLoadingState,
    missingEmptyState,
    missingSuccessFeedback,
    noProgressIndicator,

    // Trust & Confidence (20%)
    unexplainedDisabled,
    ownershipAmbiguity,
    missingOwnership,

    // Error Prevention (10%)
    destructiveNoConfirm,
    noUndo,
    modalNesting,
    confirmationFatigue,

    // Cognitive Load (30%)
    excessivePrimaryActions,
    longForms,
    filterOverload,
    denseTables,

    // Discoverability (15%)
    missingSearch,
    hiddenPrimaryAction,
    emptyNavigation,

    // Consistency (10%)
    inconsistentButtonLabels,
  ];
}
