# Usage

## Signing in

Paste your Nomad ACL token on the login page. The Nomad address comes from
`NOMAD_ADDR` on the server (see [Configuration](configuration.md)). After
login the token lives in an `httpOnly` cookie, and JavaScript cannot read it
(see [Security](security.md)).

## Dashboard & cluster health

The dashboard provides a bird's-eye view of your Nomad cluster:

- **Cluster overview**: displays cluster status (Ready/Degraded), the active
  Raft leader, Raft peer count, Nomad version, total node counts, and active
  jobs.
- **Resource utilization**: visual progress bars show cluster-wide CPU (MHz) and
  memory (MB/GB) allocated versus total cluster capacity.
- **Stability alerts**: automatically identifies common cluster issues:
  - *Flapping tasks*: tasks trapped in frequent crash/restart loops.
  - *Failing allocations*: allocations terminated unexpectedly with errors.
  - *OOM kills*: containers killed by the kernel for exceeding memory limits.
  - *Unplaced allocations*: evaluations where the scheduler failed to place
    tasks due to constraint or resource mismatches.
- **Recent activity**: a real-time feed of recent job, node, and allocation
  state changes.

## Managing jobs

1. **View jobs**: the jobs page lists all jobs across all namespaces or within a
   selected namespace, with status badges, task counts, and job types.
2. **Job details**: click on a job to view its overview, task groups,
   allocations, versions, evaluations, and logs.
3. **Create jobs**: use the "Create Job" button to open the job form —
   containers, resources (CPU/memory), environment variables, ports, service
   health checks, private registries, and Traefik ingress tags are all
   configured visually. The plan diff is shown before the job is submitted.
4. **Edit and clone jobs**: edit a job through the same form, or clone it into
   a new one. Child jobs (dispatched jobs and periodic launches) have no Edit,
   Clone, or Start, and their edit page refuses them: Nomad drops `ParentID`
   when a job is registered again.
5. **Job actions**:
   - *Restart*: restarts all running allocations for the job in place.
   - *Stop & Purge*: stop a running job, with an optional "Purge" checkbox to
     immediately delete the job and its history from Nomad's state store.
6. **Versions and rollback**: the Versions tab lists every historical version
   of a job, displays the spec diff against the current version, and allows
   one-click reversion to any previous version.

## Periodic jobs

A periodic job is a batch job that Nomad launches on a cron schedule. Each
run is a child job, a launch, with the ID `<job>/periodic-<time>`.

1. **Create**: in the job form pick **Batch**, turn on **Run on a schedule**
   and add one or more cron expressions (`0 3 * * *`, `@daily`). With several
   expressions the job runs at the earliest match. The time zone is UTC by
   default. **Don't start a new run while the previous one is running** is on
   by default: Nomad then skips a launch while the previous run is still
   running. **Plan** shows the next launch and says that Nomad creates
   allocations at each launch. If Nomad rejects a cron expression or a time
   zone, ovoo shows Nomad's error message. For a batch job the form hides
   service discovery and the health check, unless the job already has them.
2. **Command and arguments**: **Command** on a task replaces the image `CMD`;
   the image `ENTRYPOINT` still runs. In **Arguments**, put one argument per
   row, without shell quoting. Nomad replaces `${...}` references in them.
3. **Job page**: the Schedule card shows the cron expressions, the time zone,
   the overlap setting, the state (Active, Paused or Stopped) and the next
   and last launch, and updates both on its own after each launch.
   **Run now** starts a launch right away; it works only while the schedule
   is active. **Pause** and **Resume** turn the schedule off and on. Each one
   creates a new job version, which the Versions tab shows and can revert.
   Both are disabled while the job is stopped. A periodic job has no
   allocations of its own, so its page has the Overview, Launches, Versions
   and Evaluations tabs. Logs and exec are on the launch pages.
4. **Launches**: the Launches tab lists the launches newest first, with their
   status and allocation counts. A launch page links back to its job and has
   no Edit, Clone or Start. The jobs list hides launches and marks periodic
   jobs with a `periodic` badge. The job counts on the Dashboard and the
   Namespaces page skip launches. Nomad removes finished launches during
   garbage collection (`job_gc_threshold`, 4 hours by default).

Nomad does not allow changing the job type or turning the schedule on or off
for an existing job, so the edit form locks both. A clone of a periodic job
starts with an active schedule. The form makes service and batch jobs, so a
clone of a sysbatch or system job creates a service job; for a periodic
sysbatch job Nomad rejects that clone.

## Viewing logs

Job detail and allocation pages include a logs viewer:

- Select specific allocations and tasks.
- Switch between `stdout` and `stderr` streams.
- Auto-refresh logs at regular intervals or trigger a manual refresh.
- Monospace output with full dark/light theme contrast.

## Remote exec

