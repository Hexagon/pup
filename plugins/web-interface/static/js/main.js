/**
 * Main entry point for the client-side JavaScript application.
 * This file is responsible for bootstrapping the application, fetching initial data,
 * generating process cards and handling UI interactions.
 *
 * main() will run after the DOM has fully loaded
 *
 * @file static/js/main.js
 */

import { changeLogScope, updateInstance, updateProcessCard } from "./ui.js"
import { controlProcess, fetchInstance, fetchProcesses } from "./network.js"
import { processSelector } from "./state.js"

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
    // Connect buttons to actions
    document.getElementById("start-process").addEventListener("click", async () => controlProcess(processSelector.get(), "start"))
    document.getElementById("stop-process").addEventListener("click", async () => controlProcess(processSelector.get(), "stop"))
    document.getElementById("block-process").addEventListener("click", async () => controlProcess(processSelector.get(), "block"))
    document.getElementById("unblock-process").addEventListener("click", async () => controlProcess(processSelector.get(), "unblock"))
    document.getElementById("restart-process").addEventListener("click", async () => controlProcess(processSelector.get(), "restart"))

    // Update instance information every 10th second, and immediately
    setInterval(async () => {
      updateInstance(await fetchInstance(), await fetchProcesses())
    }, 10_000)

    // Do an initial update
    updateInstance(await fetchInstance(), await fetchProcesses())

    document.getElementById("aside-back").addEventListener("click", async () => {
      changeLogScope()
    })
  } catch (error) {
    console.error("Failed to initialize the application:", error)
  }
}

document.addEventListener("DOMContentLoaded", main)
