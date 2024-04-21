/**
 * A "standard" client for the Pup Rest API
 *
 * @file lib/common/restclient.ts
 * @license MIT
 */

export class RestClient {
  private baseUrl: string // Declare the types
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl
    this.token = token
  }

  get(path: string) {
    return this.fetch(path, { method: "GET" })
  }

  // deno-lint-ignore no-explicit-any
  post(path: string, data: any) { // 'any' for flexibility on the data type
    return this.fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * @throws
   */
  // deno-lint-ignore no-explicit-any
  async fetch(path: string, options: RequestInit): Promise<any> {
    // Use RequestInit for options and allow 'any' for the response for now
    const headers = {
      "Authorization": "Bearer " + this.token,
      ...options.headers,
    }
    const response = await fetch(this.baseUrl + path, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = `Request failed: ${response.statusText}`
      throw new Error(errorText)
    }

    return response
  }
}
