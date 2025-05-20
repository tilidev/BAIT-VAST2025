from typing import AsyncGenerator

from neo4j import AsyncDriver
from neo4j.graph import Node, Relationship

from .utils import convert_attr_values


async def query_and_results(driver: AsyncDriver, query: str, params: dict = None) -> list[dict]:
    """
    Execute a Cypher query asynchronously and return all results as a list of dictionaries.
    Use this for most use cases.

    Args:
        driver (AsyncDriver): The Neo4j async driver instance.
        query (str): The Cypher query to execute.

    Returns:
        list[dict]: List of records returned by the query, each as a dictionary.
    """
    records, summary, keys = await driver.execute_query(query, parameters_=params)
    print(
        summary.query, "\n\t-> Results available after / consumed after (ms)",
        summary.result_available_after, "/", summary.result_consumed_after
    )
    return records


async def query_and_lazy_results(driver: AsyncDriver, query: str, params: dict = None) -> AsyncGenerator[dict, None]:
    """
    Execute a Cypher query asynchronously and yield results one by one.
    WARNING: Only makes sense for streaming responses. Use `query_and_results` for most use cases.

    Args:
        driver (AsyncDriver): The Neo4j async driver instance.
        query (str): The Cypher query to execute.

    Yields:
        dict: Each record returned by the query as a dictionary.
    """
    async with driver.session() as sheesh:
        results = await sheesh.run(query, parameters=params)
        async for record in results.data():
            yield record


async def retrieve_entities(driver: AsyncDriver, entity: str):
    query = f"match (n:{entity}) return distinct n"
    results = await query_and_results(driver, query)
    return [convert_attr_values(record['n']) for record in results]


def _convert_visited_places(visited_places: list[Relationship]):
    places = []
    for rel in visited_places:
        rel_obj = {}
        rel_obj['start'] = convert_attr_values(rel.start_node)
        rel_obj['place'] = convert_attr_values(rel._properties)
        places.append(rel_obj)
    return places


async def retrieve_trips_by_person(driver: AsyncDriver, person_id: str):
    query = 'match (p:ENTITY_PERSON {id: $person_id})--(t:TRIP)-[visit]-(:PLACE) return t, collect(visit) as visit'
    records = await query_and_results(driver, query, {'person_id': person_id})
    return [
        {"trip": convert_attr_values(
            record['t']), "visited_places": _convert_visited_places(record['visit'])}
        for record in records
    ]


# TODO inject smart in_graph property in requests/db access

# TODO implement sentiment collection

# TODO implement graph skeleton
