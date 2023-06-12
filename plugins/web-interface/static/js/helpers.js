/**
 * Helper functions for rendering UI and formatting data.
 *
 * @file static/js/helpers.js
 */

/**
 * Converts ANSI color codes in text to corresponding HTML.
 * Wraps colored sections of text in <span> tags with appropriate styles.
 * Replaces line breaks with <br> for HTML display.
 *
 * @param {string} ansiText - Text containing ANSI color codes.
 * @returns {string} HTML string with color codes replaced by styles.
 */
export function ansiToHtml(ansiText) {
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

  let html = ansiText.replace(/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g, (match, p1) => {
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

  return `<span>${html}</span>`
}

/**
 * Shows elements of a specific class within a container.
 * First, hides all elements within the container.
 * Then, shows only elements of the specific class.
 *
 * @param {string} containerId - ID of the container element.
 * @param {string} targetClass - Class of the elements to show.
 */
export function showSpecificClassElements(containerId, targetClass) {
  const container = document.getElementById(containerId)
  const allChildren = container.children
  Array.from(allChildren).forEach((child) => child.classList.add("hidden"))

  const targetElements = container.getElementsByClassName(targetClass)
  Array.from(targetElements).forEach((el) => el.classList.remove("hidden"))
}

/**
 * Converts a process status code to a human-readable string.
 *
 * @param {number} status - Status code of a process.
 * @returns {string} Human-readable process status.
 */
export function ProcessStateToString(status) {
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

  const statusMapping = {
    [ProcessState.CREATED]: "Created",
    [ProcessState.STARTING]: "Starting",
    [ProcessState.RUNNING]: "Running",
    [ProcessState.STOPPING]: "Stopping",
    [ProcessState.FINISHED]: "Finished",
    [ProcessState.ERRORED]: "Errored",
    [ProcessState.EXHAUSTED]: "Exhausted",
    [ProcessState.BLOCKED]: "Blocked",
  }

  return statusMapping[status] || "Unknown"
}

/**
 * Determines a color identifier based on a process status.
 *
 * @param {number} status - Status code of a process.
 * @returns {string} Color identifier ("good", "bad", "warning", "neutral").
 */
export function getStatusColor(status) {
  switch (ProcessStateToString(status)) {
    case "Running":
      return "good"
    case "Errored":
    case "Exhausted":
      return "bad"
    case "Stopping":
    case "Blocked":
    case "Starting":
      return "warning"

    default:
      return "neutral" // Default color
  }
}
