import { addLog, processConfigInventory, processStatusInventory, selectedProcessId, updateProcessCard, updateToolbar } from "./ui.js"
import { generateWebSocketURL } from "./helpers.js"

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
    // Only status is defined in these messages (not config)
    processStatusInventory.set(message.data.status.id, message.data.status)

    updateProcessCard(message.data)
    // If the updated process is currently selected, update the toolbar as well
    if (selectedProcessId === message.data.status.id) {
      updateToolbar(message.data.status.id)
    }
  } else if (message.type === "log") {
    addLog(message.data)
  }
}

// Function to fetch the list of processes from the server
async function fetchProcesses() {
  const response = await fetch("./processes")
  const responseJson = await response.json()
  for (const process of responseJson) {
    processConfigInventory.set(process.config.id, process.config)
    processStatusInventory.set(process.status.id, process.status)
  }
  return responseJson
}

export { fetchProcesses, socket }
