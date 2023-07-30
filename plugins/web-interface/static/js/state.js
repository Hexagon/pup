/**
 * Manages the global state for the web-interface plugin of Pup.
 *
 * @file static/js/state.js
 */

class ProcessSelector {
  constructor() {
    this.selectedProcessId = undefined
  }
  set(id) {
    this.selectedProcessId = id
  }
  get() {
    return this.selectedProcessId
  }
}

export const processStatusInventory = new Map()
export const processConfigInventory = new Map()
export const processSelector = new ProcessSelector()
