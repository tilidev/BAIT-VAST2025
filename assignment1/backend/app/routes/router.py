from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse
from db_utils import driver
from data_utils import parse_neo4j_to_graphology
from .models import FilterGraphRequest, SimpleFilterGraphRequest

router = APIRouter()


@router.get("/", response_class=HTMLResponse, tags=["ROOT"])
async def root():
    html_content = """
        <html>
            <head>
                <title>AVA Template Python API</title>
            </head>
            <body>
                <h1>AVA Template Python API</h1>
            </body>
        </html>
        """
    return HTMLResponse(content=html_content, status_code=200)

# Just used for debugging


@router.get("/clear-db", response_class=JSONResponse)
async def clear_db():

    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        print("Database cleared.")

    return {"success": True}


@router.get("/populate-db")
async def populate_db():

    with driver.session() as session:
        # Empty database
        session.run("MATCH (n) DETACH DELETE n")
        print("Database cleared.")

        # Populate Airports
        session.run(
            """
            LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
            MERGE (a:Airport {
                iata: coalesce(row.iata, 'UNKNOWN'),
                icao: coalesce(row.icao, 'UNKNOWN'),
                city: coalesce(row.city, 'UNKNOWN'),
                descr: coalesce(row.descr, 'No description'),
                region: coalesce(row.region, 'UNKNOWN'),
                runways: toInteger(coalesce(row.runways, 0)),
                longest: toInteger(coalesce(row.longest, 0)),
                altitude: toInteger(coalesce(row.altitude, 0)),
                country: coalesce(row.country, 'UNKNOWN'),
                continent: coalesce(row.continent, 'UNKNOWN'),
                lat: toFloat(coalesce(row.lat, 0.0)),
                lon: toFloat(coalesce(row.lon, 0.0))
            })
            """
        )
        print("Loaded Airport nodes")

        # Populate Routes
        session.run(
            """
            LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row
            MATCH (a:Airport {iata: row.src}), (b:Airport {iata: row.dest})
            MERGE (a)-[:FlightRoute {dist: toInteger(coalesce(row.dist, 0))}]->(b)
            """
        )
        print("Loaded Flight routes as relationships")

        return {"success": True}


@router.get("/airport-by-iata")
async def retrieve_node_properties(iata: str, ft_to_meters: bool = True):

    records, summary, _ = driver.execute_query(
        f"""
        MATCH (n:Airport) WHERE n.iata = '{iata}' RETURN n
        """
    )

    # TODO convert to meters (metric ftw)
    pass


@router.get("/dummydata")
async def dummydata():
    query_nodes = "Match (a:Airport) RETURN a as airports"
    query_relations = "MATCH(a1: Airport)-[r:FlightRoute] -> (a2) RETURN r AS relations"
    nodes, summary, _ = driver.execute_query(query_nodes)
    relations, summary, _ = driver.execute_query(query_relations)
    return parse_neo4j_to_graphology(nodes, relations)


@router.get("/airport_attributes")
def airport_attrs():
    keys = ["iata", "icao", "city", "region", "country", "continent"]
    prop_unique_values = {}
    for k in keys:
        records = [rec[0] for rec in driver.execute_query(
            f"MATCH (n:Airport) return distinct n.{k}",
        )[0]]
        prop_unique_values[k] = records
    return prop_unique_values


@router.post("/simple-filtered-graph")
async def simple_filtered_graph(filters: SimpleFilterGraphRequest):
    def query_builder_airport(where_clause):
        # Query to get distinct source (n1) and destination (n2) airports involved in filtered routes
        return f"""
        MATCH (n1:Airport)-->(n2:Airport) {where_clause} RETURN DISTINCT n1 as airport
        UNION
        MATCH (n1:Airport)-->(n2:Airport) {where_clause} RETURN DISTINCT n2 as airport
        """

    def query_builder_route( where_clause): return f"MATCH (n1:Airport)-[r]->(n2:Airport) {where_clause} RETURN r as relations"

    conditions = []
    for k, v in filters.__dict__.items():
        if len(v) > 0:
            formatted_values = [f"'{val}'" for val in v]
            conditions.append(
                f"n1.{k} IN [{', '.join(formatted_values)}] AND n2.{k} IN [{', '.join(formatted_values)}]")

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    nodes, _, _ = driver.execute_query(node_query)
    relations, _, _ = driver.execute_query(query_builder_route(where_clause))
    print(f"Executing query with where clause: {where_clause}")
    return parse_neo4j_to_graphology(nodes, relations)

# @router.get("/filtered-graph")
# async def filtered_graph(filters: FilterGraphRequest):
#     if len(filters.countries_in) == 0:
#         countries_in_filter = ""
#     else:
#         countries_in_filter = f"n.country in {filters.countries_in}"
#
#     if len(filters.countries_out) == 0:
#         countries_out_filter = ""
#     else:
#         countries_out_filter = "and n2.country in "
