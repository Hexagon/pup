---
layout: page
title: " 6. Scaling applications"
---

# 6. Scaling applications

---

Pup supports scaling of processes using the `cluster` key in the process configuration. This manual will cover the configuration pattern, how application scaling works, the supported load balancing
strategies, and how and when to use built in load balancing.

Example available in the GitHub Repository at [/docs/examples/cluster](https://github.com/Hexagon/pup/tree/main/docs/examples/cluster)

## Clustering

```json
{
  "processes": [
    {
      "id": "my-scalable-app",
      "cmd": ["deno", "run", "--allow-net", "server.ts"],
      "cluster": {
        "instances": 4,
        "commonPort": 3000,
        "startPort": 8000,
        "strategy": "round-robin"
      }
    }
  ]
}
```

In this example, Pup will start 4 instances of the process with the ID `my-scalable-app`. The configuration properties are as follows:

- `id`: A unique identifier for the process.
- `cmd`: The command to run, arranged as an array of strings
- `cluster`: An object containing the settings for the cluster of processes
  - `instances`: The number of instances to be started for the process.
  - `startPort`: The starting port number for the individual process instances.
  - `commonPort` (optional): Sets the port for the load balancer. **Omitting this entry disables the built in load balancer**
  - `strategy` (optional): Strategy for the load balancer, default is 'round-robin', an alternative is 'ip-hash'

Each process will have two additional environment variables set

- `PUP_CLUSTER_INDEX`: Index of the current instance, starting from `0`
- `PUP_CLUSTER_PORT`: The port to listen at, will be set to `startPort + n`, in this example `8000` for instance `0`, `8001` for instance `1` etc.

## Load Balancing

> **Note** The load balancer is optional, read more below.

The load balancer is enabled by supplying `commonPort` value in the cluster configuration. This port will be the single port end users ill access your application at. Omitting this entry disables the
load balancer.

Without the load balancer, you will have to set up an external load balancer, such as NGINX, pointing directly at the port specified by `startPort`. The port for the additional instances will be
`startPort + n`.

### Built-in vs External Load Balancer

Pup's load balancer is suitable for small applications and development environments, as it offers simplicity and ease of setup. However, for larger applications and production environments, it is
recommended to use an external, more robust load balancer, such as NGINX.

For larger applications and production environments, a dedicated load balancer like NGINX offers a more robust and feature-rich solution. Some advantages of using a dedicated load balancer like NGINX
include:

- Improved performance: NGINX is designed to handle a high number of simultaneous connections, offering better performance and stability.
- Advanced load balancing algorithms: In addition to round-robin and ip-hash, NGINX supports various load balancing algorithms, such as least connections, and least time.
- SSL termination: NGINX can handle SSL termination, offloading encryption and decryption tasks from application servers.
- Caching and compression: NGINX provides caching and compression capabilities, reducing the load on application servers and improving response times.

To use Pup's process scaling with an external load balancer like NGINX, you would configure the load balancer to distribute incoming requests to the different instances of your application, using the
`processStartPort` value as a starting point for the backend server ports.

Pup supports two load balancing strategies:

1. **round-robin**: The default strategy, where incoming connections are distributed sequentially among available instances.
2. **ip-hash**: Incoming connections are distributed based on the hash of the client's IP address. This ensures that clients with the same IP address are consistently directed to the same instance.

### Ip-hash for Stateful Applications

For stateful applications, the ip-hash strategy is often a better choice than the round-robin strategy. This is because stateful applications maintain information about client sessions, and directing
a client to a different instance may result in a loss of session data.

The ip-hash strategy mitigates this issue by consistently directing clients with the same IP address to the same instance. However, this strategy is not perfect, as it may cause uneven load
distribution when a large number of clients share the same IP address, for example, when clients are behind a proxy server or a NAT device.

## Scaling Processes

> **Warning** This feature is not yet implemented

During operations, the number of instances for a process can be increased or decreased using command-line options. For example, to change the number of instances for `my-scalable-app` to 6, use the
following command:

    pup --id my-scalable-app --instances 6

Pup will automatically adjust the number of instances to the specified value. Each instance will receive a unique identifier in the format `my-scalable-app-<n>`, where `<n>` is a sequential integer
starting from 1.
