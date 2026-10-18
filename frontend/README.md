# Multi-Environment Ticket Management Deployment

Docker Compose deployment of a React frontend, development and production Flask backends, and MongoDB.

**Repository:** https://github.com/prads31-pixel/multienv-deployment-pradnya

## Quick start

Install and start Docker Desktop with Linux containers enabled, then run:

```bash
git clone https://github.com/prads31-pixel/multienv-deployment-pradnya.git
cd multienv-deployment-pradnya
```

Create `backend/dev/.env`:

```dotenv
PORT=3001
MONGO_URI=mongodb://mongodb:27017/tickets_dev
```

Create `backend/prod/.env`:

```dotenv
PORT=3002
MONGO_URI=mongodb://mongodb:27017/tickets_prod
```

Then build and start:

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Open http://localhost:3000/ after the backends are healthy.

## Prerequisites and environment

- Git.
- Docker Desktop with the Docker Compose v2 plugin, using Linux containers. On Windows, enable the WSL 2 backend where supported.
- Internet access to download container images and Python/npm dependencies.
- Available host ports: 3000, 3001, and 3002.
- Suggested local allocation: 2 or more CPU cores and 4 GB or more memory for Docker; the React build may need additional memory.

Python and Node.js run inside build/runtime containers; host installation is unnecessary.

Record actual host OS, CPU, RAM allocation, Docker version, and Compose version in the submission evidence. The resource values above are suggestions, not measured specifications.

```bash
docker version
docker compose version
```

## Project structure

```text
multienv-deployment-pradnya/
├── docker-compose.yml
├── README.md
├── .gitignore
├── backend/
│   ├── dev/
│   │   ├── app.py
│   │   ├── templates/
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── .env                 # local only
│   └── prod/
│       ├── app.py
│       ├── templates/
│       ├── requirements.txt
│       ├── Dockerfile
│       ├── .dockerignore
│       └── .env                 # local only
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── screenshots/                # add actual evidence
└── submission/
    └── submission-info.txt
```

If the Compose file is named `compose.yml`, Compose also discovers it automatically. Keep one authoritative Compose file.

## Services and deployment design

| Service | Container runtime | Host port | Purpose |
| --- | --- | --- | --- |
| frontend | NGINX, with React built in a Node.js build stage | 3000 → 80 | Dashboard, React routes, API proxy |
| backend-dev | Python 3.11, Flask development server | 3001 → 3001 | Development ticket management |
| backend-prod | Python 3.11, Gunicorn | 3002 → 3002 | Production environment ticket management |
| mongodb | MongoDB 7.0 | Not published | Persistent ticket storage |

All services share the Compose bridge network `ticket-network`. Docker normally prefixes the network and volume names with the Compose project name.

- MongoDB is resolved by its service name `mongodb` inside the network.
- Development uses `tickets_dev`; production uses `tickets_prod`.
- Both databases share one MongoDB instance for this local assessment.
- The named volume `mongodb-data` retains data across container recreation.
- MongoDB has a ping health check. Backend health checks call `/api/tickets`, checking the application and database read path.
- Compose starts the backends after MongoDB becomes healthy, then the frontend after both backends become healthy.
- Production uses Gunicorn rather than the Flask development server.
- React is built once into static files, so Node.js is absent from the final NGINX image.

### Browser and API routing

React must use relative API URLs in `frontend/src/pages/Tickets.js`:

```javascript
const apiUrl =
  env === "dev" ? "/api/dev/tickets" : "/api/prod/tickets";
```

NGINX forwards requests as follows:

| Browser request on port 3000 | Internal destination |
| --- | --- |
| `/api/dev/tickets` | `http://backend-dev:3001/api/tickets` |
| `/api/prod/tickets` | `http://backend-prod:3002/api/tickets` |

The browser does not resolve Docker service names. NGINX resolves them within the Docker network. Its SPA fallback, `try_files $uri $uri/ /index.html`, supports direct access and refresh on `/dev` and `/prod`.

## Dependencies

The backend requirements include Flask, flask-cors, python-dotenv, PyMongo, Flask-PyMongo, and Gunicorn. Frontend dependencies include React, React Router, Axios, and react-scripts. Refer to the committed requirements files and package manifest for exact versions; commit the npm lockfile when available.

## Step-by-step deployment

