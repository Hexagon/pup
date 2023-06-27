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
  if (targetClass) {
    Array.from(allChildren).forEach((child) => child.classList.add("hidden"))
    const targetElements = container.getElementsByClassName(targetClass)
    Array.from(targetElements).forEach((el) => el.classList.remove("hidden"))
  } else {
    Array.from(allChildren).forEach((child) => child.classList.remove("hidden"))
  }
}
/**
 * Converts the given seconds into a string with a time unit.
 * The units used are years, days, hours, minutes, and seconds.
 *
 * @param {number} seconds - The number of seconds to convert.
 * @returns {string} The seconds converted to the appropriate unit(s), showing at most two levels.
 *
 * @example
 * // returns "1 year, 2 days"
 * formatTime(31539600);
 *
 * @example
 * // returns "3 days, 2 hours"
 * formatTime(263000);
 *
 * @example
 * // returns "3 hours, 50 minutes"
 * formatTime(13800);
 */
export function formatTime(seconds) {
  const units = [
    ["year", 31536000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ]

  let result = []
  for (let [name, value] of units) {
    if (seconds >= value) {
      let unitAmount = Math.floor(seconds / value)
      result.push(`${unitAmount} ${unitAmount > 1 ? name + "s" : name}`)
      seconds %= value
    }

    if (result.length === 2) break
  }

  return result.join(", ")
}

/**
 * Converts the given bytes into a string with a unit. The units used are Bytes, KB, MB, GB and TB.
 * The conversion is made to the smallest unit for which the value is greater than or equal to 1.
 *
 * @param {number} bytes - The number of bytes to convert.
 * @param {boolean} [printUnit=true] - Whether or not to include the unit in the returned string.
 * @param {string} [preferredUnit] - Preferred unit for the output ('Bytes', 'KB', 'MB', 'GB', 'TB').
 * @returns {string} The bytes converted to the appropriate unit, rounded to 2 decimal places, with or without its unit.
 *
 * @example
 * // returns "975 KB"
 * formatBytes(1000000);
 *
 * @example
 * // returns "0 Bytes"
 * formatBytes(0);
 *
 * @example
 * // returns "4.67 GB"
 * formatBytes(5000000000);
 */
export function formatBytes(bytes, printUnit = true, preferredUnit) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  let i = Math.floor(Math.log(bytes) / Math.log(k))

  if (preferredUnit && sizes.includes(preferredUnit)) {
    i = sizes.indexOf(preferredUnit)
  }

  const result = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
  return printUnit ? `${result} ${sizes[i]}` : `${result}`
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

/**
 * Calculate the difference between a given date and the current date and
 * format the difference as a string.
 *
 * @param {Date} date - The date to compare with the current date.
 * @returns {string} The formatted string representing the time difference.
 * The returned string will be in the format '[value] [unit] ago' if the given
 * date is in the past, or '[value] [unit] from now' if the given date is in
 * the future, where [value] is the numerical difference and [unit] is the
 * appropriate unit of time ('seconds', 'minutes', 'hours', or 'days').
 */
export function timeAgo(date) {
  const now = new Date()
  let secondsPast = (now.getTime() - date.getTime()) / 1000
  let suffix = " ago"

  if (secondsPast < 0) {
    secondsPast = -secondsPast
    suffix = " from now"
  }

  if (secondsPast < 60) {
    let value = parseInt(secondsPast)
    return value + (value === 1 ? " second" : " seconds") + suffix
  }

  if (secondsPast < 3600) {
    let value = parseInt(secondsPast / 60)
    return value + (value === 1 ? " minute" : " minutes") + suffix
  }

  if (secondsPast < 86400) {
    let value = parseInt(secondsPast / 3600)
    return value + (value === 1 ? " hour" : " hours") + suffix
  }

  let value = parseInt(secondsPast / 86400)
  return value + (value === 1 ? " day" : " days") + suffix
}
