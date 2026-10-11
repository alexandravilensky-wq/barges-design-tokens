import { addons } from 'storybook/manager-api';
import { GLOBALS_UPDATED, SET_GLOBALS, UPDATE_GLOBALS } from 'storybook/internal/core-events';

// Storybook doesn't pass toolbar globals to composed Storybooks (the Components ref).
// Both sites live on alexandravilensky-wq.github.io, so share Brand and Theme through
// localStorage; the components preview reads it when it's shown inside this Storybook.
const KEY = 'barges-storybook-globals';

addons.register('barges/share-globals', api => {
  const save = (globals?: Record<string, unknown>) => {
    if (!globals?.brand && !globals?.theme) return;
    try {
      const prev = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      const next = { ...prev, ...(globals.brand ? { brand: globals.brand } : {}), ...(globals.theme ? { theme: globals.theme } : {}) };
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage blocked (private window): components just use their defaults.
    }
  };
  for (const event of [SET_GLOBALS, UPDATE_GLOBALS, GLOBALS_UPDATED]) {
    api.on(event, (payload: { globals?: Record<string, unknown> }) => save(payload?.globals));
  }
});
