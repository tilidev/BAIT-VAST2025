// stores/entityStore.ts
import { defineStore } from 'pinia'
import type { Person, Organization, Place, Meeting, Plan, Topic, Trip, TripActivity } from '../types/nodeTypes.ts'
import { fetchEntity, fetchTripActivityByPerson } from '../services/entityService.ts'
import { useMapStore } from './mapStore.ts'

interface IEntityState {
  persons: Person[],
  organizations: Organization[],
  places: Place[],
  meetings: Meeting[],
  plans: Plan[],
  topics: Topic[],
  trips: Trip[],
  selectedTripId: string | null,
  personTripActivities: {[personId: string]: TripActivity[]}
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
      selectedTripId: null,
      personTripActivities: {}
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
      
      const mapStore = useMapStore();
      if (mapStore.features.length === 0) {
        await mapStore.loadGeoJsonData();
      }
      const placesWithParent = places.map((place: Place, index: number) => {
        
        if (typeof place.lon !== 'number' || typeof place.lat !== 'number') {
          console.warn(`Skipping place ${place.id} due to invalid coordinates: lon=${place.lon}, lat=${place.lat}`);
          return place;
        }

        const features = mapStore.getFeaturesByCoordinates(place.lon, place.lat);
        if (features.length > 0) {
          const parentFeatureName = features[0].properties.Name;
          mapStore.addPlaceToFeatureMap(parentFeatureName, place);
          mapStore.setPlaceIdToParentFeatureMap(place.id, parentFeatureName);
          return { ...place, parent: parentFeatureName };
        }
        return place;
      });
      this.setPlace(placesWithParent);

      const personTripActivitiesMap: {[personId: string]: TripActivity[]} = {};
      const tripActivities = await Promise.all(
          persons.map(async (person: Person) => {
              const tripActivities = await fetchTripActivityByPerson(person.id);
              personTripActivitiesMap[person.id] = tripActivities;
          })
      );
      this.personTripActivities = personTripActivitiesMap;

      const placeToTripIds = new Map<string, Set<string>>();
      for (const personId in this.personTripActivities) {
        const trips = this.personTripActivities[personId];
        trips.forEach(tripActivity => {
          if (tripActivity && tripActivity.trip && tripActivity.visited_places) {
            const tripId = tripActivity.trip.id;
            tripActivity.visited_places.forEach(visitedPlace => {
              if (visitedPlace && visitedPlace.place) {
                const placeId = visitedPlace.place.id;
                if (!placeToTripIds.has(placeId)) {
                  placeToTripIds.set(placeId, new Set());
                }
                placeToTripIds.get(placeId)?.add(tripId);
              }
            });
          }
        });
      }

      this.places = this.places.map(place => {
        const tripIds = placeToTripIds.get(place.id);
        return {
          ...place,
          trip_ids: tripIds ? Array.from(tripIds) : []
        };
      });
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
      this.places = places.filter(p => p && p.id != null);
    },
    setOrganization(organizations: Organization[]) {
      this.organizations = organizations
    },
    setPerson(persons: Person[]) {
      this.persons = persons
    },
    setSelectedTripId(tripId: string | null) {
      this.selectedTripId = tripId
    },
  },
})
