export type Env = {
  NOMAD_ADDR: string
  TICKET_SECRET?: string
  ALLOWED_ORIGINS?: string
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>
  }
}
