import asyncio
from collections import defaultdict
from typing import AsyncGenerator

from neo4j import AsyncDriver, AsyncResult
from neo4j.graph import Graph, Node, Relationship

from .utils import convert_attr_values, serialize_neo4j_entity


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


async def query_graph(driver: AsyncDriver, query: str, params: dict = None, result_transformer=AsyncResult.graph) -> Graph:
    """Executes a Cypher query asynchronously and returns the result as a graph. E.g. for deduplication."""
    graph = await driver.execute_query(query, parameters_=params, result_transformer_=result_transformer)
    print(f"Executed graph query {query}")
    return graph


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


async def serializable_graph_transformer(result: AsyncResult):
    graph: Graph = await result.graph()
    nodes = [serialize_neo4j_entity(node) for node in graph._nodes.values()]
    edges = [
        serialize_neo4j_entity(edge)
        for edge in graph._relationships.values()
    ]
    return {"nodes": nodes, "edges": edges}


async def retrieve_entities(driver: AsyncDriver, entity: str):
    query = f"match (n:{entity}) return distinct n"
    results = await query_and_results(driver, query)
    return [convert_attr_values(record['n']) for record in results]


def _convert_visited_places(visit_rels: list[Relationship], place_nodes: list[Node]):
    assert len(visit_rels) == len(place_nodes), "lists must have same length"
    places_out = []
    for rel, place in zip(visit_rels, place_nodes, strict=True):
        assert rel.end_node.element_id == place.element_id, "Don't combine those please"
        obj = {}
        obj['visit_rel'] = convert_attr_values(rel._properties)
        obj['place'] = convert_attr_values(place._properties)
        places_out.append(obj)
    return places_out


async def retrieve_trips_by_person(driver: AsyncDriver, person_id: str):
    query = 'match (p:ENTITY_PERSON {id: $person_id})--(t:TRIP)-[visit]-(pl:PLACE) ' \
        'return t, collect(visit) as visit, collect(pl) as pl'
    records = await query_and_results(driver, query, {'person_id': person_id})
    return [
        {
            "trip": convert_attr_values(record['t']),
            "visited_places": _convert_visited_places(record['visit'], record['pl'])
        }
        for record in records
    ]


async def graph_skeleton(driver: AsyncDriver, result_transformer=serializable_graph_transformer):
    query = """
        MATCH (n)
        WHERE n.in_graph = $graph_keys  
        OPTIONAL MATCH (n)-[r]-(m)
        WHERE r.in_graph = $graph_keys
        AND m.in_graph = $graph_keys
        RETURN n, r, m"""
    serializable_graph = await query_graph(driver, query, {'graph_keys': ['jo', 'fi', 'tr']}, result_transformer)
    return serializable_graph


async def full_graph_no_roadmap(driver: AsyncDriver):
    query = "match (n:!ROADMAP_PLACE) OPTIONAL MATCH (n:!ROADMAP_PLACE)-[r:!IS]-() return n, r"
    graph = await query_graph(driver, query)
    return graph


async def nodes_only_in(driver: AsyncDriver, dataset: str):
    query = "match (n:!ROADMAP_PLACE {in_graph: $in_graph_arr}) return n"
    in_graph_arr = []
    if dataset != "jo":
        in_graph_arr.append("jo")
    in_graph_arr.append(dataset)
    nodes = (await query_graph(driver, query, {'in_graph_arr': in_graph_arr}))._nodes
    return nodes


async def links_only_in(driver: AsyncDriver, dataset: str):
    query = "match (n)-[r {in_graph: $in_graph_arr}]->(m) return n, r, m"
    # we want to return nodes so that the Graph object can reference them
    in_graph_arr = []
    if dataset != "jo":
        in_graph_arr.append("jo")
    in_graph_arr.append(dataset)
    links = (await query_graph(driver, query, {'in_graph_arr': in_graph_arr}))._relationships
    return links


async def dataset_specific_nodes_and_links(driver: AsyncDriver, dataset: str):
    """
    Retrieve nodes and links specific to a given dataset.
    Args:
        driver (AsyncDriver): The async database driver.
        dataset (str): The dataset identifier.
    Returns:
        dict: Dictionary with 'nodes' and 'edges' specific to the dataset.
    """
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(graph_skeleton(driver, AsyncResult.graph))
        t2 = tg.create_task(nodes_only_in(driver, dataset))
        t3 = tg.create_task(links_only_in(driver, dataset))

    skeleton = t1.result()
    specific_nodes = t2.result()
    specific_links = t3.result()

    difference_nodes = specific_nodes.keys() - skeleton._nodes.keys()
    difference_links = specific_links.keys() - skeleton._nodes.keys()

    return {
        "nodes": [specific_nodes[key] for key in difference_nodes],
        "links": [specific_links[key] for key in difference_links]
    }


async def entity_topic_participation(driver: AsyncDriver):
    query = """
    MATCH (t:TOPIC)--(pd:PLAN | DISCUSSION)-[p:PARTICIPANT]-(e:ENTITY_PERSON | ENTITY_ORGANIZATION)
    RETURN
      e.id as entity_id,
      labels(e)[0] as entity_type,
      e.in_graph as node_in_graph,
      t.id as topic_id,
      collect(pd),
      p.sentiment as sentiment,
      p.reason as reason,
      p.in_graph as sentiment_recorded_in,
      p.industry as topic_industry
    """
    records = await query_and_results(driver, query)

    entity_topic_sentiments = {}
    for row in records:
        eid = row["entity_id"]
        if eid not in entity_topic_sentiments:
            entity_topic_sentiments[eid] = {
                "entity_id": eid,
                "entity_type": row["entity_type"],
                "node_in_graph": row["node_in_graph"],
                "topic_sentiments": []
            }

        entity_topic_sentiments[eid]["topic_sentiments"].append({
            "topic_id": row["topic_id"],
            "sentiment": row["sentiment"],
            "reason": row["reason"],
            "sentiment_recorded_in": row["sentiment_recorded_in"],
            "topic_industry": row["topic_industry"] if row["topic_industry"] != [] else ['misc']
        })

    return list(entity_topic_sentiments.values())


async def personal_activity(driver: AsyncDriver, person_id: str):
    query = "match (n {id: $person_id})--(p:PLAN)--(m:MEETING), (p)--(t:TOPIC) return p, m.id, t.id"
    records = await query_and_results(driver, query, {'person_id': person_id})
    plans = [{"node" : serialize_neo4j_entity(r['p']), "meeting" : r['m.id'], "topic" : r['t.id']} for r in records]

    query = "match (n {id: $person_id})--(d:DISCUSSION)--(m:MEETING), (d)--(t:TOPIC) return d, m.id, t.id"
    records = await query_and_results(driver, query, {'person_id': person_id})
    discussions = [{"node" : serialize_neo4j_entity(r['d']), "meeting" : r['m.id'], "topic" : r['t.id']} for r in records]
    return plans, discussions