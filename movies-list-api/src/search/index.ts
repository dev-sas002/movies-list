import { isAiSearchEnabled } from '../config/env';
import { createAnthropicPlanner } from './anthropicPlanner';
import { heuristicPlanner } from './heuristicPlanner';
import { SearchPlanner } from './types';

export * from './types';
export { heuristicPlanner } from './heuristicPlanner';
export { createAnthropicPlanner } from './anthropicPlanner';

/**
 * Planner registry. One line picks the implementation, and `setSearchPlanner`
 * lets a test - or a future provider - substitute another one without the
 * service layer knowing which is in play.
 */
let planner: SearchPlanner | null = null;

export const createSearchPlanner = (): SearchPlanner =>
  isAiSearchEnabled() ? createAnthropicPlanner({ fallback: heuristicPlanner }) : heuristicPlanner;

export const getSearchPlanner = (): SearchPlanner => {
  if (!planner) {
    planner = createSearchPlanner();
  }

  return planner;
};

export const setSearchPlanner = (next: SearchPlanner | null): void => {
  planner = next;
};
