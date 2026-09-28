# Usage

## Signing in

Paste your Nomad ACL token on the login page. The Nomad address comes from
`NOMAD_ADDR` on the server (see [Configuration](configuration.md)). After
login the token lives in an `httpOnly` cookie, and JavaScript cannot read it
(see [Security](security.md)).

## Managing jobs

1. **View jobs**: the jobs page shows all jobs across namespaces or within a
   selected namespace.
2. **Job details**: click on a job to view its summary, task groups,
   versions, evaluations and logs.
3. **Create jobs**: use the "Create Job" button to open the job form —
   containers, resources, environment variables, ports, service health
   checks, private registries and Traefik ingress are all configured there.
   The plan diff is shown before the job is submitted.
4. **Edit and clone jobs**: edit a job through the same form, or clone it
   into a new one.
5. **Revert**: the Versions tab lists every version of a job and reverts to
   any of them.

## Viewing logs

Job detail pages include a logs section that allows:

- Selecting specific allocations and tasks.
- Switching between stdout and stderr.
- Auto-refreshing logs.
- Manual refresh.

## Remote exec

From an allocation you can open a terminal in a running task. The session
runs over a WebSocket relay: the browser never talks to Nomad directly, and
the ACL token never appears in a URL — short-lived HMAC-signed tickets
authorize the socket (see [Security](security.md)).

## Namespaces

The namespace switcher lists every namespace your token can see. Job lists
and detail pages follow the selected namespace. The job form starts on
`default`; pick the namespace in the form. The Namespaces page creates and
deletes namespaces.

## Access control

The ACL page manages policies (with a visual or an HCL editor), roles and
tokens.
