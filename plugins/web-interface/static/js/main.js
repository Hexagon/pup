import { changeLogScope, generateProcessCard } from "./ui.js"
import { fetchProcesses } from "./network.js"

// Main function to initialize the application
async function main() {
  // Make an initial request of all process status/
  const processes = await fetchProcesses()
  processes.forEach((processData) => {
    const processCard = generateProcessCard(processData)
    document.getElementById("processes").appendChild(processCard)
  })
  if (processes.length > 0) {
    // Select the first process by default
    changeLogScope(processes[0].config.id)
  }
}

main()
