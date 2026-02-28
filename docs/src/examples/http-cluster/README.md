# HTTP Cluster Example with X-Forwarded-For Support

This example demonstrates how to use Pup's HTTP load balancer with clustering to properly forward client IP addresses through the `X-Forwarded-For` and `X-Real-IP` headers.

## Problem

When using Pup's cluster mode with `commonPort`, the default TCP-based load balancer proxies connections at the TCP level. This means that the backend servers always see the connection coming from
`127.0.0.1` (localhost), losing the actual client IP address.

## Solution

The HTTP load balancer (`balancerType: "http"`) operates at the HTTP protocol level and automatically adds the following headers to forwarded requests:

- **`X-Forwarded-For`**: Contains the client IP address. If the header already exists, the client IP is appended to the list.
- **`X-Real-IP`**: Contains the client IP address (single value).

## Configuration

In your `pup.json`, set the `balancerType` to `"http"`:

```json
{
  "cluster": {
    "instances": 3,
    "startPort": 8080,
    "commonPort": 3000,
    "strategy": "round-robin",
    "balancerType": "http"
  }
}
```

## Running the Example

1. Start the cluster:
   ```bash
   pup run
   ```

2. Make a request to the common port:
   ```bash
   curl http://localhost:3000
   ```

3. The response will show:
   - The server port (one of 8080, 8081, or 8082)
   - Your client IP address in the `clientIp` field
   - The `X-Forwarded-For` and `X-Real-IP` headers

## Load Balancer Types

Pup supports two types of load balancers:

- **`tcp`** (default): Simple TCP proxy. Fast and protocol-agnostic, but doesn't preserve client IP.
- **`http`**: HTTP-aware proxy. Adds `X-Forwarded-For` and `X-Real-IP` headers to preserve client IP. Only works with HTTP/HTTPS traffic.

## When to Use HTTP Load Balancer

Use the HTTP load balancer when:

- Your application needs to know the real client IP address
- You're serving HTTP/HTTPS traffic
- You need to implement rate limiting, access control, or logging based on client IP
- Your application reads the `X-Forwarded-For` or `X-Real-IP` headers

Use the TCP load balancer when:

- You're proxying non-HTTP protocols (websockets, database connections, etc.)
- You don't need client IP information
- You want maximum performance with minimal overhead

## Notes

- The HTTP load balancer only works with HTTP/HTTPS traffic
- For other protocols, use an external load balancer like NGINX or HAProxy
- The `X-Forwarded-For` header can contain multiple IPs if the request passed through multiple proxies
