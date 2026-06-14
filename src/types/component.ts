/**
 * Canonical component contract (MDD §6.3, CLAUDE.md "Component Interface Convention").
 *
 * Every lifecycle component exports a factory returning this interface. `destroy()`
 * is mandatory — it is called on every view transition to remove event listeners and
 * free references, preventing memory leaks from detached DOM nodes.
 *
 * Components that need extra capabilities (e.g. a `dim()` or `getElement()` method)
 * extend this interface rather than re-declaring it.
 */
export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}
