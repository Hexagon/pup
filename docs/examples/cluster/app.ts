const PORT = parseInt(Deno.env.get("PUP_CLUSTER_PORT") || "8000", 10)

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn)
  for await (const requestEvent of httpConn) {
    const body = `Response from HTTP webserver running on pup instance ${Deno.env.get("PUP_CLUSTER_INSTANCE")}.`
    requestEvent.respondWith(
      new Response(body, {
        status: 200,
      }),
    )
  }
}

if (!isNaN(PORT)) {
  const server = Deno.listen({ port: PORT })
  console.log(`HTTP webserver running on pup instance ${Deno.env.get("PUP_CLUSTER_INSTANCE")}.\nAccess it at:  http://localhost:${PORT}/`)
  for await (const conn of server) serveHttp(conn)
} else {
  console.error("Could not start http server")
}
