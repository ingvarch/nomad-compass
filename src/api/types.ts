export type Env = {
  NOMAD_ADDR: string
  TICKET_SECRET?: string
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>
  }
}
