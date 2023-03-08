console.log("Server is running!")

// Create a fatal error after 10 seconds, to demostrate the restart function
setTimeout(() => {
  throw new Error("Server failed")
}, 10000)
