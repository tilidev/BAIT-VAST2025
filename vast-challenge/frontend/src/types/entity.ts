export type Entity =
  | "ENTITY_PERSON"
  | "ENTITY_ORGANIZATION"
  | "DISCUSSION"
  | "PLACE"
  | "ROADMAP_PLACE"
  | "MEETING"
  | "PLAN"
  | "TOPIC"
  | "TRIP";

export type GraphMembership = "jo" | "fi" | "tr"; // Journalist, Filah, Trout

export interface TopicSentiment {
  topic_id: string;
  sentiment: number | null;
  sentiment_recorded_in: GraphMembership[];
  topic_industry: string[] | null;
}

export interface EntityTopicSentiment {
  entity_id: string;
  entity_type: Entity; // Uses the existing Entity type
  node_in_graph: GraphMembership[];
  topic_sentiments: TopicSentiment[];
}

export interface DatasetNodeCount {
  dataset: GraphMembership;
  nodeCount: number;
}

export interface IndustrySentimentRaw {
  industry: string;
  dataset: GraphMembership | 'all';
  sentiment_positive: boolean;
  agg_sentiment: number;
}
