import json


def parse_neo4j_to_graphology(node_records, rel_records):
    nodes = []
    for record in node_records:
        node = record["airports"]
        nodes.append({
            'key': node.id,
            'attributes': dict(node)
        })

    edges = []
    for record in rel_records:
        rel = record["relations"]
        edges.append({
            'key': rel.id,
            'source': rel.start_node.id,
            'target': rel.end_node.id,
            'attributes': dict(rel)
        })

    return {
        'nodes': nodes,
        'edges': edges
    }
