import type { Entity } from './entity.ts'
type BaseNode = {
  id: string;
  in_graph?: string[];
};

export type Node =
  | Place
  | Plan
  | Discussion
  | Organization
  | Person
  | Topic
  | Trip
  | Meeting;


export type Place = BaseNode & {
  type: "place";
  lat: number;
  lon: number;
  zone: string;
  zone_detail?: string;
  label: string;
  parent?: string;
};

export type Plan = BaseNode & {
  type: "plan";
  short_title: string;
  long_title: string;
  plan_type: string;
  label: string;
};

export type Discussion = BaseNode & {
  type: "discussion";
  short_title: string;
  long_title: string;
  label: string;
};

export type Organization = BaseNode & {
  type: "entity.organization";
};

export type Person = BaseNode & {
  type: "ENTITY_PERSON";
  name: string;
  role: string;
};

export type Topic = BaseNode & {
  type: "topic";
  short_topic: string;
  long_topic: string;
  label: string;
};

export type Trip = BaseNode & {
  type: "trip";
  date: string;
  start: string;
  end: string;
};

export type Meeting = BaseNode & {
  type: "meeting";
  date: string;
  label: string;
};
