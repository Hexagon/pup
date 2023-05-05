// http_worker.ts

import { serve } from "https://deno.land/std/http/server.ts"

/**
 * Sends a log message through the logger facility.
 * @param type - The type of log message, either "stdout" or "stderr".
 * @param message - The log message to send.
 */
function log(type, message) {
  globalThis.postMessage({ type, message })
}

/**
 * Sends an exit message indicating the worker has finished or encountered an error.
 * @param code - The exit code of the worker, 0 for success and 1 for errors.
 * @param success - A boolean indicating whether the worker finished successfully.
 */
function exit(code, success) {
  globalThis.postMessage({ type: "exit", code, signal: null, success })
}

/**
 * Starts the HTTP server with the specified port.
 * @param port - The port to start the HTTP server on.
 */
function runServer(port) {
  log("stdout", `HTTP server starting...\n`)

  const server = serve((request) => {
    const body = `Your user-agent is:\n\n${request.headers.get("user-agent") ?? "Unknown"}`

    return new Response(body, { status: 200 })
  }, {
    port,
    onListen({ port, hostname }) {
      log("stdout", `Server started at http://${hostname}:${port}`)
    },
  })

  return server
}

self.onmessage = async (event) => {
  const { run, _cmd, _cwd, env } = event.data

  if (run) {
    try {
      const port = parseInt(env.PORT)
      await runServer(port)

      // Send exit message if the server finishes
      exit(0, true)
    } catch (error) {
      // Send error log message
      log("stderr", `HTTP server error: ${error.message}\n`)

      // Send exit message if an error occurs
      exit(1, false)
    }
  }
}
