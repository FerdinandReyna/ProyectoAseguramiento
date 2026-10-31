// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Node 25+ trae su propio localStorage experimental, que sin --localstorage-file
// queda incompleto y tapa el de jsdom. Se usa un almacenamiento en memoria para
// que las pruebas den el mismo resultado en cualquier versión de Node.
if (typeof globalThis.localStorage?.clear !== "function") {
  const store = new Map();
  const memoryStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}