from enum import StrEnum

from pydantic import BaseModel, Field

class Entity(StrEnum):
    PERSON = "ENTITY_PERSON"
    ORGANIZATION = "ENTITY_ORGANIZATION"
    DISCUSSION = "DISCUSSION"
    PLACE = "PLACE"
    ROADMAP_PLACE = "ROADMAP_PLACE"
    MEETING = "MEETING"
    PLAN = "PLAN"
    TOPIC = "TOPIC"
    TRIP = "TRIP"

class GraphMembership(StrEnum):
    JOURNALIST = "jo"
    FILAH = "fi"
    TROUT = "tr"


class BaseGraphObject(BaseModel):
    """
    Base class representing a graph object, which can be either a node or a link. (Not applicable for ROADMAP_PLACE)
    All graph objects have a unique identifier (`id`) and a list of graph memberships (`in_graph`).
    Attributes:
        in_graph (list[GraphMembership]): List of graph memberships indicating the graphs this object belongs to.
        id (str | int): Unique identifier for the graph object.
    """

    in_graph : list[GraphMembership]
    id : str | int

    class Config:
        extra = 'allow'

class TopicSentiment(BaseModel):
    topic_id : str
    sentiment : float | None
    sentiment_recorded_in : list[GraphMembership]
    topic_industry : list[str] | None

class EntityTopicSentiment(BaseModel):
    entity_id : str
    entity_type : Entity
    node_in_graph : list[GraphMembership]
    topic_sentiments : list[TopicSentiment]