/* global afterAll */
// Expo 57 installs fetch lazily. Resolve it while the test environment is alive,
// before Jest inspects globals during teardown and native mocks are disposed.
afterAll(() => { void globalThis.fetch; });
