import subprocess
import sys
import os
from neo4j.time import Date, Time, DateTime
from neo4j.graph import Node, Relationship
import numpy as np
from numpy.linalg import norm


def convert(value):
    # https://neo4j.com/docs/api/python-driver/current/types/temporal.html
    if isinstance(value, (Date, Time, DateTime)):
        return value.to_native()
    return value


def convert_attr_values(node_or_link: dict | Node | Relationship, attrs: list = None) -> dict:
    """
    Converts the values of specified attributes in a dictionary using the `convert` function.
    Args:
        node_or_link (dict): The dictionary whose attribute values are to be converted.
        attrs (list, optional): A list of attribute names whose values should be converted.
            If None, all values in the dictionary are converted.
    Returns:
        dict: A new dictionary with the specified attribute values converted.
    Notes:
        - If `attrs` is provided and none of the specified attributes are present in the dictionary,
          the original dictionary is returned unchanged.
    """

    if attrs:
        if not any(k in node_or_link for k in attrs):
            return node_or_link
        return {k: convert(v) if k in attrs else v for k, v in node_or_link.items()}
    else:
        return {k: convert(v) for k, v in node_or_link.items()}


def serialize_neo4j_entity(node_or_link: Node | Relationship):
    if isinstance(node_or_link, Node):
        res = convert_attr_values(node_or_link)
        res['type'] = list(node_or_link._labels)[0]
        return res
    elif isinstance(node_or_link, Relationship):
        return {
            "source": node_or_link.start_node.get('id', node_or_link.element_id),
            "target": node_or_link.end_node.get('id', node_or_link.element_id),
            "properties": convert_attr_values(node_or_link)
        }
    else:
        raise NotImplementedError


async def is_database_empty(driver):
    """
    Check if the Neo4j database is empty by counting total nodes.
    
    Args:
        driver: Neo4j async driver instance
        
    Returns:
        bool: True if database is empty (no nodes), False otherwise
    """
    try:
        records, summary, keys = await driver.execute_query("MATCH (n) RETURN count(n) as node_count")
        node_count = records[0]["node_count"]
        return node_count == 0
    except Exception as e:
        print(f"Error checking database status: {e}")
        return False


async def load_initial_data():
    """
    Load initial data by running the load_data.py script.
    
    Returns:
        bool: True if data loading was successful, False otherwise
    """
    try:
        # Get the directory where the load_data.py script is located
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        load_data_script = os.path.join(backend_dir, "load_data.py")
        
        print("Loading initial data into database...")
        
        # Run the load_data.py script
        result = subprocess.run(
            [sys.executable, load_data_script],
            cwd=backend_dir,  # Set working directory to backend/
            capture_output=True,
            text=True,
            check=True
        )
        
        print("Data loading completed successfully.")
        print(f"Script output: {result.stdout}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"Error loading data: {e}")
        print(f"Script stderr: {e.stderr}")
        print(f"Script stdout: {e.stdout}")
        return False
    except Exception as e:
        print(f"Unexpected error during data loading: {e}")
        return False


def cosine_similarity_with_nans(x, y):
    # only keep non-naN
    mask = ~np.isnan(x) & ~np.isnan(y)
    if np.sum(mask) == 0:
        return np.nan
    x_masked = x[mask]
    y_masked = y[mask]
    return np.dot(x_masked, y_masked) / (norm(x_masked) * norm(y_masked))