1. Clone the repository and start Docker Desktop.
2. Create the two backend environment files shown in Quick start. Keep them out of Git; sample values are documented here.
3. Confirm every service declares `ticket-network`, and the MongoDB service name matches the URI hostname.
4. Confirm React uses the relative API paths above and the frontend contains `nginx.conf`.
5. Validate and deploy:

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

6. Inspect startup logs:

```bash
docker compose logs --tail=100 mongodb backend-dev backend-prod frontend
```

7. Complete the functional tests below and capture evidence.

### Access URLs

| Function | Local URL |
| --- | --- |
| Dashboard | http://localhost:3000/ |
| React development tickets | http://localhost:3000/dev |
| React production tickets | http://localhost:3000/prod |
| Development management form | http://localhost:3001/ |
| Production management form | http://localhost:3002/ |
| Development API | http://localhost:3001/api/tickets |
| Production API | http://localhost:3002/api/tickets |
| Development API via NGINX | http://localhost:3000/api/dev/tickets |
| Production API via NGINX | http://localhost:3000/api/prod/tickets |

The original assignment/README has inconsistent URLs. `/dev` and `/prod` are React routes on port 3000. Flask management pages use `/` on ports 3001 and 3002. The dashboard port is 3000.

## Testing and verification

The following are verification procedures and expected results, not a claim that every check has passed. Add actual screenshots and results before submission.

### 1. Container status

```bash
docker compose ps
```

Expected: all four services running; MongoDB and both backends healthy.

### 2. API and proxy checks

On Windows PowerShell, use `curl.exe` explicitly:

```powershell
curl.exe -f http://localhost:3001/api/tickets
curl.exe -f http://localhost:3002/api/tickets
curl.exe -f http://localhost:3000/api/dev/tickets
curl.exe -f http://localhost:3000/api/prod/tickets
```

On Linux/macOS, use `curl -f` with the same URLs. Expected: JSON containing `tasks` and the appropriate `environment` value, Development or Production. An empty tasks array is valid before creating data.

### 3. Ticket operations and environment separation

1. Open the development management form on port 3001 and create a uniquely named development ticket.
2. Refresh `http://localhost:3000/dev`; confirm the ticket appears.
3. Confirm the ticket is absent from `http://localhost:3000/prod`.
4. Create a different ticket using the production management form on port 3002 and verify it appears only in the production view.
5. Complete a ticket using its backend form; refresh React and confirm its column changes.
6. Delete the test ticket through its backend form and confirm its removal after refreshing React.
7. Refresh `/dev` and `/prod` directly to verify NGINX SPA fallback.

React displays tickets; ticket creation and modification use the Flask pages. Refresh React to retrieve updated data.

### 4. Internal network and database connectivity

```bash
docker compose exec backend-prod python -c "import socket; print(socket.gethostbyname('mongodb'))"
docker compose exec backend-prod python -c "from app import mongo; print(mongo.cx.admin.command('ping'))"
docker compose exec backend-dev python -c "from app import mongo; print(mongo.cx.admin.command('ping'))"
```

Expected: an internal MongoDB IP and successful ping responses containing `ok: 1.0`.

### 5. Persistence

Create a ticket, then run:

```bash
docker compose down
docker compose up -d
```

Confirm the ticket remains. Do not add `-v`, which removes the named volume and its database data.

## Screenshots and evidence

Create `screenshots/` and add actual captures using these filenames. The entries below are planned evidence locations; screenshots are not bundled with this README. After capturing each image, embed it using `![Description](screenshots/filename.png)`.

| Evidence filename | Capture |
| --- | --- |
| `01-environment.png` | Host environment details, Docker and Compose versions |
| `02-containers.png` | `docker compose ps` and/or `docker ps` showing running services |
| `03-dashboard.png` | Dashboard with URL visible |
| `04-development.png` | Development React view with a test ticket |
| `05-production.png` | Production React view with a different test ticket |
| `06-backend-forms.png` | Backend management forms |
| `07-api-responses.png` | Direct and proxied API responses |
| `08-service-logs.png` | Successful API requests in service logs |
| `09-connectivity.png` | Docker DNS lookup and MongoDB ping tests |
| `10-persistence.png` | Ticket retained after container recreation |

