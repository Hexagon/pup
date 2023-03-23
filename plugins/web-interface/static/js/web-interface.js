// Initialize WebSocket connection
const socket = new WebSocket(generateWebSocketURL())

// Add event listener for incoming messages
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data)
  handleWebSocketMessage(message)
})

// Function to handle incoming messages from WebSocket
function handleWebSocketMessage(message) {
  if (message.type === "process_status_changed") {
    updateProcessCard(message.data)
  } else if (message.type === "log") {
    addLog(message.data)
  }
}

// Function to add a log entry to the logs section
function addLog(log) {
  const logsDiv = document.getElementById("logs")
  logsDiv.classList.remove("hidden")

  const selectedProcessId = document.getElementById("selected-process-id").textContent
  const hiddenClass = selectedProcessId === log.id ? "" : "hidden"
  let logsHtml = `<pre class="${log.id} ${hiddenClass}">${log.ts} | ${log.category} | ${log.severity} > ${ansiToHtml(log.text)}\n</pre>`
  logsDiv.innerHTML = logsHtml + logsDiv.innerHTML
}

// Function to update the process card with the new status
function updateProcessCard(data) {
  const processCard = document.getElementById(`process-card-${data.status.id}`)
  if (!processCard) {
    return
  }

  // Update process status
  const processStatus = processCard.querySelector(".process-status")
  processStatus.textContent = ` - ${processStatusToString(data.status.status)}`
}

// Function to fetch the list of processes from the server
async function fetchProcesses() {
  const response = await fetch("/processes")
  return response.json()
}

// Function to create a process card element
function generateProcessCard(processData) {
  const { status, config } = processData
  const processCard = document.createElement("div")
  processCard.classList.add("process-card")
  processCard.id = `process-card-${config.id}`

  // Add process title
  const title = document.createElement("span")
  title.classList.add("process-title")
  title.textContent = config.id

  // Add process status
  const processStatus = document.createElement("span")
  processStatus.textContent = ` - ${processStatusToString(status.status)}`
  processStatus.classList.add("process-status")
  title.appendChild(processStatus)

  processCard.appendChild(title)

  processCard.addEventListener("click", () => {
    changeLogScope(config.id)
  })

  return processCard
}

function changeLogScope(processId) {
  document.getElementById("selected-process-id").textContent = processId
  showSpecificClassElements("logs", processId)
}
function changeLogScope(processId) {
  // Remove the class from all process cards
  const processCards = document.querySelectorAll(".process-card")
  processCards.forEach((processCard) => {
    processCard.classList.remove("process-card-selected")
  })

  // Add the class to the selected process card
  const selectedProcessCard = document.getElementById(`process-card-${processId}`)
  selectedProcessCard.classList.add("process-card-selected")

  // Update the selected process ID in the toolbar
  document.getElementById("selected-process-id").textContent = processId

  // Show logs for the selected process only
  showSpecificClassElements("logs", processId)
}

document.getElementById("start-process").addEventListener("click", () => {
  // Start process logic
})

document.getElementById("stop-process").addEventListener("click", () => {
  // Stop process logic
})

document.getElementById("restart-process").addEventListener("click", () => {
  // Restart process logic
})

// Main function to initialize the application
async function main() {
  const processes = await fetchProcesses()
  processes.forEach((processData) => {
    const processCard = generateProcessCard(processData)
    document.getElementById("processes").appendChild(processCard)
  })

  document.getElementById("terminate-pup").addEventListener("click", () => {
    if (confirm("Are you sure you want toterminate Pup?")) {
      socket.send(JSON.stringify({ type: "terminate_pup" }))
    }
  })
}

// Call the main function to start the application
main()
