from typing import AsyncGenerator

from neo4j import AsyncDriver


async def query_and_results(driver: AsyncDriver, query: str) -> list[dict]:
    """
    Execute a Cypher query asynchronously and return all results as a list of dictionaries.
    Use this for most use cases.

    Args:
        driver (AsyncDriver): The Neo4j async driver instance.
        query (str): The Cypher query to execute.

    Returns:
        list[dict]: List of records returned by the query, each as a dictionary.
    """
    async with driver.session() as sheesh:
        results = await sheesh.run(query)
        return [r for r in await results.data()]


async def query_and_lazy_results(driver: AsyncDriver, query: str) -> AsyncGenerator[dict]:
    """
    Execute a Cypher query asynchronously and yield results one by one.
    E.g. for streaming responses. Use `query_and_results` for most use cases.

    Args:
        driver (AsyncDriver): The Neo4j async driver instance.
        query (str): The Cypher query to execute.

    Yields:
        dict: Each record returned by the query as a dictionary.
    """
    async with driver.session() as sheesh:
        results = await sheesh.run(query)
        async for record in results.data():
            yield record
