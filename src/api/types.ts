export type Env = {
  NOMAD_ADDR: string
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>
  }
}
