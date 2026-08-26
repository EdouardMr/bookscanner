// Vitest runs in plain Node, where the real "server-only" package throws
// unconditionally (it only no-ops when a bundler resolves its "browser"
// field for a client bundle). Alias it to this empty stub for tests so
// server-only modules can still be imported and unit tested directly.
export {};
