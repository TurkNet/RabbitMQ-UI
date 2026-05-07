# RabbitMQ Dashboard

Modern, single-container based, highly secure RabbitMQ Multi-Cluster Management and Monitoring Interface.

## Features

- **Single Container Architecture:** No Nginx or Supervisord required. Both Frontend (React/Vite) and Backend (Express) run in a single lightweight Node.js process.
- **Security Oriented (Vault/Pipeline Ready):** Includes SSRF protection, credential encryption using AES-256-GCM, and DNS-based internal IP validation. The application follows the Fail-Fast principle and refuses to start with missing security configurations.
- **Configurable Admin Mode:** Support for both read-only monitoring and optional management mode. Admin features (adding/deleting clusters via UI) are gated by the `ENABLE_ADMIN` flag and protected by JWT authentication.
- **Dynamic Multi-Cluster Support:** Clusters can be defined using individual `CLUSTER_X` environment variables, making it perfect for CI/CD pipelines.
- **Premium Glassmorphism UI:** A modern user experience with Light/Dark mode support, built with advanced Tailwind CSS.
- **OKD / OpenShift Compatible:** Designed for secure deployment in Kubernetes/OpenShift (OKD) environments; stateless design with no persistent volume (PVC) requirement.

---

## Environment Variables

For the application to run securely, the following variables must be provided via `.env` file, ConfigMap, or secret manager (e.g., Vault).

| Variable Name               | Description                                                                                  | Required?                        |
| --------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| `ENCRYPTION_KEY`            | Used for encrypting cluster credentials in memory. (Recommended: 32+ characters)             | **Yes**                          |
| `ENABLE_ADMIN`              | Enables/Disables Admin features (Login, Add/Delete clusters via UI).                         | No (Default: `false`)            |
| `ADMIN_PASSWORD`            | Password for Admin Login.                                                                    | **Yes** (if `ENABLE_ADMIN=true`) |
| `JWT_SECRET`                | Secret key used to sign JWT tokens for API protection.                                       | **Yes** (if `ENABLE_ADMIN=true`) |
| `CLUSTER_1`, `CLUSTER_2`... | Individual cluster definitions in JSON format.                                               | No                               |
| `CLUSTERS_JSON`             | Legacy format: A JSON array string containing a list of clusters.                            | No                               |
| `ALLOW_LOCAL_CLUSTERS`      | Bypasses SSRF protection to allow requests to local network IPs (localhost, 10.x.x.x, etc.). | No (Default: `false`)            |

### Cluster Configuration Format

Clusters can be defined individually for easier pipeline management:

```env
CLUSTER_1='{"name": "Prod Cluster", "url": "http://rabbit_ip:15672", "username": "admin", "password": "rabbitmq_password"}'
CLUSTER_2='{"name": "Test Cluster", "url": "http://rabbit_ip2:15672", "username": "guest", "password": "password123"}'
```

Alternatively, the legacy `CLUSTERS_JSON` format is still supported:

```env
CLUSTERS_JSON='[{"name": "Prod", "url": "..."}, {"name": "Test", "url": "..."}]'
```

---

## Getting Started

### Running with Docker / Podman

The project is optimized for container environments using a multi-stage Dockerfile.

1. Create a `.env` file in the project root:

```env
# Security
ENCRYPTION_KEY=my_super_secure_32_character_encryption_key_123

# Admin Mode (Optional)
ENABLE_ADMIN=true
ADMIN_PASSWORD=secure_admin_pass
JWT_SECRET=secure_jwt_secret

# Clusters
CLUSTER_1='{"name":"Local-MQ","url":"http://192.168.1.100:15672","username":"guest","password":"guest"}'
ALLOW_LOCAL_CLUSTERS=true
```

2. Build and run the image:

**With Podman:**

```bash
podman build -t rabbit-ui:latest .
podman run -d -p 3001:3001 --env-file .env --name rabbit-ui-container rabbit-ui:latest
```

**With Docker:**

```bash
docker build -t rabbit-ui:latest .
docker run -d -p 3001:3001 --env-file .env --name rabbit-ui-container rabbit-ui:latest
```

3. Access the dashboard:
   `http://localhost:3001`

### Deployment on OKD / OpenShift

This application runs on OpenShift / OKD without requiring any persistent storage.

1. Inject your configuration variables (`CLUSTER_X`, `ENCRYPTION_KEY`, etc.) securely using Secrets or ConfigMaps.
2. The Node.js backend serves the application on port 3001.
3. No PVC is required as the application is entirely stateless.

---

## Local Development

To run the project locally for development:

```bash
# Initial Setup: Install dependencies
npm install --prefix server
npm install --prefix client

# Terminal 1 - Start Backend (port: 3001)
cd server
npm run dev

# Terminal 2 - Start Frontend (port: 5173)
cd client
npm run dev
```

- During development, the `client` runs on port 5173 and proxies requests to `http://localhost:3001`.
- The frontend uses Tailwind CSS for styling and Zustand for state management.
