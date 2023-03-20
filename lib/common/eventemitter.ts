/**
 * Simple EventEmitter implementation for Pup
 *
 * @file lib/common/eventemitter.ts
 * @license MIT
 */

type EventHandler<t> = (eventData?: t) => void

class EventEmitter {
  // deno-lint-ignore no-explicit-any
  listeners = new Map<string, EventHandler<any>[]>()
  on<T>(event: string, fn: EventHandler<T>) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.push(fn)
    } else {
      this.listeners.set(event, [fn])
    }
    return this
  }
  off<T>(event: string, fn: EventHandler<T>) {
    let existingFns = this.listeners.get(event)
    if (existingFns) existingFns = existingFns.filter((existingFn) => existingFn === fn)
    return this
  }
  emit<T>(event: string, eventData?: T) {
    const fns = this.listeners.get(event)
    if (fns) {
      for (const fn of fns) {
        fn(eventData)
      }
    }
    return this
  }
}

export { EventEmitter }
