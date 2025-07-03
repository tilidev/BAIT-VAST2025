from itertools import product
import time
from typing import Literal
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException
from contextlib import asynccontextmanager
from neo4j import AsyncDriver, AsyncGraphDatabase, basic_auth
import os
import numpy as np

from .models import IndustryProContraSentiment, Entity, BaseGraphObject, EntityTopicSentiment, GraphMembership, PersonalActivity
from .crud import dataset_specific_nodes_and_links, entity_topic_participation, graph_skeleton, num_trips_by_person, personal_activity, query_and_results, retrieve_entities, retrieve_trips_by_person
from .utils import cosine_similarity_with_nans, serialize_neo4j_entity

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


@app.get("/num-trips-by-person")
async def num_trips_of_person(person_id: str, driver: AsyncDriver = Depends(get_driver)):
    return await num_trips_by_person(driver, person_id)

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
    start_time = time.time()
    graph = await dataset_specific_nodes_and_links(driver, dataset)
    result = {
        k: [serialize_neo4j_entity(entity) for entity in v] for k, v in graph.items()
    }
    print("Query and processing took", round(
        (time.time() - start_time) * 1000), "ms")
    return result


@app.get("/retrieve-sentiments", response_model=list[EntityTopicSentiment], tags=["Sentiment Analysis"])
async def retrieve_sentiments(driver: AsyncDriver = Depends(get_driver)):
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


def convert_graph_topics(sentiments_by_topic):
    def _check_condition(condition_name: str, check_against: list):
        assert check_against is not None, "Dude wtf"
        evaluate = {
            "full_graph": "jo" in check_against,
            # "only_trout" : "fi" not in check_against and 'tr' in check_against,
            "known_in_trout": 'tr' in check_against,
            # "only_filah" : "tr" not in check_against and 'fi' in check_against,
            "known_in_filah": 'fi' in check_against,
            # "only_journalist" : check_against == ["jo"]
        }
        return evaluate[condition_name]

    def _aggregate_industry(sentiment_dict: EntityTopicSentiment, condition_name):
        agg_sentiment_by_industry = {}
        for topic_sentiment_entry in sentiment_dict['topic_sentiments']:
            # TODO loop over conditions here?
            if _check_condition(condition_name, topic_sentiment_entry['sentiment_recorded_in']):
                related_industries = topic_sentiment_entry['topic_industry']
                if related_industries is None:
                    continue
                for industry in related_industries:
                    cur_value = agg_sentiment_by_industry.get(industry, (0, 0))
                    sentiment_mean = cur_value[0]
                    new_n = cur_value[1] + 1
                    agg_sentiment_by_industry[industry] = (
                        (sentiment_mean + topic_sentiment_entry['sentiment']) / new_n, new_n)
        for key in agg_sentiment_by_industry.keys():
            mean, n = agg_sentiment_by_industry[key]
            agg_sentiment_by_industry[key] = {
                "mean_sentiment": mean,
                "num_sentiments": n
            }
        return agg_sentiment_by_industry

    aggregated_sentiments_by_graph_and_industry = {
        condition_name: [
            {
                entry['entity_id']: _aggregate_industry(entry, condition_name)
            }
            for entry in sentiments_by_topic
        ]
        # TODO remove loop here (see above)
        for condition_name in ["full_graph", "known_in_trout", "known_in_filah"]
    }
    return aggregated_sentiments_by_graph_and_industry


@app.get("/sentiments-by-industry", tags=["Sentiment Analysis"])
async def retrieve_sentiments_aggregate_by_industry(driver: AsyncDriver = Depends(get_driver)):
    """
    Retrieve aggregated sentiment scores grouped by industry and filtered by graph context.

    This endpoint analyzes sentiment data recorded from entities (persons or organizations)
    in the context of their participation in topics (via plans or discussions).
    It aggregates sentiment scores by industry, grouped under three predefined conditions
    based on where the sentiment was recorded:

    - **full_graph**: Sentiment recorded in the full graph context (includes 'jo', 'fi', 'tr')
    - **known_in_trout**: Sentiment recorded at least in the 'tr' graph
    - **known_in_filah**: Sentiment recorded at least in the 'fi' graph

    For each entity, the endpoint computes:
    - The mean sentiment per industry
    - The number of sentiment records contributing to that mean

    Returns:
        dict: A dictionary with keys as condition names and values as lists of per-entity
              industry-level sentiment aggregations. Example structure:

        {
            "full_graph": [
                {
                    "entity_id_1": {
                        "Industry A": {"mean_sentiment": 0.75, "num_sentiments": 4},
                        ...
                    }
                },
                ...
            ],
            "known_in_trout": [...],
            "known_in_filah": [...]
        }
    """
    sentiments_by_topic = await entity_topic_participation(driver)
    return convert_graph_topics(sentiments_by_topic)


