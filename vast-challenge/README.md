# Vue.js + FastAPI + Neo4j Template

This template provides a starting point for developing applications using:

*   **Frontend:** Vue.js 3 (with TypeScript) using Vite, Pinia for state management, Vue Router for routing, Tailwind CSS v3 for styling, Headless UI, and Element Plus component library.
*   **Backend:** FastAPI (Python) for building APIs.
*   **Database:** Neo4j graph database.

The entire stack is containerized using Docker Compose for easy setup and development.

## Requirements

*   Docker & Docker Compose
*   Node.js & npm (primarily for potential local frontend development/tooling outside Docker, though not strictly required to run the Dockerized setup)

## Running the Application

1.  **Clone the repository:**
    ```bash
    git clone [your-repository-url]
    cd [repository-directory]
    ```

2.  **Build and run the containers:**
    Open a terminal in the project's root directory and run:
    ```bash
    docker compose up --build
    ```
    The `--build` flag ensures images are built if they don't exist or if Dockerfiles have changed. You can omit it for subsequent runs if no Docker-related files were modified.

    Wait for all services (database, backend, frontend) to start. You might see logs from each service in your terminal.

## Accessing the Services

*   **Frontend Application:** `http://localhost:5173`
*   **Backend API Docs:** `http://localhost:8080/docs`
*   **Backend Health Check:** `http://localhost:8080/health`
*   **Neo4j Browser:** `http://localhost:7474/browser/`

## Neo4j Database Credentials

*   **User:** `neo4j`
*   **Password:** `ava25-DB!!` (as defined in `docker-compose.yml`)

## Development Notes

*   **Frontend:** The frontend code is mounted as a volume in the `frontend` container. Changes made locally in the `./frontend` directory should trigger Vite's hot module replacement (HMR) automatically in your browser at `http://localhost:5173`.
*   **Backend:** The backend code (`./backend/app`) is mounted as a volume in the `backend` container. Changes made locally should trigger `uvicorn` to reload the server automatically due to the `--reload` flag in the `CMD`.
*   **Environment Variables:** Backend and frontend configurations (like database connection details or API URLs) are managed via environment variables set in `docker-compose.yml`.
