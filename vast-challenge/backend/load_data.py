import json
from collections import defaultdict
import datetime
from neo4j import GraphDatabase


def remove_null_vals(elements):
    return [{k: v for k, v in e.items() if v is not None} for e in elements]


def load_files():
    with open('data/journalist.json', 'r') as jf:
        journalist_data = json.load(jf)
        journalist_data['nodes'] = remove_null_vals(journalist_data['nodes'])
        journalist_data['links'] = remove_null_vals(journalist_data['links'])
    with open('data/FILAH.json', 'r') as jf:
        FILAH_data = json.load(jf)
        FILAH_data['nodes'] = remove_null_vals(FILAH_data['nodes'])
        FILAH_data['links'] = remove_null_vals(FILAH_data['links'])
    with open('data/TROUT.json', 'r') as jf:
        TROUT_data = json.load(jf)
        TROUT_data['nodes'] = remove_null_vals(TROUT_data['nodes'])
        TROUT_data['links'] = remove_null_vals(TROUT_data['links'])
    return journalist_data, FILAH_data, TROUT_data


def load_road_map():
    with open('data/road_map.json', 'r') as rm:
        road_map = json.load(rm)
        road_map['nodes'] = remove_null_vals(road_map['nodes'])
        road_map['links'] = remove_null_vals(road_map['links'])
    return road_map


# transform nodes and links to hashable representation
def set_nodes(li): return set([frozenset(v.items()) for v in li])


def set_links(li): return set(
    [frozenset([(k, str(val)) for k, val in v.items()]) for v in li])


def get_node(nodes, id: int):
    for n in nodes:
        if n['id'] == id:
            return n


def link_id(
    link): return "-".join([str(link['source']), str(link['target']), str(link['key'])])


def get_link(links, id: str):
    for l in links:
        if link_id(l) == id:
            return l


def missing_attr_entities(graph, attr, nodes=True):
    of = 'nodes' if nodes else 'links'
    elements_with_missing_attribute = [e for e in graph[of] if attr not in e]
    return elements_with_missing_attribute


def lookup(graph, node_id, attr):
    for node in graph['nodes']:
        if node['id'] != node_id:
            continue
        return node[attr]


def infer_link_role(graph, link):
    source_id = link['source']
    target_id = link['target']
    type_source = lookup(graph, source_id, 'type')
    type_target = lookup(graph, target_id, 'type')

    if type_source == "trip":
        if type_target == "place":
            link['role'] = "visit"
        elif type_target == "entity.person":
            link['role'] = "took"


# -----------

