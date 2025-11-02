/**
 * Example HTTP server that demonstrates the X-Forwarded-For header
 * when using Pup's HTTP load balancer in cluster mode
 */

const port = Deno.env.get("PUP_CLUSTER_PORT") ? parseInt(Deno.env.get("PUP_CLUSTER_PORT")!) : 8080

Deno.serve({ port, hostname: "127.0.0.1" }, (req, info) => {
  const forwardedFor = req.headers.get("X-Forwarded-For")
  const realIp = req.headers.get("X-Real-IP")
  const remoteAddr = info.remoteAddr

  // When using HTTP load balancer, the real client IP is in X-Forwarded-For
  // Without HTTP load balancer, remoteAddr would always be 127.0.0.1 (the load balancer)
  const clientIp = forwardedFor || (remoteAddr as Deno.NetAddr).hostname

  const response = {
    message: "Hello from clustered server!",
    serverPort: port,
    clientIp: clientIp,
    headers: {
      "X-Forwarded-For": forwardedFor,
      "X-Real-IP": realIp,
    },
    remoteAddr: remoteAddr,
  }

  return new Response(JSON.stringify(response, null, 2), {
    headers: {
      "Content-Type": "application/json",
    },
  })
})

console.log(`Server running on port ${port}`)
