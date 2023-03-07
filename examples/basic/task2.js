
if (Math.random()>0.9) {
    throw new Error("Fatal error");
} else if (Math.random()>0.9) {
    console.error("Not so fatal, but still error.");
    Deno.exit(1);
} else {
    console.log("Cron task - Hello!")
    console.log("Cron task - My working dir is ", Deno.cwd())
}
