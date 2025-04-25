from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse
from db_utils import driver
from data_utils import parse_neo4j_to_graphology

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
    query_nodes = "Match (a:Airport {country: 'DE'}) RETURN a as airports"
    query_relations = "MATCH(a1: Airport {country: 'DE'})-[r:FlightRoute] -> (a2: Airport {country: 'DE'}) LIMIT 5 RETURN r AS relations"
    nodes, summary, _ = driver.execute_query(query_nodes)
    relations, summary, _ = driver.execute_query(query_relations)
    return parse_neo4j_to_graphology(nodes, relations)
