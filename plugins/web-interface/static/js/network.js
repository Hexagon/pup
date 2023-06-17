/**
 * Manages the network requests and WebSocket communication for the web-interface plugin of Pup.
 *
 * @file static/js/network.js
 */

import { addLog, updateProcessCard, updateSidebar } from "./ui.js"
import { processConfigInventory, processSelector, processStatusInventory } from "./state.js"

export function generateWebSocketURL() {
  const loc = window.location
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:"
  const port = loc.port ? `:${loc.port}` : ""
  const dir = loc.pathname.lastIndexOf("/") !== -1 ? loc.pathname.substring(0, loc.pathname.lastIndexOf("/")) + "/" : "/"
  return `${protocol}//${loc.hostname}${port}${dir}ws`
}

// Initialize WebSocket connection
const socket = new WebSocket(generateWebSocketURL())

// Add event listener for incoming messages
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data)
  handleWebSocketMessage(message)
})

/**
 * Handles incoming messages from WebSocket.
 * @param {object} message - The message received from the WebSocket.
 */
function handleWebSocketMessage(message) {
  // Ensure message is defined and has necessary properties
  if (!message || !message.type || !message.data) {
    console.error("Invalid message:", message)
    return
  }

  switch (message.type) {
    case "process_status_changed":
      // Ensure message.data.status and message.data.status.id are defined
      if (!message.data.status || !message.data.status.id) {
        console.error("Invalid process status:", message.data.status)
        break
      }

      processStatusInventory.set(message.data.status.id, message.data.status)

      updateProcessCard(message.data)

      // If the updated process is currently selected, update the toolbar as well
      if (processSelector.get() === message.data.status.id) {
        updateSidebar(message.data.status.id)
      }
      break
    case "log":
      addLog(message.data)
      break
    default:
      console.error("Unknown message type:", message.type)
  }
}

/**
 * Controls the processes by sending a request to a specific operation endpoint.
 * @param {string} id - The ID of the process to control.
 * @param {string} operation - The operation to perform on the process.
 * @returns {Promise<object>} A promise that resolves to the server response.
 * @throws {Error} When unable to perform the operation or if an invalid operation is specified.
 */
export async function controlProcess(id, operation) {
  // Array of valid operations
  const validOperations = ["start", "stop", "block", "unblock", "restart"]

  // Validate operation
  if (!validOperations.includes(operation)) {
    throw new Error(`Invalid operation: ${operation}. Must be one of ${validOperations.join(", ")}.`)
  }

  let response
  try {
    response = await fetch(`./${operation}/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error(`Error performing ${operation} operation on process ${id}:`, error)
    throw error
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  if (result && result.success) {
    updateInstanceInfo()
  }
  return result
}

/**
 * Fetches instance data from the server
 * @async
 * @returns {Promise<object[]>} A promise that resolves to instance status data
 * @throws {Error} When unable to fetch the processes.
 */
async function fetchInstance() {
  let response
  try {
    response = await fetch("./state")
  } catch (error) {
    console.error("Error fetching processes:", error)
    throw error // or return an empty array or default value
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Fetches the list of processes from the server
 * @async
 * @returns {Promise<object[]>} A promise that resolves to the list of processes.
 * @throws {Error} When unable to fetch the processes.
 */
async function fetchProcesses() {
  let response
  try {
    response = await fetch("./processes")
  } catch (error) {
    console.error("Error fetching processes:", error)
    throw error // or return an empty array or default value
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const processes = await response.json()

  for (const process of processes) {
    if (process.config && process.config.id) {
      processConfigInventory.set(process.config.id, process.config)
    }
    if (process.status && process.status.id) {
      processStatusInventory.set(process.status.id, process.status)
    }
  }
  return processes
}

export { fetchInstance, fetchProcesses }
