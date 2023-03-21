const socket = new WebSocket("ws://localhost:5000/ws")

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data)
  handleWebSocketMessage(message)
})

function addLog(log) {
  const logsDiv = document.getElementById("logs")
  logsDiv.classList.remove("hidden")

  let logsHtml = '<pre class="' + log.id + '">'
  logsHtml += log.ts + " | " + log.category + " | " + log.severity + " > " + ansiToHtml(log.text) + "\n"
  logsHtml += "</pre>"

  logsDiv.innerHTML = logsHtml + logsDiv.innerHTML
}
function handleWebSocketMessage(message) {
  if (message.type === "process_status_changed") {
    updateProcessStatus(message.data)
    updateProcessCard(message.data)
  }
  if (message.type === "log") {
    addLog(message.data)
  }
}

function updateProcessCard(data) {
  const processCard = document.getElementById(`process-card-${data.status.id}`)
  if (!processCard) {
    return
  }

  // Update process status
  const processStatus = processCard.querySelector(".process-status")
  processStatus.textContent = `Status: ${data.status.status}`
}

async function fetchProcesses() {
  const response = await fetch("/processes")
  return response.json()
}

function generateProcessCard(processData) {
  const { status, config } = processData
  const processCard = document.createElement("div")
  processCard.classList.add("process-card")

  // Process title
  const title = document.createElement("h2")
  title.textContent = config.id
  processCard.appendChild(title)

  // Process status
  const processStatus = document.createElement("p")
  processStatus.textContent = `Status: ${status.status}`
  processStatus.classList.add("process-status")
  processCard.appendChild(processStatus)

  // Action buttons
  const actions = document.createElement("div")
  actions.classList.add("actions")

  const startButton = document.createElement("button")
  startButton.textContent = "Start"
  startButton.addEventListener("click", () => {
    // Start process logic
  })
  actions.appendChild(startButton)

  const stopButton = document.createElement("button")
  stopButton.textContent = "Stop"
  stopButton.addEventListener("click", () => {
    // Stop process logic
  })
  actions.appendChild(stopButton)

  const restartButton = document.createElement("button")
  restartButton.textContent = "Restart"
  restartButton.addEventListener("click", () => {
    // Restart process logic
  })

  actions.appendChild(restartButton)
  const showLogsButton = document.createElement("button")
  showLogsButton.innerText = "Filter Logs"
  showLogsButton.addEventListener("click", () => {
    showLogs(processData.status.id)
  })
  processCard.appendChild(showLogsButton)

  processCard.appendChild(actions)

  return processCard
}

async function showLogs(processId) {
  showSpecificClassElements("logs", processId)
}

async function main() {
  const processes = await fetchProcesses()
  processes.forEach((processData) => {
    const processCard = generateProcessCard(processData)
    document.getElementById("processes").appendChild(processCard)
  })
  document.getElementById("terminate-pup").addEventListener("click", () => {
    if (confirm("Are you sure you want to terminate Pup?")) {
      socket.send(JSON.stringify({ type: "terminate_pup" }))
    }
  })
}

main()
