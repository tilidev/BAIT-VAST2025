# AVA 2025 Assignment 1

This template contains a `React` frontend, a `fastAPI` backend, and a `Neo4j` database.

To run the application, follow these steps:

0. Requirements: You have `Docker` and `NodeJS (npm)` installed on your machine

1. Clone this repository with `git clone [url]`.

2. Open a terminal/shell in the main directory (`development-template`) and run `docker compose up --build`. 
For later executions running `docker compose up` is sufficient.

The website should be available at `http://localhost:3000`.

**Other links:**

Backend: `http://localhost:8080`
Neo4j Online Browser: `http://localhost:7474/browser/`

If not changed, the database credentials are
User: `neo4j`
Password: `ava25-DB!!`

**Data:**

Create the folder `/data` at the repo's top level. Copy the files `nodes.csv` and `edges.csv` into it. Now the database can be initialized when running the corresponding import api call.