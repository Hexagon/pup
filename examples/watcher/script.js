console.log("Script running (for about an hour, if nothing else happens)...")
console.log("Any changes to script.js will cause this process to restart")

// Wait an hour
setTimeout(() => {
  console.log("Ok, exiting!")
}, 1000 * 60 * 60)
