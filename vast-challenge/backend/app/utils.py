from datetime import datetime

from neo4j.time import Date, Time


def convert(value):
    # https://neo4j.com/docs/api/python-driver/current/types/temporal.html
    if isinstance(value, (Date, Time)):
        return value.to_native()
    return value


def convert_attr_values(node_or_link: dict, attrs: list = None) -> dict:
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
