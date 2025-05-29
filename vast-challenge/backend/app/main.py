import time
from fastapi import Depends, FastAPI, HTTPException
from contextlib import asynccontextmanager
from neo4j import AsyncDriver, AsyncGraphDatabase, basic_auth
import os

from .models import Entity, BaseGraphObject, EntityTopicSentiment, GraphMembership
from .crud import dataset_specific_nodes_and_links, entity_topic_participation, graph_skeleton, query_and_results, retrieve_entities, retrieve_trips_by_person
from .utils import serialize_neo4j_entity

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


@app.get("/graph-skeleton")
async def get_graph_skeleton(driver: AsyncDriver = Depends(get_driver)):
    serialized_graph = await graph_skeleton(driver)
    return serialized_graph


@app.get("/dataset-specific-nodes-edges")
async def nodes_and_edges_only_in(dataset: GraphMembership, neighbors: bool = False, driver: AsyncDriver = Depends(get_driver)):
    # TODO include neighboring node placeholders if graph should be displayed and links
    start_time = time.time()
    graph = await dataset_specific_nodes_and_links(driver, dataset)
    result = {
        k: [serialize_neo4j_entity(entity) for entity in v] for k, v in graph.items()
    }
    print("Query and processing took", round((time.time() - start_time) * 1000), "ms")
    return result


@app.get("/retrieve-sentiments", response_model=list[EntityTopicSentiment])
async def retrieve_sentiments(driver: AsyncDriver=Depends(get_driver)):
    """
    Retrieve sentiment scores for each entity towards the topics they are connected to.

    This endpoint queries the graph database for all TOPIC nodes connected to PLAN or DISCUSSION nodes,
    joined via PARTICIPANT relationships to ENTITY_PERSON or ENTITY_ORGANIZATION nodes.
    The sentiment is extracted using the PARTICIPANT relationship (null if no sentiment recorded).

    Steps performed:
    1. MATCH all (TOPIC) -- (PLAN|DISCUSSION) -- [PARTICIPANT] -- (ENTITY)
    2. RETURN entity and topic identifiers, sentiment scores, graph-membership metadata, and industry tags (if recorded)
    3. Group by entity_id and construct a list of TopicSentiment objects

    Returns:
        List[EntityTopicSentiment]:  
            - entity_id (str): Unique identifier of the entity (person or organization).  
            - entity_type (Entity): Label indicating whether it's a person or organization.  
            - node_in_graph (list[GraphMembership]): Metadata on where the entity node exists in the graph.  
            - topic_sentiments (list[TopicSentiment]): For each topic connected to this entity:  
                * topic_id (str)  
                * sentiment (float | None): The sentiment score, if recorded.  
                * sentiment_recorded_in (list[GraphMembership]): Where in the graph the sentiment was captured.  
                * topic_industry (list[str] | None): Industry tags associated with the topic.
    """
    return await entity_topic_participation(driver)

# TODO aggregations on person (meetings, discussions, plans participated, trips taken, places gone to etc.)

# TODO Topic industry (match (t:TOPIC)--(:PLAN | DISCUSSION)-[rel]-(p:ENTITY_PERSON) return t.id, collect(rel.industry))

# TODO infer date of meeting by travel plans