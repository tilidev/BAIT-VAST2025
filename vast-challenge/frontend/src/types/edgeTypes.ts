export type Edge =
  | TripToPlace
  | TripToPerson
  | PlanToPerson
  | DiscussionToPlan
  | PlanToTopic
  | PlanToPlace
  | DiscussionToTopic
  | MeetingToDiscussion
  | MeetingToPlan
  | DiscussionToPerson
  | DiscussionToPlace
  | DiscussionToOrganization
  | PlanToOrganization;

export type TripToPlace = {
  type: "trip_to_place";
  source: string; // Trip ID
  target: string; // Place ID
  time: string;
};

export type TripToPerson = {
  type: "trip_to_person";
  source: string; // Trip ID
  target: string; // Person ID
};

export type PlanToPerson = {
  type: "participant_plan_person";
  source: string; // Plan ID
  target: string; // Person ID
  role: "participant";
  sentiment?: string | null;
  reason?: string;
  industry?: string;
};

export type DiscussionToPlan = {
  type: "about_discussion_plan";
  source: string; // Discussion ID
  target: string; // Plan ID
  role: "about";
  status: string;
};

export type PlanToTopic = {
  type: "plan_topic";
  source: string;
  target: string;
  role: "plan";
};

export type PlanToPlace = {
  type: "travel_plan_place";
  source: string;
  target: string;
  role: "travel";
};

export type DiscussionToTopic = {
  type: "about_discussion_topic";
  source: string;
  target: string;
  role: "about";
};

export type MeetingToDiscussion = {
  type: "part_of_meeting_discussion";
  source: string;
  target: string;
  role: "Part of";
};

export type MeetingToPlan = {
  type: "part_of_meeting_plan";
  source: string;
  target: string;
  role: "Part of";
};

export type DiscussionToPerson = {
  type: "participant_discussion_person";
  source: string;
  target: string;
  role: "participant";
  sentiment?: string | null;
  reason?: string;
  industry?: string;
};

export type DiscussionToPlace = {
  type: "refers_to_discussion_place";
  source: string;
  target: string;
};

export type DiscussionToOrganization = {
  type: "participant_discussion_organization";
  source: string;
  target: string;
  role: "participant";
  sentiment?: string | null;
  reason?: string;
  industry?: string;
};

export type PlanToOrganization = {
  type: "participant_plan_organization";
  source: string;
  target: string;
  role: "participant";
  sentiment?: string | null;
  reason?: string;
  industry?: string;
};
