from fastapi import FastAPI
from contextlib import asynccontextmanager
from neo4j import AsyncGraphDatabase, basic_auth
import os

# Neo4j connection details from environment variables
NEO4J_URI = f"bolt://{os.getenv('DB_HOST', 'localhost')}:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = os.getenv('DB_PASSWORD', 'password')

# Global variable to hold the driver instance
driver = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Neo4j driver
    global driver
    print(f"Connecting to Neo4j at {NEO4J_URI}")
    try:
        driver = AsyncGraphDatabase.driver(
            NEO4J_URI,
            auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD)
        )
        await driver.verify_connectivity()
        print("Successfully connected to Neo4j.")
    except Exception as e:
        print(f"Failed to connect to Neo4j: {e}")
        # Optionally, you might want to raise the exception or handle it differently
        # raise e
    yield
    # Shutdown: Close Neo4j driver
    if driver:
        print("Closing Neo4j connection.")
        await driver.close()
        print("Neo4j connection closed.")

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def read_root():
    return {"message": "Backend is running"}

@app.get("/health")
async def health_check():
    if driver:
        try:
            await driver.verify_connectivity()
            return {"status": "ok", "neo4j_connection": "connected"}
        except Exception as e:
            return {"status": "error", "neo4j_connection": "disconnected", "error": str(e)}
    return {"status": "error", "neo4j_connection": "driver_not_initialized"}

# Add other API endpoints here
