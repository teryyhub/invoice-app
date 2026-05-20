// Lightweight query helper — wraps Supabase calls with loading/error state
// Use React Query or SWR if you need caching / background refetch

export function createQueryClient() {
  const cache = new Map();

  return {
    invalidate(key) {
      cache.delete(key);
    },
    clear() {
      cache.clear();
    },
  };
}
