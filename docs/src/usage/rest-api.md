---
title: "Rest API"
parent: Usage
nav_order: 7
---

# REST API Reference

## Getting Started

### Authentication

The Pup REST API employs JWT (JSON Web Token) authentication to secure its endpoints. Before proceeding, you'll need to acquire a valid JWT. This is done by running
`pup token --consumer <consumer-name>` at the command line, you can also provide `--expire-in <seconds>`.

A token can be revoked through the api section of `pup.json`.

**Authorization Header**

Include your JWT in the `Authorization` header for every API request:

```
Authorization: Bearer <your_jwt_token>
```

### Base URL

The base URL for all Pup REST API endpoints is as follows. Replace `hostname` and `port` with the actual values where your Pup REST API is running.

```
http://hostname:port
```

## Endpoints

### Process Management

- **GET /processes** Retrieves a list of all managed processes and their current states.

- **POST /processes/{id}/start** Starts a process with the specified ID.

- **POST /processes/{id}/stop** Stops a process with the specified ID.

- **POST /processes/{id}/restart** Restarts a process with the specified ID.

- **POST /processes/{id}/block** Blocks a process with the specified ID, preventing automatic restarts.

- **POST /processes/{id}/unblock** Unblocks a previously blocked process with the specified ID.

### Application State

- **GET /state** Fetches the current overall state of the Pup application

### Telemetry

- **POST /telemetry** Submits telemetry data to the Pup main instance.

### Logging

- **POST /log** Sends a log message to the Pup instance.

- **GET /logs** Retrieves logs, supporting filtering by criteria such as process ID, severity, and timeframe.

### Termination

- **POST /terminate** Initiates a shutdown of the Pup application

## Error Handling

The Pup REST API uses standard HTTP status codes to communicate success or failure of requests. Common error codes include:

- **400 (Bad Request):** Invalid input data or request syntax.
- **401 (Unauthorized):** Missing or invalid JWT.
- **403 (Forbidden):** The provided JWT lacks required permissions.
- **500 (Internal Server Error):** Unexpected errors on the server side.

## Example Usage (JavaScript)

```javascript
const response = fetch("/api/processes", {
  headers: {
    "Authorization": "Bearer your_jwt_token",
  },
})
const responseData = await response.json()
console.log(responseData)
```

**Note:** Replace `your_jwt_token` with your actual JWT.
