# Usage

## Authentication

On first access, you'll be prompted to enter your Nomad server address and
ACL token. The token is stored in an `httpOnly` cookie — JavaScript never
sees it (see [Security](security.md)).

## Managing jobs

1. **View jobs**: the jobs page shows all jobs across namespaces or within a
   selected namespace.
2. **Job details**: click on a job to view details, configurations and task
   groups.
3. **Create jobs**: use the "Create Job" button to launch the job creation
   form — containers, environment variables, networking, ports and service
   health checks are all configured there.
4. **Edit jobs**: modify job configurations through the edit interface.
5. **Manage tasks**: configure resources, environment variables and networking
   per task.

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

The namespace switcher lists every namespace your token can see. Job lists,
job creation and detail pages all follow the selected namespace.