def check():
    """
    Performs check on the data loaded from the three datasets: journalist, FILAH, and TROUT.
    The function validates the consistency and overlap of nodes and links across these datasets.
    Steps performed:
    1. Loads data from the three datasets.
    2. Compute overlap of nodes between the datasets.
    3. Identifies additional nodes present only in the journalist dataset.
    4. Checks for duplicate node IDs within each dataset.
    5. Validates that nodes present in overlapping datasets (TROUT and FILAH) contain consistent key-value pairs.
    6. Computes the overlap of links between the datasets and prints the results.
    7. Identifies additional links present only in the journalist dataset.
    8. Validates that links present in overlapping datasets (TROUT and FILAH) contain consistent key-value pairs.
    Raises:
        AssertionError: If any inconsistencies are found in the key-value pairs of overlapping nodes or links.
    Disclaimer:
         This docstring was generated with the assistance of an AI model and may therefore be inaccurate.
    """

    journalist_data, FILAH_data, TROUT_data = load_files()
    graphs = {
        "journalist": journalist_data,
        "FILAH": FILAH_data,
        "TROUT": TROUT_data,
    }
    nodes_journalist = set_nodes(graphs['journalist']['nodes'])
    nodes_FILAH = set_nodes(graphs['FILAH']['nodes'])
    nodes_TROUT = set_nodes(graphs['TROUT']['nodes'])

    overlap_trout_filah = nodes_FILAH & nodes_TROUT
    print("overlapping nodes TROUT FILAH:", len(overlap_trout_filah))

    overlap_trout_journalist = nodes_TROUT & nodes_journalist
    print("overlapping nodes TROUT Journalist:", len(overlap_trout_journalist),
          "\n -> percentage of nodes also contained in journalist:", 100*len(overlap_trout_journalist)/len(nodes_TROUT))

    overlap_FILAH_journalist = nodes_FILAH & nodes_journalist
    print("overlapping nodes FILAH Journalist:", len(overlap_FILAH_journalist),
          "\n -> percentage of nodes also contained in journalist:", 100*len(overlap_FILAH_journalist)/len(nodes_FILAH))

    nodes_journalist_only = nodes_journalist - nodes_FILAH - nodes_TROUT
    print("Additional nodes in journalist graph:", len(nodes_journalist_only))

    # check if all ids are unique
    counts = defaultdict(int)

    for graph in load_files():
        counts = defaultdict(int)
        for node in graph['nodes']:
            counts[node['id']] += 1
            if counts[node['id']] > 1:
                print(f"Node with id {node['id']} already exists")
        else:
            print("No duplicate node id detected")

    check = {
        "TROUT": [dict(v) for v in nodes_TROUT - overlap_trout_journalist],
        "FILAH": [dict(v) for v in nodes_FILAH - overlap_FILAH_journalist],
    }

    print("\nChecking for critical contradictions")

    for dataset, nodes_to_check in check.items():
        for node in nodes_to_check:
            node_id = node['id']
            a = get_node(graphs['journalist']['nodes'], node_id)
            compare_against = 'FILAH' if dataset == 'TROUT_FILAH' else dataset
            b = get_node(graphs[compare_against]['nodes'], node_id)
            for k, v in a.items():
                try:
                    assert b[k] == v, f"Mismatch for key '{k}' in node {node_id}: journalist={v}, trout={b[k]}"
                except KeyError:
                    print(
                        f"Key '{k}' missing in {dataset} node {node_id} but available in journalist")

    print("\nSUCCESS: No contradictory nodes found!\n\n")

    # check for nodes and links with different key, value pairs in the overlapping part of trout, filah
    for node in overlap_trout_filah:
        nid = dict(node)['id']
        n1 = get_node(graphs['TROUT']['nodes'], nid)
        n2 = get_node(graphs['FILAH']['nodes'], nid)

        n1 = set(n1.items())
        n2 = set(n2.items())
        assert len(n1) == len(
            n2), f"different amount of k-v pairs for {n1}, {n2}"

        all = n1 | n2
        diff1 = all - n1
        diff2 = all - n2
        assert len(diff1) == 0, f"{n2} has more k-v pairs than {n1}"
        assert len(diff2) == 0, f"{n1} has more k-v pairs than {n2}"

    print("Critical nodes (which are both in trout and filah) contain the same information")

    links_journalist = set_links(graphs['journalist']['links'])
    links_FILAH = set_links(graphs['FILAH']['links'])
    links_TROUT = set_links(graphs['TROUT']['links'])

    link_overlap_trout_filah = links_FILAH & links_TROUT
    print("overlapping links TROUT FILAH:", len(link_overlap_trout_filah))

    link_overlap_trout_journalist = links_TROUT & links_journalist
    print("overlapping links TROUT Journalist:", len(link_overlap_trout_journalist),
          "\n -> percentage of links also contained in journalist:", 100*len(link_overlap_trout_journalist)/len(links_TROUT))

    link_overlap_FILAH_journalist = links_FILAH & links_journalist
    print("overlapping links FILAH Journalist:", len(link_overlap_FILAH_journalist),
          "\n -> percentage of links also contained in journalist:", 100*len(link_overlap_FILAH_journalist)/len(links_FILAH))

    links_journalist_only = links_journalist - links_FILAH - links_TROUT
    print("Additional links in journalist graph:", len(links_journalist_only))

    for link in link_overlap_trout_filah:
        lid = link_id(dict(link))
        n1 = get_link(graphs['TROUT']['links'], lid)
        n2 = get_link(graphs['FILAH']['links'], lid)

        n1 = set([(k, str(val)) for k, val in n1.items()])
        n2 = set([(k, str(val)) for k, val in n2.items()])
        assert len(n1) == len(
            n2), f"different amount of k-v pairs for {n1}, {n2}"

        all = n1 | n2
        diff1 = all - n1
        diff2 = all - n2
        assert len(diff1) == 0, f"{n2} has more k-v pairs than {n1}"
        assert len(diff2) == 0, f"{n1} has more k-v pairs than {n2}"

    print("Critical links (which are both in trout and filah) contain the same information")


