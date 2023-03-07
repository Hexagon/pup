# pup

Process manager for Deno

Work in progress!

## Features

- Keep your processes alive
- Define one or multiple processes in a configuration file `pup.json`
- Start instantly, or according to a cron-pattern
- Restart according to a cron pattern
- Restart autmatically if a process exits
- Single stdout logging multiple processes

## Example

A basic example setup is available in [/examples/basic](/examples/basic)

**Running the example**

Change working dir to the example directory containg a couple of scripts and `pup.json`

```
cd /examples/basic
```

Start pup

```
deno run -A ../../pup-cli.ts
```

test.js will start instantly, and will restart automatically 10 seconds after exiting. test2.js will start every fifth second according to cron pattern `*/5 * * * * *`

### Output

```
PS \pup\examples\basic> deno run -A ../../pup-cli.ts

Creating cron task */5 * * * * *
Starting Kept-alive task subprocess by autostart
Kept alive task - Hello!
Subprocess Kept-alive task exited with code 0
Subprocess Kept-alive task will restart in 10000 ms
Creating Periodic example task subprocess by cron
Cron task - Hello!
Cron task - My working dir is  \pup\examples\basic
Subprocess Periodic example task finished with code 0
Creating Periodic example task subprocess by cron
Cron task - Hello!
Cron task - My working dir is  \pup\examples\basic
Starting Kept-alive task subprocess by autostart
Subprocess Periodic example task finished with code 0
Kept alive task - Hello!
Subprocess Kept-alive task exited with code 0      
Subprocess Kept-alive task will restart in 10000 ms
```

## Example configuration

```json
[
  {
    "name": "Periodic example task",
    "cmd": ["deno", "run", "--allow-read", "./task2.js"],
    "startPattern": "*/5 * * * * *"
  },
  {
    "name": "Kept-alive task",
    "cmd": ["deno", "run", "--allow-read", "./task1.js"],
    "autostart": true,
    "restart": "always",
    "restartDelayMs": 10000
  }
]
```