From any running allocation, open an interactive terminal into a task
container:

- Runs over a WebSocket relay: the browser never contacts Nomad directly, and
  the ACL token stays safe in an `httpOnly` cookie.
- Authorized through short-lived HMAC-signed tickets (see [Security](security.md)).
- On mobile devices, an accessory bar provides essential keys (`ESC`, `TAB`,
  `Ctrl+C`, `Ctrl+D`, arrows, and clear) and adjusts to the on-screen keyboard.

## Allocations & failure analysis

- **All allocations**: view and filter allocations across all jobs, nodes, and
  namespaces by status (Running, Pending, Complete, Failed).
- **Failed allocations**: a dedicated triage page (`/allocations/failed`) that
  classifies errors:
  - Non-zero exit codes.
  - Out-of-memory (OOM) container terminations.
  - Task startup/driver failures.
  - Lost nodes and network partition disconnects.
  - Placement failures caused by exhausted node resources.
- **Quick exec**: launch a remote terminal directly from any allocation row
  or card without navigating to the job details first.

## Cluster topology

The Topology page (`/topology`) renders a structural map of the cluster:

- Grouped by Datacenter.
- Displays each client node with its status, IP, role, and allocation counts.
- Shows real-time CPU and memory allocation percentage bars per node.
- Expandable node cards reveal running tasks and allow direct navigation to
  jobs and allocations.

## Nodes & node maintenance

The Nodes page (`/nodes`) and node detail pages provide node administration:

- **Node information**: lists hostname, IP address, datacenter, Nomad version,
  OS, kernel release, and active task drivers (Docker, exec, etc.).
- **Drain mode**: gracefully drain allocations from a node prior to reboots or
  upgrades. Set a drain deadline (force eviction after timeout) and choose
  whether to preserve system jobs.
- **Scheduling eligibility**: toggle a node between `eligible` and `ineligible`
  to prevent new tasks from being scheduled on it without disturbing existing
  workloads.
- **Resource breakdown**: inspect allocated vs. total CPU, memory, and disk
  capacity for individual nodes.

## Servers & Raft consensus

The Servers page (`/servers`) monitors the Nomad control plane:

- **Server agents**: lists all Nomad server instances, protocol version, IP
  address, and voting membership status.
- **Raft leader**: highlights the current cluster leader.
- **Autopilot health**: displays Autopilot status, overall consensus health,
  failure tolerance (how many servers can fail without losing quorum), and
  cluster redundancy.

## Activity log

The Activity page (`/activity`) serves as an audit trail for cluster events:

- Filter events by category (Jobs, Allocations, Nodes, Evaluations) and
  namespace.
- Inspect scheduler evaluation results, placement decisions, and reasons why
  nodes were considered or disqualified during placement.

## Namespaces

The namespace switcher in the top navigation lists every namespace your token
is permitted to access. Job lists, allocations, and detail views filter by the
active namespace.

- The job form defaults to `default`; you can switch target namespaces inside
  the form.
- The Namespaces page (`/namespaces`) lists all namespaces, showing active job
  counts, and allows creating and deleting namespaces.

## Access control (ACL)

The ACL management interface (`/acl`) provides tools for securing your
cluster (requires management token permissions):

- **Visual policy editor**: construct Nomad HCL policies with an intuitive
  point-and-click interface. Select granular permissions across namespaces,
  host volumes, CSI plugins, agents, and operator controls.
- **HCL policy editor**: write and edit raw Nomad HCL policies directly, with
  instant syntax validation.
- **Roles**: group multiple policies into reusable ACL roles for consistent
  role-based access management.
- **Tokens**: create Client or Management tokens, assign policies and roles,
  configure TTL expiration, view the secret ID upon generation, and revoke
  compromised or obsolete tokens.
- **Bootstrap support**: detects unbootstrapped ACL systems and guides initial
  setup.

## Mobile & Progressive Web App (PWA)

ovoo is designed mobile-first and can be installed as a Progressive Web App:

- **Installation**: Tap the **Install** banner on Chromium/Android browsers, or
  use **Share** → **Add to Home Screen** on iOS Safari. Once installed, ovoo
  runs in full-screen standalone mode without browser chrome.
- **Mobile navigation**: Quickly navigate between Dashboard, Jobs, Topology,
  and Activity via the fixed bottom navigation bar. Additional links and settings
  are accessed through the "More" bottom sheet.
- **Adaptive card views**: Data tables automatically switch to touch-optimized
  cards on smaller viewports, with swipeable tab bars and floating action buttons.
- **Mobile remote terminal**: The web terminal provides an accessory bar with
  common mobile keys (`ESC`, `TAB`, `Ctrl+C`, `Ctrl+D`, arrows, and clear) and
  dynamically responds to the virtual keyboard viewport.