@app.get(
    "/industry-pro-contra-sentiments",
    summary="Get Industry Pro Contra Sentiments",
    description=(
        "Returns aggregated sentiment values for each entity-industry combination "
        "based on topic-level sentiments. Sentiment values are grouped by entity ID, "
        "entity type, sentiment polarity (positive/negative), data source subset, and industry. "
        "Only non-neutral sentiment values (i.e., not 0 or None) are considered."
    ),
    response_description="List of aggregated industry pro contra sentiments per entity-industry group.",
    tags=["Sentiment Analysis"]
)
async def retrieve_industry_pro_contra_sentiments(driver: AsyncDriver = Depends(get_driver)) -> list[IndustryProContraSentiment]:
    """
    Aggregate sentiment values by entity and industry.

    For each topic sentiment associated with an entity, this endpoint aggregates
    the sentiment score across the industries the sentiment applies to. It groups data
    by the following key:

    - `entity_id`: The ID of the entity
    - `entity_type`: Type of entity (e.g., company, person)
    - `sentiment_positive`: Boolean flag (True for positive sentiment, False for negative)
    - `dataset`: Source of sentiment data (`jo`, `fi`, `tr`, or `all`)
    - `industry`: Industry the sentiment relates to

    Sentiments with values of 0 or None are ignored.

    Returns:
        List of dictionaries, each containing:
        - `entity_id`
        - `entity_type`
        - `sentiment_positive`
        - `dataset`
        - `industry`
        - `agg_sentiment`: Aggregated sentiment value
        - `contributing_sentiments`: List of original sentiment dicts that contributed
    """
    data = await entity_topic_participation(driver)

    def _check(sentiment_recorded_in):
        datasets = set(sentiment_recorded_in)
        if {'jo', 'fi', 'tr'}.issubset(datasets):
            return 'all'
        elif 'tr' in datasets and 'fi' not in datasets:
            return 'tr'
        elif 'fi' in datasets and 'tr' not in datasets:
            return 'fi'
        else:
            return 'jo'

    results = {}
    for entity in data:
        for sentiment in entity['topic_sentiments']:
            sent_val = sentiment['sentiment']
            if sent_val in [0, None]:
                continue
            multi_idxs = [  # id, type, sentiment polarity, dataset, industry
                (entity['entity_id'], entity['entity_type'], sent_val >= 0,
                    _check(sentiment['sentiment_recorded_in']), industry)
                for industry in sentiment['topic_industry']
            ]
            for mx in multi_idxs:
                if mx not in results:
                    results[mx] = {"agg_sentiment": sent_val,
                                   "contributing_sentiments": [sentiment]}
                else:
                    results[mx]['agg_sentiment'] += sent_val
                    results[mx]['contributing_sentiments'].append(sentiment)

    keys = ['entity_id', 'entity_type',
            'sentiment_positive', 'dataset', 'industry']
    return [dict(zip(keys + list(val.keys()), idx + tuple(val.values()))) for idx, val in results.items()]


@app.get("/industry-interest-alignment", tags=['Sentiment Analysis'])
async def retrieve_industry_interest_alignment(weight: bool = False, driver: AsyncDriver = Depends(get_driver)) -> dict[str, dict[str, float | None]]:
    """
    Retrieve a similarity matrix showing how aligned different industries are 
    based on sentiment data from entities.

    This endpoint calculates the cosine similarity between industries using 
    mean sentiment values toward them from various entities. Optionally, sentiments 
    can be weighted by the number of observations.

    Args:
        weight (bool): Whether to weight sentiment values by their frequency.
        driver (AsyncDriver): Async Neo4j driver for data retrieval (injected dependency).

    Returns:
        pd.DataFrame: A square similarity matrix with industries as both rows and columns.
    """
    sentiments_by_topic = await entity_topic_participation(driver)
    data = convert_graph_topics(sentiments_by_topic)['full_graph']
    data = {k: v for e in data for k, v in e.items()}
    unique_entities = list(data.keys())
    unique_industries = ['tourism', 'small vessel', 'misc', 'large vessel']

    matrix = []
    for industry in unique_industries:
        row = []
        for ent in unique_entities:
            if industry in data[ent]:
                value = data[ent][industry]['mean_sentiment']
                if weight:
                    value *= data[ent][industry]['num_sentiments']
            else:
                value = np.nan
            row.append(value)
        matrix.append(row)

    df_industry_sentiments_by_person = pd.DataFrame(
        matrix, unique_industries, unique_entities)

    idx = unique_industries
    similarity_matrix = pd.DataFrame(index=idx, columns=idx, dtype=float)
    for i, j in product(idx, idx):
        x = df_industry_sentiments_by_person.loc[i].values
        y = df_industry_sentiments_by_person.loc[j].values
        similarity_matrix.loc[i, j] = round(
            cosine_similarity_with_nans(x, y), 2)
    return similarity_matrix.to_dict()


@app.get("/person-activity-plans")
async def retrieve_person_activity(person_id: str, driver: AsyncDriver = Depends(get_driver)) -> dict[str, PersonalActivity]:
    plans, discussions = await personal_activity(driver, person_id)
    result = dict()

    datasets = ['jo', 'fi', 'tr']
    for ds in datasets:
        ds_plans = list(filter(lambda node: ds in node['node']['in_graph'] and ds in node["rel_exists_in"], plans))
        ds_discussions = list(filter(lambda node: ds in node['node']['in_graph'] and ds in node["rel_exists_in"], discussions))
        result[ds] = {
            "num_plans" : len(ds_plans),
            "num_discussions": len(ds_discussions),
            "num_meetings" : len(set([d['meeting'] for d in ds_plans + ds_discussions])),
            "num_topics" : len(set([d['topic'] for d in ds_plans + ds_discussions])),
            "unique_meetings" : set([d['meeting'] for d in ds_plans + ds_discussions]),
            "unique_topics" : set([d['topic'] for d in ds_plans + ds_discussions]),
            "plans" : ds_plans,
            "discussions" : ds_discussions,
        }
    return result

# TODO aggregations on person (meetings, discussions, plans participated, trips taken, places gone to etc.)

# TODO infer date of meeting by travel plans
