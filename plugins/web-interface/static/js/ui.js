import { ansiToHtml, getStatusColor, ProcessStateToString, showSpecificClassElements } from "./helpers.js"

let selectedProcessId

const processStatusInventory = new Map()
const processConfigInventory = new Map()

export function changeLogScope(processId) {
  selectedProcessId = processId

  // Remove the class from all process cards
  const processCards = document.querySelectorAll(".process-card")
  processCards.forEach((processCard) => {
    processCard.classList.remove("process-card-selected")
  })

  // Add the class to the selected process card
  const selectedProcessCard = document.getElementById(`process-card-${processId}`)
  selectedProcessCard.classList.add("process-card-selected")

  // Show logs for the selected process only
  showSpecificClassElements("logs", processId)

  // Update the toolbar with the selected process details
  updateToolbar(processId)
}

// Function to add a log entry to the logs section
function addLog(log, selectedProcessId) {
  const logsDiv = document.getElementById("logs")
  logsDiv.classList.remove("hidden")

  const hiddenClass = selectedProcessId === log.id ? "" : "hidden"
  let logsHtml = `<pre class="${log.id} ${hiddenClass}">${log.ts} | ${log.category} | ${log.severity} > ${ansiToHtml(log.text)}\n</pre>`
  logsDiv.innerHTML = logsHtml + logsDiv.innerHTML
}

function updateToolbar(processId) {
  // Update selected process id
  const selectedProcessIdElement = document.getElementById("selected-process-id")
  selectedProcessIdElement.textContent = processId

  // Get process config and status data
  const processConfig = processConfigInventory.get(processId)
  const processStatus = processStatusInventory.get(processId)

  // Update process config values
  const processConfigCommand = document.getElementById("process-config-command")
  processConfigCommand.textContent = processConfig.cmd || processConfig.worker

  const processConfigAutostart = document.getElementById("process-config-autostart")
  processConfigAutostart.textContent = processConfig.autostart

  const processConfigCron = document.getElementById("process-config-cron")
  processConfigCron.textContent = processConfig.cron

  const processConfigRestart = document.getElementById("process-config-restart")
  processConfigRestart.textContent = processConfig.restart || "always"

  const processConfigTerminate = document.getElementById("process-config-terminate")
  processConfigTerminate.textContent = processConfig.terminate

  // Update process status values
  const processStatusType = document.getElementById("process-status-type")
  processStatusType.textContent = processStatus.type

  const processStatusBlocked = document.getElementById("process-status-blocked")
  processStatusBlocked.textContent = processStatus.blocked

  const processStatusStatus = document.getElementById("process-status-status")
  processStatusStatus.textContent = ProcessStateToString(processStatus.status)

  const processStatusStarted = document.getElementById("process-status-started")
  processStatusStarted.textContent = processStatus.started

  const processStatusUpdated = document.getElementById("process-status-updated")
  processStatusUpdated.textContent = processStatus.updated
}

// Function to update the process card with the new status
function updateProcessCard(data) {
  const processCard = document.getElementById(`process-card-${data.status.id}`)
  if (!processCard) {
    return
  }

  // Update process status
  const ProcessState = processCard.querySelector(".process-status")
  ProcessState.textContent = ` - ${ProcessStateToString(data.status.status)}`

  // Set border color depending on process status
  processCard.className = `process-card border-${getStatusColor(data.status.status)}`
}

// Function to create a process card element
function generateProcessCard(processData) {
  const { status, config } = processData

  // Create process card if it does not exist
  const processCard = document.createElement("div")
  processCard.classList.add("process-card")
  processCard.classList.add(`border-${getStatusColor(status.status)}`)
  processCard.id = `process-card-${config.id}`

  // Add process title
  const title = document.createElement("span")
  title.classList.add("process-title")
  title.textContent = config.id

  // Add process status
  const ProcessState = document.createElement("span")
  ProcessState.textContent = ` - ${ProcessStateToString(status.status)}`
  ProcessState.classList.add("process-status")
  title.appendChild(ProcessState)

  processCard.appendChild(title)

  processCard.addEventListener("click", () => {
    changeLogScope(config.id)
  })

  return processCard
}

export { addLog, generateProcessCard, processConfigInventory, processStatusInventory, selectedProcessId, updateProcessCard, updateToolbar }
