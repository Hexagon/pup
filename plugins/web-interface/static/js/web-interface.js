const socket = new WebSocket("ws://localhost:port/ws")

socket.addEventListener("open", (event) => {
  console.log("WebSocket connected:", event)
})

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data)
  handleWebSocketMessage(message)
})

socket.addEventListener("close", (event) => {
  console.log("WebSocket closed:", event)
})

socket.addEventListener("error", (event) => {
  console.error("WebSocket error:", event)
})

function handleWebSocketMessage(message) {
  if (message.type === "process_status_changed") {
    updateProcessStatus(message.data)
    updateProcessCard(message.data)
  }
  // Handle other message types here
}

function updateProcessStatus(data) {
  // Update the process status on the web page
}

function updateProcessCard(data) {
  const processCard = document.getElementById(`process-card-${data.status.id}`)
  if (!processCard) {
    return
  }

  // Update process status
  const processStatus = processCard.querySelector(".process-status")
  processStatus.textContent = `Status: ${data.status.status}`

  // Update spark chart and log lines if needed
  // generateSparkChart(data);
  // generateLogLines(data);
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

  // Spark chart container
  const sparkChartContainer = document.createElement("div")
  sparkChartContainer.classList.add("spark-chart-container")
  processCard.appendChild(sparkChartContainer)

  // Log lines container
  const logLinesContainer = document.createElement("div")
  logLinesContainer.classList.add("log-lines-container")
  processCard.appendChild(logLinesContainer)

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

  // Add the "show logs" button
  const showLogsButton = document.createElement("button")
  showLogsButton.innerText = "Show Logs"
  showLogsButton.addEventListener("click", () => {
    showLogs(processData.status.id)
  })
  processCard.appendChild(showLogsButton)

  processCard.appendChild(actions)

  return processCard
}

function generateSparkChart(processData) {
  // Generate the spark chart for the process
}

function generateLogLines(processData) {
  // Generate the log lines with different colors based on severity
}

async function showLogs(processId) {
  const logsDiv = document.getElementById("logs")
  logsDiv.classList.remove("hidden")
  logsDiv.innerHTML = "<h2>Loading logs...</h2>"

  // Fetch logs from your API
  const response = await fetch(`/logs/${processId}`, {
    method: "GET",
    headers: {
      // Add any required headers
    },
  })

  if (response.ok) {
    const logs = await response.json()

    // Display logs in the logsDiv
    let logsHtml = `<h2>Logs for process ${processId}</h2>`
    logsHtml += "<pre>"
    logs.forEach((log) => {
      logsHtml += log + "\n"
    })
    logsHtml += "</pre>"

    logsDiv.innerHTML = logsHtml
  } else {
    logsDiv.innerHTML = `<h2>Error loading logs for process ${processId}</h2>`
    const errorText = await response.text()
    logsDiv.innerHTML += `<pre>${errorText}</pre>`
  }
}
async function main() {
  const processes = await fetchProcesses()
  processes.forEach((processData) => {
    const processCard = generateProcessCard(processData)
    generateSparkChart(processData)
    generateLogLines(processData)
    document.getElementById("processes").appendChild(processCard)
  })
  document.getElementById("terminate-pup").addEventListener("click", () => {
    if (confirm("Are you sure you want to terminate Pup?")) {
      socket.send(JSON.stringify({ type: "terminate_pup" }))
    }
  })
}

main()