Avoid including credentials or unrelated personal information in captures. EC2 evidence is unnecessary for the local deployment option.

## Troubleshooting

### Image download fails: CloudFront hostname cannot resolve

Observed error: `lookup production.cloudfront.docker.com: no such host`.

Check host DNS/network access, VPN restrictions, and any required Docker Desktop proxy configuration. Restart Docker Desktop and retry pulls individually:

```bash
docker pull python:3.11-slim
docker pull node:22-bookworm-slim
docker pull nginx:stable-alpine
```

### React build fails: Environment key jest/globals is unknown

Observed during `npm run build`. In `frontend/package.json`, retain the application lint preset and remove the problematic test preset:

```json
"eslintConfig": {
  "extends": ["react-app"]
}
```

Then rebuild with `docker compose up --build -d`. This keeps React application linting enabled; Jest-specific lint configuration can be repaired separately if required.

### Backend unhealthy / MongoDB name resolution fails

Inspect the actual error:

```bash
docker compose logs --tail=100 backend-dev backend-prod
docker compose ps -a
docker compose exec backend-prod python -c "import socket; print(socket.gethostbyname('mongodb'))"
```

If a container lacks a network attachment despite correct Compose configuration, recreate the backends:

```bash
docker compose up -d --no-deps --force-recreate backend-dev backend-prod
docker compose up -d
```

If needed, recreate the Compose network with `docker compose down` followed by `docker compose up -d`. Preserve the data volume by omitting `-v`. Recheck connectivity and health before declaring the issue resolved.

### Frontend remains stopped

It waits for both backend health checks. Fix backend errors first, then run `docker compose up -d`.

### Dashboard works but API calls fail

Check browser developer tools, relative React API paths, and NGINX proxy configuration. Inspect `docker compose logs --tail=100 frontend`. Rebuild the frontend after source changes.

### Port already allocated

Stop the application using the conflicting host port, or change the published host port in Compose and document the new access URL. Container-side ports and internal proxy targets need not change when only host mappings change.

### Environment file changes do not take effect

Recreate the affected backend so Compose injects the new environment:

```bash
docker compose up -d --force-recreate backend-dev backend-prod
```

## Operations

```bash
# Follow logs; Ctrl+C stops log viewing only
docker compose logs -f

# Rebuild after source or Dockerfile changes
docker compose up --build -d

# Stop and remove containers/network, retaining database data
docker compose down
```

## Assumptions and limitations

- This is the local deployment option; no EC2 instance or security group is required.
- The production backend demonstrates production-style process serving with Gunicorn. The complete stack is an assessment deployment, not a hardened public production system.
- One MongoDB instance hosts separate databases; this is logical data separation, not infrastructure or credential isolation.
- MongoDB authentication, application authentication, HTTPS, backups, and high availability are outside this implementation.
- MongoDB has no host port mapping. Frontend and backend host ports are published; restrict access appropriately if using a shared network.
- Development intentionally enables Flask debug mode and should be used only in a trusted local environment.
- Existing application behavior, including its ticket mutation routes, is retained.
- Health checks gate initial startup; Compose does not automatically repair an unhealthy running application simply because its health status changes.

## Submission checklist

- [ ] Repository is public and contains all technical files.
- [ ] All four containers run and required health checks pass.
- [ ] Both environments show separate ticket data through React.
- [ ] Actual screenshots are added and embedded above.
- [ ] Actual machine specifications and verification results are recorded.
- [ ] Real `.env` files and credentials are excluded from Git.
- [ ] Original project license is retained and reviewed.
- [ ] `submission/submission-info.txt` is completed with verified deployment status.

Suggested submission file content (replace bracketed values):

```text
Student Name: [Your Full Name]
Repository URL: https://github.com/prads31-pixel/multienv-deployment-pradnya
Deployment Status: [Working/Partial/Issues — based on verification]
Access URLs:
- Development: http://localhost:3000/dev
- Production: http://localhost:3000/prod
- Frontend: http://localhost:3000/
Date of Submission: [DD-MM-YYYY]
```

Localhost URLs require the evaluator to run the project locally; they are not remotely accessible deployment links.

## Attribution

Application source: https://github.com/mohanDevOps-arch/MultienvApp

This repository adds deployment configuration and documentation for the assessment. Refer to `LICENSE` for the original project's licensing terms.
