import { createSubprocess } from "./subprocess.ts";
import { Cron } from "https://deno.land/x/croner@6.0.2/dist/croner.js";

function cronSubprocess(processConfig: undefined) {
    console.log(`Creating cron task ${processConfig.startPattern}`)
    new Cron(processConfig.startPattern, async () => {
        console.log(`Creating ${processConfig.name} subprocess by cron`)
        const code = await createSubprocess(processConfig.cwd, processConfig.cmd)
        console.log(`Subprocess ${processConfig.name} finished with code ${code.code}`)
    });
}

async function autostartSubprocess(processConfig: undefined) {
    console.log(`Starting ${processConfig.name} subprocess by autostart`)
    const code = await createSubprocess(processConfig.cwd, processConfig.cmd)
    console.log(`Subprocess ${processConfig.name} exited with code ${code.code}`)
    if (processConfig.restart === "always") {
        const delay = processConfig.restartDelayMs || 10000;
        console.log(`Subprocess ${processConfig.name} will restart in ${delay} ms`)
        setTimeout(() => autostartSubprocess(processConfig), delay );
    }
}

async function pup (config: unknown[]) {
    for(const process of config) {

        // Start using cron pattern
        if (process.startPattern) cronSubprocess(process)

        // Start instantly
        if (process.autostart) autostartSubprocess(process)
    }
}

export { pup };