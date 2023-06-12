/**
 * Main entry point for the client-side JavaScript application.
 * This file is responsible for bootstrapping the application, fetching initial data,
 * generating process cards and handling UI interactions.
 *
 * main() will run after the DOM has fully loaded
 *
 * @file static/js/main.js
 */

import { changeLogScope, updateProcessCard } from "./ui.js"
import { fetchProcesses } from "./network.js"

/**
 * Initializes the application.
 * Fetches the processes from the server, generates cards for each process,
 * and attaches these cards to the DOM. The first process is selected by default.
 *
 * @async
 * @function
 */
async function main() {
  try {
    // Make an initial request of all process status
    const processes = await fetchProcesses()

    // Generate and append process cards for each process
    processes.forEach((processData) => {
      updateProcessCard(processData)
    })

    // If there are any processes, select the first one by default
    if (processes.length > 0) {
      changeLogScope(processes[0].config.id)
    }
  } catch (error) {
    console.error("Failed to initialize the application:", error)
  }
}

document.addEventListener("DOMContentLoaded", main)
