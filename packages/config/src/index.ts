import { cosmiconfig } from 'cosmiconfig';
import type { Config } from '@cognitivelint/cognitivelint-core';
import { DEFAULT_CONFIG } from '@cognitivelint/cognitivelint-core';

const MODULE_NAME = 'cognitivelint';

const explorer = cosmiconfig(MODULE_NAME, {
  searchPlaces: [
    'package.json',
    `.${MODULE_NAME}rc`,
    `.${MODULE_NAME}rc.json`,
    `.${MODULE_NAME}rc.yaml`,
    `.${MODULE_NAME}rc.yml`,
    `.${MODULE_NAME}rc.js`,
    `.${MODULE_NAME}rc.cjs`,
    `.${MODULE_NAME}rc.mjs`,
    `${MODULE_NAME}.config.js`,
    `${MODULE_NAME}.config.cjs`,
    `${MODULE_NAME}.config.mjs`,
    `${MODULE_NAME}.config.ts`,
  ],
});

export async function loadConfig(configPath?: string): Promise<Config> {
  try {
    const result = configPath
      ? await explorer.load(configPath)
      : await explorer.search();

    if (result && result.config) {
      return mergeConfig(DEFAULT_CONFIG, result.config);
    }

    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function mergeConfig(base: Config, override: Partial<Config>): Config {
  const merged: Config = {
    ...base,
    ...override,
    rules: {
      ...base.rules,
      ...override.rules,
    },
    weights: {
      ...base.weights,
      ...override.weights,
    },
  };

  if (override.ai !== undefined) {
    merged.ai = {
      ...base.ai,
      ...override.ai,
    };
  }

  return merged;
}

export { DEFAULT_CONFIG } from '@cognitivelint/cognitivelint-core';
export type { Config } from '@cognitivelint/cognitivelint-core';
