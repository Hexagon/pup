export async function upgrade(version?: string): Promise<void> {
  const url = version !== "latest" ? `https://deno.land/x/pup@${version}/pup.ts` : "https://deno.land/x/pup/pup.ts"

  console.log(`Checking if ${url} exists`)
  if ((await fetch(url)).status !== 200) {
    console.error(`Upgrade url ${url} does not exist`)
    Deno.exit(1)
  }

  console.info(
    `Running \`deno install -qAfr "${url}"\``,
  )

  const runner = new Deno.Command("deno", {
    args: ["install", "-qAfr", `${url}`],
  })

  runner.spawn()

  if (version === "latest") {
    console.log("Done! You are now using the latest version.")
  } else {
    console.log(`Done! You're now using '${version}'.`)
  }

  Deno.exit(0)
}
