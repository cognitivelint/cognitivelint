export { configHash } from './config-hash.js';
export { fingerprintFinding, normalizeFilePath, normalizeMessage } from './fingerprint.js';
export { compareRuns, type CompareResult, type FingerprintedFinding } from './compare.js';
export {
  RUN_SCHEMA,
  parseRunV1,
  parseProjectToken,
  ProtocolValidationError,
  runV1Schema,
  type RunV1,
} from './schema.js';
