const PORT = parseInt(Deno.env.get("PUP_CLUSTER_PORT") || "8000", 10)

if (!isNaN(PORT)) {
  Deno.serve({ port: PORT }, () => {
    const body = `Response from HTTP webserver running on pup instance ${Deno.env.get("PUP_CLUSTER_INSTANCE")}.`
    return new Response(body, {
      status: 200,
    })
  })
  console.log(`HTTP webserver running on pup instance ${Deno.env.get("PUP_CLUSTER_INSTANCE")}.\nAccess it at:  http://localhost:${PORT}/`)
} else {
  console.error("Could not start http server")
}
