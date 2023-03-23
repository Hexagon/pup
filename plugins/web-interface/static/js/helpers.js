function ansiToHtml(ansiText) {
  const ansiColorCodes = [
    { code: 30, color: "black" },
    { code: 31, color: "red" },
    { code: 32, color: "green" },
    { code: 33, color: "yellow" },
    { code: 34, color: "blue" },
    { code: 35, color: "magenta" },
    { code: 36, color: "cyan" },
    { code: 37, color: "white" },
  ]

  let html = ansiText
    .replace(/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g, (match, p1) => {
      if (!p1) return "</span>"
      const codes = p1.split(";")
      let result = "<span style='"
      codes.forEach((code) => {
        if (code === "1") {
          result += "font-weight:bold;"
        } else {
          const color = ansiColorCodes.find(({ code: colorCode }) => parseInt(code) === colorCode)
          if (color) {
            result += `color:${color.color};`
          }
        }
      })
      result += "'>"
      return result
    })
    .replace(/\n/g, "<br>")

  // Wrap the result in a default span to ensure any unclosed opening spans have matching closing tags
  return `<span>${html}</span>`
}

function showSpecificClassElements(containerId, targetClass) {
  // Get the container div
  const container = document.getElementById(containerId)

  // Hide all elements within the container
  const allChildren = container.children
  for (let i = 0; i < allChildren.length; i++) {
    allChildren[i].classList.add("hidden")
  }

  // Show elements with the specific class within the container
  const targetElements = container.getElementsByClassName(targetClass)
  for (let i = 0; i < targetElements.length; i++) {
    targetElements[i].classList.remove("hidden")
  }
}

function generateWebSocketURL() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = window.location.hostname
  const port = window.location.port ? `:${window.location.port}` : ""
  const wsURL = `${protocol}//${host}${port}/ws`
  return wsURL
}

const ProcessState = {
  CREATED: 0,
  STARTING: 100,
  RUNNING: 200,
  STOPPING: 250,
  FINISHED: 300,
  ERRORED: 400,
  EXHAUSTED: 450,
  BLOCKED: 500,
}

function ProcessStateToString(status) {
  switch (status) {
    case ProcessState.CREATED:
      return "Created"
    case ProcessState.STARTING:
      return "Starting"
    case ProcessState.RUNNING:
      return "Running"
    case ProcessState.STOPPING:
      return "Stopping"
    case ProcessState.FINISHED:
      return "Finished"
    case ProcessState.ERRORED:
      return "Errored"
    case ProcessState.EXHAUSTED:
      return "Exhausted"
    case ProcessState.BLOCKED:
      return "Blocked"
    default:
      return "Unknown"
  }
}
