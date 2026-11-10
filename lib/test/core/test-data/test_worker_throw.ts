/**
 * Test worker that throws an uncaught error shortly after start
 */

setTimeout(() => {
  throw new Error("Intentional test worker error")
}, 100)
