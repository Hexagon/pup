/**
 * Simple EventEmitter implementation for Pup
 *
 * @file lib/common/eventemitter.ts
 * @license MIT
 */

export type EventHandler<t> = (eventData?: t) => void

class EventEmitter {
  // deno-lint-ignore no-explicit-any
  listeners = new Map<string, Array<EventHandler<any>>>()

  /**
   * Registers an event listener for the specified event.
   * @param {string} event - The name of the event to listen for.
   * @param {EventHandler<T>} fn - The callback function to execute when the event is triggered.
   */
  on<T>(event: string, fn: EventHandler<T>) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.push(fn)
    } else {
      this.listeners.set(event, [fn])
    }
  }

  /**
   * Removes an event listener for the specified event.
   * @param {string} event - The name of the event to remove the listener from.
   * @param {EventHandler<T>} fn - The callback function to remove from the event listeners.
   */
  off<T>(event: string, fn: EventHandler<T>) {
    const existingFns = this.listeners.get(event)
    if (existingFns) {
      this.listeners.set(
        event,
        existingFns.filter((existingFn) => existingFn !== fn),
      )
    }
  }

  /**
   * Emits an event, calling all registered event listeners for the specified event.
   * @param {string} event - The name of the event to emit.
   * @param {T} eventData - Optional event data to be passed to the event listeners.
   */
  emit<T>(event: string, eventData?: T) {
    const fns = this.listeners.get(event)
    if (fns) {
      for (const fn of fns) {
        fn(eventData)
      }
    }
  }
}

export { EventEmitter }
