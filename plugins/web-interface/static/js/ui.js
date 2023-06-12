/**
 * UI related functions including handling click events, creating HTML elements,
 * updating statuses, and processing logs.
 *
 * @file static/js/ui.js
 */

import { ansiToHtml, getStatusColor, ProcessStateToString, showSpecificClassElements } from "./helpers.js"

let selectedProcessId

const processStatusInventory = new Map()
const processConfigInventory = new Map()

/**
 * Change the log scope to a specific process.
 * This function also updates the UI to reflect the change.
 *
 * @param {string} processId - The id of the process.
 */
export function changeLogScope(processId) {
  selectedProcessId = processId

  // Remove the class from all process cards
  const processCards = document.querySelectorAll(".process-card")
  processCards.forEach((processCard) => {
    processCard.classList.remove("process-card-selected")
  })

  // Add the class to the selected process card
  const sanitizedId = sanitizeId(processId)
  const selectedProcessCard = document.getElementById(`process-card-${sanitizedId}`)
  if (selectedProcessCard) selectedProcessCard.classList.add("process-card-selected")

  // Show logs for the selected process only
  showSpecificClassElements("logs", sanitizedId)

  // Update the text of #selected-process-id
  const selectedProcessIdElement = document.getElementById("selected-process-id")
  if (selectedProcessIdElement) {
    selectedProcessIdElement.textContent = processId
  } else {
    console.warn("Cannot find #selected-process-id element to update text.")
  }

  // Update the toolbar with the selected process details
  updateToolbar(sanitizedId)
}

/**
 * Add a log entry to the logs section.
 *
 * @param {Object} log - Log entry.
 * @param {string} selectedProcessId - The id of the selected process.
 */
function addLog(log, selectedProcessId) {
  const logsDiv = document.getElementById("logs")
  logsDiv.classList.remove("hidden")

  const hiddenClass = selectedProcessId === log.id ? "" : "hidden"
  let logsHtml = `<pre class="${log.id} ${hiddenClass}">${log.ts} | ${log.category} | ${log.severity} > ${ansiToHtml(log.text)}\n</pre>`
  logsDiv.innerHTML = logsHtml + logsDiv.innerHTML
}

/**
 * Helper function to set text content of DOM elements by selector.
 * This function will not interpret the text as HTML.
 *
 * @param {string} selector - The selector for the DOM elements.
 * @param {string} text - The text to be set.
 */
export function setTextContentBySelector(selector, text) {
  const elements = document.querySelectorAll(selector)
  if (elements.length > 0) {
    elements.forEach((element) => {
      element.textContent = text
    })
  } else {
    console.warn(`No elements found with selector ${selector}.`)
  }
}

/**
 * Helper function to sanitize IDs for use as HTML IDs.
 *
 * @param {string} id - The original ID.
 * @returns {string} The sanitized ID.
 */
function sanitizeId(id) {
  // Replace all invalid characters with underscore
  return id.replace(/[^a-zA-Z0-9-_:]/g, "_")
}

/**
 * Update the toolbar with the details of a specific process.
 *
 * @param {string} processId - The id of the process.
 */
function updateToolbar(processId) {
  // Get process config and status data
  const processConfig = processConfigInventory.get(processId)
  const processStatus = processStatusInventory.get(processId)

  // Update process config values
  setTextContentBySelector("#process-config-command", processConfig.cmd || processConfig.worker)
  setTextContentBySelector("#process-config-autostart", processConfig.autostart)
  setTextContentBySelector("#process-config-cron", processConfig.cron)
  setTextContentBySelector("#process-config-restart", processConfig.restart || "always")
  setTextContentBySelector("#process-config-terminate", processConfig.terminate)

  // Update process status values
  setTextContentBySelector("#process-status-type", processStatus.type)
  setTextContentBySelector("#process-status-blocked", processStatus.blocked)
  setTextContentBySelector("#process-status-status", ProcessStateToString(processStatus.status))
  setTextContentBySelector("#process-status-started", processStatus.started)
  setTextContentBySelector("#process-status-updated", processStatus.updated)
}

/**
 * Update a process card element. Create it if it does not already exist.
 *
 * @param {Object} processData - Process data.
 * @returns {HTMLDivElement} Process card element.
 */
function updateProcessCard(processData) {
  const { status /*, config */ } = processData

  const sanitizedId = sanitizeId(status.id)

  // Get or create process card
  let processCard = document.getElementById(`process-card-${sanitizedId}`)
  if (!processCard) {
    processCard = document.createElement("div")
    processCard.id = `process-card-${sanitizedId}`
    processCard.addEventListener("click", () => {
      changeLogScope(sanitizedId)
    })

    // Add process title
    const title = document.createElement("span")
    title.classList.add("process-title")
    title.textContent = sanitizedId

    // Add process status
    const ProcessState = document.createElement("span")
    ProcessState.classList.add("process-status")
    title.appendChild(ProcessState)

    processCard.appendChild(title)

    // Add new process card to the DOM
    const container = document.getElementById("process-card-container")
    if (container) {
      container.appendChild(processCard)
    } else {
      console.warn("Cannot find container element to append new process card.")
    }
  }

  // Update process status
  const ProcessState = processCard.querySelector(".process-status")
  ProcessState.textContent = ` - ${ProcessStateToString(status.status)}`

  // Set border color depending on process status
  processCard.className = `process-card border-${getStatusColor(status.status)}`

  return processCard
}

export { addLog, processConfigInventory, processStatusInventory, selectedProcessId, updateProcessCard, updateToolbar }
