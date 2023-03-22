export interface SplunkEvent {
  sourcetype: string
  // deno-lint-ignore no-explicit-any
  event: any
}

export class HECClient {
  constructor(private hecUrl: string, private hecToken: string) {}

  public async sendEvent(splunkEvent: SplunkEvent): Promise<void> {
    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Splunk ${this.hecToken}`,
    })

    const response = await fetch(this.hecUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(splunkEvent),
    })

    if (!response.ok) {
      console.error(
        `Failed to send event to Splunk HEC: ${response.status} ${response.statusText}`,
      )
    }
  }
}
