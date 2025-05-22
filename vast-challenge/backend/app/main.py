from fastapi import Depends, FastAPI, HTTPException
from contextlib import asynccontextmanager
from neo4j import AsyncDriver, AsyncGraphDatabase, basic_auth
import os

from .models import Entity, BaseGraphObject, GraphMembership
from .crud import dataset_specific_nodes_and_links, graph_skeleton, query_and_results, retrieve_entities, retrieve_trips_by_person
from .utils import serialize_entity

# Neo4j connection details from environment variables or local development
NEO4J_URI = f"bolt://{os.getenv('DB_HOST', 'localhost')}:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = os.getenv('DB_PASSWORD', 'ava25-DB!!')

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
        raise e

    yield

    if driver:
        print("Closing Neo4j connection.")
        await driver.close()
        print("Neo4j connection closed.")

app = FastAPI(lifespan=lifespan)


@app.get("/")
async def read_root():
    return {"message": "Backend is running"}


async def get_driver() -> AsyncDriver:
    if not driver:
        raise HTTPException(
            status_code=500, detail="Neo4j driver is not initialized")
    return driver


@app.get("/health")
async def health_check(driver: AsyncDriver = Depends(get_driver)):
    try:
        await driver.verify_connectivity()
        return {"status": "ok", "neo4j_connection": "connected"}
    except Exception as e:
        return {"status": "error", "neo4j_connection": "disconnected", "error": str(e)}


# Add other API endpoints here

@app.get("/entities", response_model=list[BaseGraphObject])
async def entities(entity: Entity, driver: AsyncDriver = Depends(get_driver)):
    return await retrieve_entities(driver, entity)


@app.get("/trip-activity-by-person")
async def trips_of_person(person_id: str, driver: AsyncDriver = Depends(get_driver)):
    records = await retrieve_trips_by_person(driver, person_id)
    return records


@app.get("/sentiment")
async def sentiment():
    pass


@app.get("/graph-skeleton")
async def get_graph_skeleton(driver: AsyncDriver = Depends(get_driver)):
    serialized_graph = await graph_skeleton(driver)
    return serialized_graph


@app.get("/dataset-specific-nodes-edges")
async def nodes_and_edges_only_in(dataset: GraphMembership, neighbors: bool = False, driver: AsyncDriver = Depends(get_driver)):
    # TODO include neighboring node placeholders if graph should be displayed and links 
    graph = await dataset_specific_nodes_and_links(driver, dataset)
    return {
        k: [serialize_entity(entity) for entity in v] for k, v in graph.items()
    }
