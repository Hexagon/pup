/**
 * UI related functions including handling click events, creating HTML elements,
 * updating statuses, and processing logs.
 *
 * @file static/js/ui.js
 */

import { ansiToHtml, formatBytes, formatTime, getStatusColor, ProcessStateToString, showSpecificClassElements } from "./helpers.js"
import { processConfigInventory, processSelector, processStatusInventory } from "./state.js"

async function updateInstance(instanceData, processData) {
  const systemMemoryUsagePercent = ((instanceData.systemMemory.total - instanceData.systemMemory.free) / instanceData.systemMemory.total * 100).toFixed(2)
  setTextContentBySelector("#system-memory-usage-percent", `${systemMemoryUsagePercent}%`)
  if (systemMemoryUsagePercent > 90) {
    document.getElementById("system-memory-container").className = "bg-bad fg-bad"
  } else if (systemMemoryUsagePercent > 80) {
    document.getElementById("system-memory-container").className = "bg-warning fg-warning"
  }
  const systemMemoryUsage = instanceData.systemMemory.total - instanceData.systemMemory.free
  setTextContentBySelector("#system-memory-usage", `${formatBytes(systemMemoryUsage, false, "GB")} / ${formatBytes(instanceData.systemMemory.total, true, "GB")}`)
  const systemSwapUsagePercent = ((instanceData.systemMemory.swapTotal - instanceData.systemMemory.swapFree) / instanceData.systemMemory.swapTotal * 100).toFixed(2)
  setTextContentBySelector("#system-swap-usage-percent", `${systemSwapUsagePercent}%`)
  const systemSwapUsage = instanceData.systemMemory.swapTotal - instanceData.systemMemory.swapFree
  setTextContentBySelector("#system-swap-usage", `${formatBytes(systemSwapUsage, false, "GB")} / ${formatBytes(instanceData.systemMemory.swapTotal, true, "GB")}`)
  setTextContentBySelector("#system-uptime", formatTime(instanceData.osUptime))
  setTextContentBySelector("#system-os-release", instanceData.osRelease)
  setTextContentBySelector("#system-load", instanceData.loadAvg.map((l) => l.toFixed(2)).join(", "))
  setTextContentBySelector("#pup-memory-usage", formatBytes(instanceData.memory.rss, true))
  setTextContentBySelector("#pup-deno-version", instanceData.denoVersion.deno)
  setTextContentBySelector("#pup-version", instanceData.version)
  const uptime = new Date() - new Date(instanceData.started)
  setTextContentBySelector("#pup-uptime", formatTime(uptime / 1000))
  setTextContentBySelector("#pup-processes", instanceData.processes.length.toString())
  processData.forEach((currentProcess) => {
    updateProcessCard(currentProcess)
  })
  changeLogScope(processSelector.get())
}

/**
 * Change the log scope to a specific process.
 * This function also updates the UI to reflect the change.
 *
 * @param {string} processId - The id of the process.
 */
export function changeLogScope(processId) {
  processSelector.set(processId)

  let sanitizedId

  if (processId) {
    sanitizedId = sanitizeId(processId)

    // Show actions
    document.getElementById("actions-container").classList.remove("hidden")

    // Remove the class from all process cards
    const processCards = document.querySelectorAll(".process-card")
    processCards.forEach((processCard) => {
      processCard.classList.remove("process-card-selected")
    })

    // Add the class to the selected process card
    const selectedProcessCard = document.getElementById(`process-card-${sanitizedId}`)
    if (selectedProcessCard) selectedProcessCard.classList.add("process-card-selected")

    setTextContentBySelector("#toolbar-current-process", processId)
    document.getElementById("toolbar-current-process").classList.remove("hidden")

    // Update the toolbar with the selected process details
    updateSidebar(sanitizedId)
  } else {
    document.getElementById("toolbar-current-process").classList.add("hidden")

    // Hide actions
    document.getElementById("actions-container").classList.add("hidden")

    updateSidebar()
  }

  // Show logs for the selected process only
  showSpecificClassElements("logs", sanitizedId)
}

/**
 * Add a log entry to the logs section.
 *
 * @param {Object} log - Log entry.
 * @param {string} processId - The id of the selected process.
 */
function addLog(log, processId) {
  const logsDiv = document.getElementById("logs")
  logsDiv.classList.remove("hidden")

  const hiddenClass = processId === log.id ? "" : "hidden"
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
 * Update the sidebar with the details of a specific process.
 *
 * @param {string} processId - The id of the process.
 */
function updateSidebar(processId) {
  if (processId) {
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

    document.getElementById("process-details").classList.remove("hidden")
    document.getElementById("process-details-header").classList.remove("hidden")
  } else {
    document.getElementById("process-details").classList.add("hidden")
    document.getElementById("process-details-header").classList.remove("hidden")
  }
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

    // Add icon
    const icon = document.createElement("i")
    icon.classList.add("fas")
    if (status.type === "process") icon.classList.add("fa-cube")
    else if (status.type === "cluster") icon.classList.add("fa-cubes")
    processCard.appendChild(icon)

    // Add process title
    const title = document.createElement("span")
    title.classList.add("process-title")
    title.textContent = sanitizedId

    // Add process status
    const ProcessState = document.createElement("span")
    ProcessState.classList.add("process-status")
    ProcessState.classList.add("badge")

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
  ProcessState.textContent = `${ProcessStateToString(status.status)}`
  ProcessState.className = "process-status badge"
  ProcessState.classList.add(`bg-${getStatusColor(status.status)}`)
  ProcessState.classList.add(`border-${getStatusColor(status.status)}`)

  // Set border color depending on process status
  processCard.className = `process-card`

  return processCard
}

export { addLog, updateInstance, updateProcessCard, updateSidebar }
