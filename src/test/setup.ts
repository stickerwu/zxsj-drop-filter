import "@testing-library/jest-dom/vitest"

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
