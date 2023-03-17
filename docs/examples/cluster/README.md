---
layout: page
title: "Appendix: Cluster w/ Load balancer
---

# Example: Pup Cluster

The example at [/docs/examples/scaling](https://github.com/hexagon/pup/docs/examples/scaling] shows how to scale up an application using the clustering feature of Pup.

Detailed documentation available at [/docs/examples/scaling](hexagon.github.io/pup/scaling].

## Files

- [pup.jsonc](./pup.jsonc) - Pup configuration, sets up a process with the cluster setting, and a load balancer using round-robin at port `3456`
- [app.ts](./app.ts) - Demo http server, will be launched in three instances on ports `4000`,`4001`, and `4002`

## Running

`cd` to `/docs/examples/cluster` directory.

Run using command `pup`

Browse to `http://localhost:3456`

Success!

**Console output:**

```
[2023-03-17 20:26:36][core][processes] Cluster 'custer-example' loading
[2023-03-17 20:26:36][core][cluster] Sub-Process 'custer-example-1' loaded
[2023-03-17 20:26:36][core][cluster] Sub-Process 'custer-example-2' loaded
[2023-03-17 20:26:36][core][cluster] Sub-Process 'custer-example-3' loaded
[2023-03-17 20:26:36][custer-example][cluster] Setting up load balancer for 3 instances with common port 3456
[2023-03-17 20:26:36][custer-example-1][starting] Process starting, reason: autostart
[2023-03-17 20:26:36][custer-example-2][starting] Process starting, reason: autostart
[2023-03-17 20:26:36][custer-example-3][starting] Process starting, reason: autostart
[2023-03-17 20:26:36][custer-example-1][stdout] HTTP webserver running on pup instance 0.
[2023-03-17 20:26:36][custer-example-1][stdout] Access it at:  http://localhost:4000/
[2023-03-17 20:26:36][custer-example-2][stdout] HTTP webserver running on pup instance 1.
[2023-03-17 20:26:36][custer-example-2][stdout] Access it at:  http://localhost:4001/
[2023-03-17 20:26:36][custer-example-3][stdout] HTTP webserver running on pup instance 2.
[2023-03-17 20:26:36][custer-example-3][stdout] Access it at:  http://localhost:4002/
```
