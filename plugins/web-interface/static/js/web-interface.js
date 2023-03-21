// Initialize WebSocket connection
const socket = new WebSocket("ws://localhost:5000/ws")

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

  let logsHtml = `<pre class="${log.id}">${log.ts} | ${log.category} | ${log.severity} > ${ansiToHtml(log.text)}\n</pre>`
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
  processStatus.textContent = `Status: ${data.status.status}`
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

  // Add process title
  const title = document.createElement("span")
  title.classList.add("process-title")
  title.textContent = config.id
  processCard.appendChild(title)

  // Add process status
  const processStatus = document.createElement("p")
  processStatus.textContent = `Status: ${status.status}`
  processStatus.classList.add("process-status")
  processCard.appendChild(processStatus)

  // Add action buttons
  const actions = document.createElement("div")
  actions.classList.add("actions")

  const startButton = document.createElement("button")
  startButton.classList.add("small-button")
  startButton.innerHTML = '<i class="fas fa-play"></i>'
  startButton.addEventListener("click", () => {
    // Start process logic
  })
  actions.appendChild(startButton)

  const stopButton = document.createElement("button")
  stopButton.classList.add("small-button")
  stopButton.innerHTML = '<i class="fas fa-stop"></i>'
  stopButton.addEventListener("click", () => {
    // Stop process logic
  })
  actions.appendChild(stopButton)

  const restartButton = document.createElement("button")
  restartButton.classList.add("small-button")
  restartButton.innerHTML = '<i class="fas fa-redo"></i>'
  restartButton.addEventListener("click", () => {
    // Restart process logic
  })
  actions.appendChild(restartButton)

  processCard.appendChild(actions)

  return processCard
}

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
