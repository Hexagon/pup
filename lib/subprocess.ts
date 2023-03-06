import { copy } from "https://deno.land/std@0.104.0/io/util.ts";

async function createSubprocess (workingDir: string, cmd: string[]) {

    const cat = Deno.run({
        cmd,
        cwd: workingDir,
        stdout: "piped",
        stderr: "piped",
    });

    copy(cat.stdout, Deno.stdout);
    copy(cat.stderr, Deno.stderr);

    const status = await cat.status();

    cat.stderr.close();
    cat.stdout.close();

    return status;
}

export { createSubprocess }