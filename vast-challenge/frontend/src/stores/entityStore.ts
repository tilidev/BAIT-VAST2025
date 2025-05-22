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
      this.setOrganization(await fetchEntity('ENTITY_ORGANIZATION'))
      this.setPlace(await fetchEntity('PLACE'))
      this.setMeeting(await fetchEntity('MEETING'))
      this.setPlan(await fetchEntity('PLAN'))
      this.setTopic(await fetchEntity('TOPIC'))
      this.setTrip(await fetchEntity('TRIP'))
      this.setPerson(await fetchEntity('ENTITY_PERSON'))
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
