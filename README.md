# Nomad Compass
 
Nomad Compass provides a clean, user-friendly interface to manage your Nomad jobs, services, and resources.

## Features

- **Job Management**: Create, edit, monitor, and delete jobs
- **Container Configuration**: Configure Docker/Podman containers with ease
- **Environment Variables**: Manage environment variables
- **Network Configuration**: Configure service networking and port mappings
- **Service Health Checks**: Set up and monitor service health checks
- **Log Viewing**: View and filter logs for running containers
- **Multi-Namespace Support**: Work with multiple Nomad namespaces

## Getting Started

### Prerequisites

- Node.js 20
- A running Nomad cluster
- Nomad ACL token

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nomad-compass.git
cd nomad-compass
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory (optional):

```
NOMAD_ADDR=http://your-nomad-server:4646
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Authentication

On first access, you'll be prompted to enter your Nomad server address and token.

### Managing Jobs

1. **View Jobs**: The jobs page shows all jobs across namespaces or within a selected namespace
2. **Job Details**: Click on a job to view details, configurations, and task groups
3. **Create Jobs**: Use the "Create Job" button to launch the job creation wizard
4. **Edit Jobs**: Modify job configurations through the edit interface
5. **Manage Tasks**: Configure resources, environment variables, and networking per task

### Viewing Logs

Job detail pages include a logs section that allows:

- Selecting specific allocations
- Switching between stdout and stderr
- Auto-refreshing logs
- Manual refresh

## Deployment

### Docker

The project includes a Dockerfile for containerized deployment:

```bash
# Build the Docker image
docker build -t nomad-compass .

# Run the container
docker run -p 3000:3000 -e NOMAD_ADDR=http://your-nomad-server:4646 nomad-compass
```

### Environment Variables

- `NOMAD_ADDR`: Address of your Nomad server, defaults to `http://localhost:4646`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
