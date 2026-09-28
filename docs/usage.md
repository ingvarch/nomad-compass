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
   into a new one. Dispatched jobs, like launches of periodic jobs, have no
   Edit, Clone or Start: Nomad drops `ParentID` when a job is registered
   again, so edit the parent job instead.
5. **Revert**: the Versions tab lists every version of a job and reverts to
   any of them.

## Periodic jobs

A periodic job is a batch job that Nomad launches on a cron schedule. Each
run is a child job, a launch, with the ID `<job>/periodic-<time>`.

1. **Create**: in the job form pick **Batch**, turn on **Run on a schedule**
   and add one or more cron expressions (`0 3 * * *`, `@daily`). With several
   expressions the job runs at the earliest match. The time zone is UTC by
   default. **Don't start a new run while the previous one is running** is on
   by default: Nomad then skips a launch while the previous run is still
   running. **Plan** shows the next launch. If Nomad rejects a cron
   expression or a time zone, ovoo shows Nomad's error message. For a batch
   job the form hides service discovery and the health check, unless the job
   already has them.
2. **Command and arguments**: **Command** on a task replaces the image `CMD`;
   the image `ENTRYPOINT` still runs. In **Arguments**, put one argument per
   row, without shell quoting. Nomad replaces `${...}` references in them.
3. **Job page**: the Schedule card shows the cron expressions, the time zone,
   the overlap setting, the state (Active, Paused or Stopped) and the next
   and last launch. **Run now** starts a launch right away; it works only
   while the schedule is active. **Pause** and **Resume** turn the schedule
   off and on. Each one creates a new job version, which the Versions tab
   shows and can revert. Both are disabled while the job is stopped. A
   periodic job has no allocations of its own, so its page has the Overview,
   Launches, Versions and Evaluations tabs. Logs and exec are on the launch
   pages.
4. **Launches**: the Launches tab lists the launches newest first, with their
   status and allocation counts. A launch page links back to its job and has
   no Edit, Clone or Start. The jobs list hides launches and marks periodic
   jobs with a `periodic` badge. The job counts on the Dashboard and the
   Namespaces page skip launches. Nomad removes finished launches during
   garbage collection (`job_gc_threshold`, 4 hours by default).

Nomad does not allow changing the job type or turning the schedule on or off
for an existing job, so the edit form locks both. A clone of a periodic job
starts with an active schedule. The form makes service and batch jobs, so a
clone of a sysbatch or system job creates a service job.

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