def repair():
    """
    Repairs and processes graph data by fixing missing attributes, combining data from multiple graphs, 
    and normalizing date and time formats.
    This function performs the following operations:
    1. Repairs nodes with missing 'type' attributes by inferring and assigning appropriate types.
    2. Fixes links with missing 'role' attributes by inferring their roles.
    3. Combines data from three graphs ('jo', 'fi', 'tr') into unified dictionaries for nodes and links, 
        ensuring unique entities have merged attributes and tracking their membership across graphs.
    4. Normalizes date and time formats in the combined data.
    Returns:
         tuple: A tuple containing:
              - all_nodes (dict): A dictionary of all unique nodes with combined attributes.
              - all_links (dict): A dictionary of all unique links with combined attributes.
    Note:
         - The function assumes the presence of helper functions such as `load_files`, 
            `missing_attr_entities`, `infer_link_role`, and `link_id`.
         - The `in_graph` attribute is added to track the membership of nodes and links in the original graphs.
    Disclaimer:
         This docstring was generated with the assistance of an AI model and may therefore be inaccurate.
    """

    graphs = [*load_files()]

    # repairing place nodes with missing type
    for graph in graphs:
        for node in graph['nodes']:
            if 'lat' in node and 'type' not in node:
                node['type'] = 'place'

    missing_journalist_nodes = missing_attr_entities(graphs[0], 'type')
    def check(
        i, id): assert missing_journalist_nodes[i]['id'] == id, "Data might have changed"

    def add_type(i, type): missing_journalist_nodes[i]['type'] = type

    check(0, "Bay Harvest Corporation")
    add_type(0, 'entity.organization')
    check(1, "name_harbor_area_Meeting_11_Harbor_Odyssey_Tours")
    add_type(1, 'plan')
    check(2, "Harbor Odyssey Tours")
    add_type(2, 'entity.organization')
    check(3, 10803677425)
    add_type(3, 'place')
    check(4, "Sean")
    add_type(4, 'entity.person')
    check(5, "concert_Travel_Harborfront_Market")
    add_type(5, 'plan')

    # Repairing links that don't have their role specified
    for graph in graphs:
        missing_links = missing_attr_entities(graph, 'role', nodes=False)

        for link in missing_links:
            infer_link_role(graph, link)

    all_nodes = defaultdict(dict)
    all_links = defaultdict(dict)

    jo, fi, tr = graphs

    all_graphs = {
        "jo": jo,
        "fi": fi,
        "tr": tr
    }

    in_graph_attr = 'in_graph'

    # make sure each unique node and link have combined attribute values of the three graphs
    # add graph dataset membership information regarding trout/journalist/filah
    for graph_id, graph in all_graphs.items():
        for node in graph['nodes']:
            all_nodes[node['id']].update(node)
            if in_graph_attr not in all_nodes[node['id']]:
                all_nodes[node['id']][in_graph_attr] = []
            all_nodes[node['id']][in_graph_attr].append(graph_id)

        for link in graph['links']:
            all_links[link_id(link)].update(link)
            if in_graph_attr not in all_links[link_id(link)]:
                all_links[link_id(link)][in_graph_attr] = []
            all_links[link_id(link)][in_graph_attr].append(graph_id)

    for v in all_nodes.values():
        if 'date' in v:
            if v['date'].startswith("00"):
                v['date'] = "2" + v['date'][1:]

            if v['date'].startswith("20"):
                v['date'] = datetime.date(*[int(v)
                                          for v in (v['date']).split("-")])

    for v in all_links.values():
        if 'time' in v:
            if v['time'].startswith("00"):
                v['time'] = "2" + v['time'][1:]

            if v['time'].startswith("20"):
                v['time'] = datetime.datetime.fromisoformat(v['time'])

    return all_nodes, all_links


