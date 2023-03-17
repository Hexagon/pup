---
layout: page
title: 5. Scaling applications
---

# 5. Scaling applications

***

Pup is a process manager that supports scaling of processes through a JSON configuration pattern. This manual will cover the configuration pattern, process scaling, and the supported load balancing strategies, as well as the advantages of using the source-ip-hash strategy for stateful applications.

## Configuration Pattern

Pup uses a JSON configuration pattern to define how processes should be scaled. An example configuration is shown below:

```json
{
  "processes": [
    {
      "id": "my-scalable-app",
      "cmd": ["deno","run","--allow-net","server.ts"],
      "cluster": {
        "instances": 4,
        "commonPort": 3000,
        "startPort": 8000,
        "strategy": "round-robin"
      },
      "loadBalancerStrategy": "round-robin"
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
  - `commonPort`: Sets the port for, and enables, the load balancer
  - `strategy`: Strategy for the load balancer, default is 'round-robin', an alternative is 'source-ip-hash'

## Scaling Processes

During operations, the number of instances for a process can be increased or decreased using command-line options. For example, to change the number of instances for `my-scalable-app` to 6, use the following command:

    pup --id my-scalable-app --instances 6

Pup will automatically adjust the number of instances to the specified value. Each instance will receive a unique identifier in the format `my-scalable-app-<n>`, where `<n>` is a sequential integer starting from 1.

## Load Balancing Strategies

Pup supports two load balancing strategies:

1. **Round-robin**: The default strategy, where incoming connections are distributed sequentially among available instances.
2. **Source-ip-hash**: Incoming connections are distributed based on the hash of the client's IP address. This ensures that clients with the same IP address are consistently directed to the same instance.

## Source-ip-hash for Stateful Applications

For stateful applications, the source-ip-hash strategy is often a better choice than the round-robin strategy. This is because stateful applications maintain information about client sessions, and directing a client to a different instance may result in a loss of session data.

The source-ip-hash strategy mitigates this issue by consistently directing clients with the same IP address to the same instance. However, this strategy is not perfect, as it may cause uneven load distribution when a large number of clients share the same IP address, for example, when clients are behind a proxy server or a NAT device.

## Built-in vs External Load Balancer

Pup's load balancer is suitable for small applications and development environments, as it offers simplicity and ease of setup. However, for larger applications and production environments, it is recommended to use an external, more robust load balancer, such as NGINX.

For larger applications and production environments, a dedicated load balancer like NGINX offers a more robust and feature-rich solution. Some advantages of using a dedicated load balancer like NGINX include:

- Improved performance: NGINX is designed to handle a high number of simultaneous connections, offering better performance and stability.
- Advanced load balancing algorithms: In addition to round-robin and source-ip-hash, NGINX supports various load balancing algorithms, such as least connections, and least time.
- SSL termination: NGINX can handle SSL termination, offloading encryption and decryption tasks from application servers.
- Caching and compression: NGINX provides caching and compression capabilities, reducing the load on application servers and improving response times.

To use Pup's process scaling with an external load balancer like NGINX, you would configure the load balancer to distribute incoming requests to the different instances of your application, using the `processStartPort` value as a starting point for the backend server ports.
