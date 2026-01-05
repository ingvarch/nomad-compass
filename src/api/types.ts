export type Env = {
  NOMAD_ADDR: string
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>
  }
}

export type Variables = {
  nomadToken?: string
}