def to_database(all_nodes, all_links):
    """
    Transfers data into a Neo4j database by creating nodes and relationships 
    based on the provided data. The function also clears the database before 
    inserting new data and establishes additional relationships for the roadmap.
    Args:
        all_nodes (dict): A dictionary where keys are node IDs and values are 
            dictionaries containing node attributes. Each node must have a 
            'type' field that specifies its label.
        all_links (dict): A dictionary where keys are link IDs and values are 
            dictionaries containing link attributes. Each link must have 
            'source', 'target', and 'role' fields.
    Raises:
        AssertionError: If a node has an unknown label or a link has an unknown 
            relationship type.
    Notes:
        - The function connects to a Neo4j/Memgraph database running locally on 
          `bolt://localhost:7687`.
        - The database is cleared of all existing data before new data is 
          inserted.
        - Additional nodes and relationships are created for a roadmap, which 
          is loaded using the `load_road_map` function.
    Disclaimer:
        This docstring was generated with the assistance of AI.
    """

    URI = "bolt://localhost:7687"

    driver = GraphDatabase.driver(URI, auth=('neo4j', 'ava25-DB!!'))
    driver.verify_connectivity()

    def delete_all():
        q = "match (n) detach delete n"
        driver.execute_query(q)

    def node_to_cypher(node: dict):
        # there should be no case where this happens
        label = node.pop('type', 'LABEL_UNKNOWN')
        assert label != "LABEL_UNKNOWN", "There are nodes with unknown labels" + \
            f"{node}"
        label = label.upper().replace('.', '_')

        formatted_attrs = ", ".join(
            f'{k}: ${k}' for k in node
        )

        q = f"CREATE (n:{label} {{ {formatted_attrs} }})"

        driver.execute_query(q, node)

    def link_to_cypher(link: dict):
        label = link.pop('role', 'REL_TYPE_UNKOWN')
        assert label != "REL_TYPE_UNKOWN"
        label = label.upper().replace('.', '_')
        source_id = link.pop('source')
        target_id = link.pop('target')

        formatted_attrs = ", ".join(
            f'{k}: ${k}' for k in link
        )

        q = f"MATCH (a {{id:$source_id}}), (b {{id:$target_id}}) CREATE (a)-[r:{label} {{ {formatted_attrs} }}]->(b)"

        link.update({"source_id": source_id, "target_id": target_id})
        driver.execute_query(q, link)

    delete_all()

    for node in all_nodes.values():
        node_to_cypher(node)

    for link in all_links.values():
        link_to_cypher(link)

    roadmap = load_road_map()
    for node in roadmap['nodes']:
        node['type'] = "ROADMAP_PLACE"
        node_to_cypher(node)

    driver.execute_query(
        "match (rp:ROADMAP_PLACE), (p:PLACE) where rp.id = p.id merge (rp)-[:IS]->(p)")

    for link in roadmap['links']:
        q = "match (rp1:ROADMAP_PLACE {id : $source}), (rp2:ROADMAP_PLACE {id : $target}) merge (rp1)-[:ROUTE {key : $key}]-(rp2)"
        driver.execute_query(
            q, {"source": link['source'], "target": link["target"], "key": link["key"]})


if __name__ == "__main__":
    check()

    to_database(*repair())

    print("\n\n Data successfully loaded in database.")
