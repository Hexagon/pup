// A periodic task with random outcome

console.log("Task starting and working ....")

if (Math.random() > 0.9) {
  throw new Error("Fatal error")
} else if (Math.random() > 0.85) {
  console.error("Not so fatal, but still error")
  Deno.exit(1)
} else {
  console.log("Finished!")
}
