// worker.js
import { LoadBalancer } from "../core/loadbalancer.ts"

/** @type {LoadBalancer | undefined} */
let loadBalancer = undefined

/**
 * @typedef LogMessage
 * @property {string} severity
 * @property {string} category
 * @property {string} text
 */

/**
 * Callback for logging.
 * @param {string} severity
 * @param {string} category
 * @param {string} text
 */
const loggerCallback = (severity, category, text) => {
  const logMessage = { severity, category, text }
  globalThis.postMessage({ operation: "log", ...logMessage })
}

/**
 * @typedef LoadBalancerStartOperation
 * @property {"start"} operation
 * @property {any[]} backends
 * @property {any} strategy
 * @property {number} validationInterval
 * @property {number} commonPort
 */

/**
 * @param {Object} event
 * @param {LoadBalancerStartOperation} event.data
 */
self.onmessage = (event) => {
  if (event && event.data && event.data.operation === "start") {
    if (!loadBalancer) {
      loadBalancer = new LoadBalancer(event.data.backends, event.data.strategy, event.data.validationInterval, loggerCallback)
      loadBalancer && loadBalancer.start(event.data.commonPort)
    }
  }
}

self.postMessage({ operation: "ready" })
