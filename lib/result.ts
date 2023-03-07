function fatal(e?: string) {
  throw new Error("Fatal error: " + e)
}

function output(s: string, quiet?: boolean) {
  if (!quiet) console.log(s)
}

function logger(task: string, category: string, text: string) {
  return `[${new Date().toLocaleString()}] [${task}] [${category}] ${text}`;
}
export { fatal, output, logger }
