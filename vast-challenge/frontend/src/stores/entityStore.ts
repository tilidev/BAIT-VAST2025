// stores/entityStore.ts
import { defineStore } from 'pinia'
import type { Person, Organization, Place, Meeting, Plan, Topic, Trip } from '../types/nodeTypes.ts'
import { fetchEntity } from '../services/entityService.ts'

interface IEntityState {
  persons: Person[],
  organizations: Organization[],
  places: Place[],
  meetings: Meeting[],
  plans: Plan[],
  topics: Topic[],
  trips: Trip[],
}
export const useEntityStore = defineStore('entity', {
  state: (): IEntityState => {
    return {
      persons: [],
      organizations: [],
      places: [],
      meetings: [],
      plans: [],
      topics: [],
      trips: [],
    }
  },

  actions: {
    async init() {
      const [
        organizations,
        places,
        meetings,
        plans,
        topics,
        trips,
        persons
      ] = await Promise.all([
        fetchEntity('ENTITY_ORGANIZATION'),
        fetchEntity('PLACE'),
        fetchEntity('MEETING'),
        fetchEntity('PLAN'),
        fetchEntity('TOPIC'),
        fetchEntity('TRIP'),
        fetchEntity('ENTITY_PERSON')
      ])

      this.setOrganization(organizations)
      this.setPlace(places)
      this.setMeeting(meetings)
      this.setPlan(plans)
      this.setTopic(topics)
      this.setTrip(trips)
      this.setPerson(persons)
    },
    setTrip(trips: Trip[]) {
      this.trips = trips
    },
    setTopic(topics: Topic[]) {
      this.topics = topics
    },
    setPlan(plans: Plan[]) {
      this.plans = plans
    },
    setMeeting(meetings: Meeting[]) {
      this.meetings = meetings
    },
    setPlace(places: Place[]) {
      this.places = places
    },
    setOrganization(organizations: Organization[]) {
      this.organizations = organizations
    },
    setPerson(persons: Person[]) {
      this.persons = persons
    },
  },
})
