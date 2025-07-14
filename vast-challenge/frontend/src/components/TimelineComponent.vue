<template>
  <div class="w-full h-full relative">
    <div ref="timelineContainer" class="timeline-container w-full h-full"></div>
    <div class="absolute top-2 right-2 z-10 flex items-center space-x-2">
      <button @click="resetZoom" class="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
 <path d="M12 5V1L7 6L12 11V7C15.31 7 18 9.69 18 13C18 16.31 15.31 19 12 19C8.69 19 6 16.31 6 13H4C4 17.42 7.58 21 12 21C16.42 21 20 17.42 20 13C20 8.58 16.42 5 12 5Z" fill="currentColor"/> 
        </svg>
      </button>
      <div class="relative">
        <button @mouseover="showHelp = true" @mouseleave="showHelp = false" class="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <transition name="fade">
          <div v-if="showHelp" class="absolute right-0 mt-2 w-72 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 text-sm text-gray-800">
            <p class="font-bold text-lg mb-3 text-gray-900">Timeline Interactions</p>
            <ul class="space-y-3">
              <li class="flex items-center">
                <svg class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L8 9l11 4-5 2zm0 0l5 5M7.5 8.5A2.5 2.5 0 0110 6v0a2.5 2.5 0 012.5 2.5v0" /></svg>
                <div><span class="font-semibold">Hover</span> over trips or avatars for details.</div>
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-purple-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10l-2 2m2-2l2 2" /></svg>
                <div><span class="font-semibold">Scroll/Pan</span> to zoom and navigate the timeline.</div>
              </li>
               <li class="flex items-center">
                <svg class="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.18-3.185m-3.181-4.991v-4.992a8.25 8.25 0 0 0-11.664 0l-3.18 3.185" /></svg>
                <div><span class="font-semibold">Click the icon</span> to reset zoom.</div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useEntityStore } from '../stores/entityStore';
import { useLinkingStore, FilterType } from '../stores/linkingStore';
import { useMapStore } from '../stores/mapStore';
import { toRaw } from 'vue';
import { zoneColors } from '../utils/colors';

export default {
  data() {
    return {
      FilterType,
      showHelp: false,
      timelineContainer: null,
      entityStore: useEntityStore(),
      linkingStore: useLinkingStore(),
      mapStore: useMapStore(),
      tooltip: null,
      eventRects: null,
      zoneColors: zoneColors,
      resizeObserver: null,
    };
  },
  computed: {
    persons() {

      return [...this.entityStore.persons].sort((a, b) => a.id.localeCompare(b.id));
    },
    personIds() {

      return this.persons.map(p => p.id);
    },

    personZoneDistribution() {
      const distribution = {};
      this.persons.forEach(person => {
        const personTrips = this.allEvents.filter(event => event.personId === person.id);
        const zoneCounts = personTrips.reduce((acc, trip) => {
          for (const zone in trip.zoneCounts) {
            acc[zone] = (acc[zone] || 0) + trip.zoneCounts[zone];
          }
          return acc;
        }, {});
        distribution[person.id] = zoneCounts;
      });
      return distribution;
    },

    allEvents() {
      const allTrips = [];
      for (const personId in this.entityStore.personTripActivities) {
        const trips = this.entityStore.personTripActivities[personId];
        trips.forEach(trip => {
          if (trip && trip.visited_places && trip.visited_places.length > 0) {
            const zoneCounts = trip.visited_places.reduce((acc, p) => {
              const zone = p.place.zone || 'default';
              acc[zone] = (acc[zone] || 0) + 1;
              return acc;
            }, {});

            allTrips.push({
              trip: toRaw(trip),
              personId: personId,
              startTime: new Date(trip.visited_places[0]?.visit_rel.time),
              endTime: new Date(trip.visited_places[trip.visited_places.length - 1]?.visit_rel.time),
              startZone: trip.visited_places[0]?.place.zone,
              visitedPlaceNames: trip.visited_places.map(p => p.place.name || p.place.label),
              visitedPlaceIds: trip.visited_places.map(p => p.place.id),
              zoneCounts: zoneCounts,
            });
          }
        });
      }

      return allTrips.filter(d => d.startTime instanceof Date && !isNaN(d.startTime) && d.endTime instanceof Date && !isNaN(d.endTime));
    },
    filteredEvents() {
      let events = this.allEvents;

      // Filter by active sidebar filters
      if (this.linkingStore.activeFilters.length > 0) {
        const placeFilterValues = this.linkingStore.activeFilters.filter(f => f.type === this.FilterType.PLACE).flatMap(f => f.value);
        const otherFilters = this.linkingStore.activeFilters.filter(f => f.type !== this.FilterType.PLACE);

        events = events.filter(event => {
          const passesPlaceFilter = placeFilterValues.length === 0 || event.visitedPlaceIds.some(placeId => placeFilterValues.includes(placeId));

          const passesOtherFilters = otherFilters.length === 0 || otherFilters.every(filter => {
            return event.trip.visited_places.some(visitedPlace => {
              const place = visitedPlace.place;
              if (!place || !place.id) return false;
              if (filter.type === 'island') {
                const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(place.id);
                return parentFeatureName === filter.value;
              } else if (filter.type === 'zone') {
                return place.zone === filter.value;
              } else if (filter.type === 'in_graph') {
                return place.in_graph && Array.isArray(place.in_graph) && place.in_graph.includes(filter.value);
              }
              return false;
            });
          });

          return passesPlaceFilter && passesOtherFilters;
        });
      }

      // Filter by excluded sidebar filters
      if (this.linkingStore.excludedFilters.length > 0) {
        events = events.filter(event => {
          return !this.linkingStore.excludedFilters.some(filter => {
            return event.trip.visited_places.some(visitedPlace => {
              const place = visitedPlace.place;
              if (!place || !place.id) return false;
              if (filter.type === 'island') {
                const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(place.id);
                return parentFeatureName === filter.value;
              } else if (filter.type === 'zone') {
                return place.zone === filter.value;
              } else if (filter.type === 'in_graph') {
                return place.in_graph && Array.isArray(place.in_graph) && place.in_graph.includes(filter.value);
              }
              return false;
            });
          });
        });
      }

      return events;
    },
  },
  watch: {
    'linkingStore.activeFilters': {
      handler() {
        this.$nextTick(this.drawTimeline);
      },
      deep: true,
    },
    'linkingStore.excludedFilters': {
      handler() {
        this.$nextTick(this.drawTimeline);
      },
      deep: true,
    },
    'linkingStore.hoverHighlights': {
      handler() {
        this.updateHighlighting();
      },
      deep: true,
    },
    'linkingStore.hoveredFilters': {
      handler() {
        this.updatePreviewHighlighting();
      },
      deep: true,
    },
    'entityStore.personTripActivities': {
      handler() {


        this.$nextTick(this.drawTimeline);
      },
      deep: true,
    },
    'entityStore.persons': {
      handler() {
        this.$nextTick(this.drawTimeline);
      },
      deep: true,
    },
  },
  mounted() {
    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
      .style("z-index", "50");

    this.$nextTick(() => {
      if (this.$refs.timelineContainer) {
        this.resizeObserver = new ResizeObserver(() => {
          this.drawTimeline();
        });
        this.resizeObserver.observe(this.$refs.timelineContainer);
      }
    });
  },
  beforeUnmount() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  methods: {
    pieChartTooltipFormatter(personData) {
      const personName = personData.name;
      const zoneData = this.personZoneDistribution[personData.id];
      if (!zoneData) return '';

      const totalVisits = Object.values(zoneData).reduce((a, b) => a + b, 0);

      let zoneDetails = '<ul class="mt-2 space-y-1">';
      if (totalVisits > 0) {
        const sortedZones = Object.entries(zoneData).sort((a, b) => b[1] - a[1]);
        for (const [zone, count] of sortedZones) {
          const percentage = ((count / totalVisits) * 100).toFixed(1);
          zoneDetails += `
            <li class="flex items-center text-xs w-48">
              <span class="w-3 h-3 rounded-full mr-2 flex-shrink-0" style="background-color: ${this.zoneColors[zone] || this.zoneColors.default};"></span>
              <span class="font-semibold mr-1 truncate">${zone}:</span>
              <span class="text-gray-600 mr-1">${count}</span>
              <span class="ml-auto font-medium">${percentage}%</span>
            </li>
          `;
        }
      } else {
        zoneDetails += '<li>No visits recorded.</li>';
      }
      zoneDetails += '</ul>';

      return `
        <div class="font-bold text-base text-gray-800 mb-1">${personName}</div>
        <div class="text-sm text-gray-500 border-b pb-1">Zone Visit Distribution</div>
        ${zoneDetails}
      `;
    },
    getInitials(name) {
      if (!name) return '??';
      const parts = name.split(' ');
      if (parts.length > 1 && parts[1]) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    },
    tooltipFormatter(d) {
      const person = this.persons.find(p => p.id === d.personId);
      const personName = person ? person.name : 'Unknown';
      return `
        <div class="font-semibold text-blue-700">Trip ID: ${d.trip.trip.id}</div>
        <div>Person: ${personName} (${d.personId})</div>
        <div>Start Time: ${d.startTime.toLocaleTimeString()}</div>
        <div>End Time: ${d.endTime.toLocaleTimeString()}</div>
        <div>
          Visited Places:
          <ul>
            ${d.trip.visited_places.map(p => `
              <li class="flex items-center">
                <span class="w-3 h-3 rounded-full mr-2" style="background-color: ${this.zoneColors[p.place.zone] || this.zoneColors.default};"></span>
                ${p.place.name||p.place.label} (${p.place.zone})
              </li>`).join('')}
          </ul>
        </div>
      `;
    },
    drawTimeline() {
      if (!this.$refs.timelineContainer) return;

      const container = d3.select(this.$refs.timelineContainer);
      container.select('svg').remove();


      const filteredEvents = this.filteredEvents;

      if (filteredEvents.length === 0 || this.personIds.length === 0) {
        return;
      }

      const width = this.$refs.timelineContainer.getBoundingClientRect().width;
      const height = this.$refs.timelineContainer.getBoundingClientRect().height;
      const marginTop = 20;
      const marginRight = 50;
      const marginBottom = 60;
      const marginLeft = 50;

      const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);


      svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("x", marginLeft)
        .attr("y", marginTop);

      const allTimes = filteredEvents.reduce((acc, e) => acc.concat([e.startTime, e.endTime]), []);
      if (allTimes.length === 0) return;

      const extent = d3.extent(allTimes);

      const xScale = d3.scaleTime()
        .domain(extent)
        .range([marginLeft, width - marginRight]);

      const xAxis = d3.axisBottom(xScale)
        .tickSize(5)
        .tickPadding(10)
        .tickFormat(d3.timeFormat('%b %d'));

      const xAxisGroup = svg.append('g')
        .attr('transform', `translate(0, ${height - marginBottom})`)
        .attr('class', 'axis x-axis')
        .call(xAxis);

      xAxisGroup.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

      const yScale = d3.scaleBand()
        .domain(this.personIds)
        .range([marginTop, height - marginBottom])
        .padding(0.2);

      svg.append('g')
        .attr('transform', `translate(${marginLeft}, 0)`)
        .attr('class', 'axis y-axis')
        .call(d3.axisLeft(yScale)
          .tickSize(0)
          .tickPadding(5)
          .tickFormat(() => ''));

      const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(this.personIds);


      const personAvatars = svg.selectAll('.person-avatar')
        .data(this.persons)
        .enter()
        .append('g')
        .attr('class', 'person-avatar')
        .attr('transform', d => `translate(${marginLeft / 2}, ${(yScale(d.id) ?? 0) + yScale.bandwidth() / 2})`)
        .on("mouseover", (event, d) => {
          if (this.tooltip) {
            this.tooltip
              .classed("hidden", false)
              .html(this.pieChartTooltipFormatter(d));
          }
        })
        .on("mousemove", (event) => {
          if (this.tooltip) {
            this.tooltip
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          }
        })
        .on("mouseout", () => {
          if (this.tooltip) {
            this.tooltip.classed("hidden", true);
          }
        });

      personAvatars.each((person, i, nodes) => {
        const avatarGroup = d3.select(nodes[i]);
        const radius = Math.min(16, yScale.bandwidth() / 2 * 0.9);
        const zoneData = this.personZoneDistribution[person.id];

        if (Object.keys(zoneData).length > 0) {
          const pie = d3.pie().value(d => d[1]);
          const arc = d3.arc().innerRadius(0).outerRadius(radius);
          const pieData = pie(Object.entries(zoneData));

          avatarGroup.selectAll('path')
            .data(pieData)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => this.zoneColors[d.data[0]] || this.zoneColors.default);
        } else {
          avatarGroup.append('circle')
            .attr('r', radius)
            .style('fill', colorScale(person.id));
        }

        avatarGroup.append('text')
          .text(d => this.getInitials(d.name))
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .style('fill', 'white')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none');
      });

      svg.selectAll('.y-grid-line')
        .data(yScale.domain())
        .enter()
        .append('line')
        .attr('class', 'y-grid-line')
        .attr('x1', marginLeft)
        .attr('x2', width - marginRight)
        .attr('y1', d => (yScale(d) ?? 0) + yScale.bandwidth() / 2)
        .attr('y2', d => (yScale(d) ?? 0) + yScale.bandwidth() / 2)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 0.5);

      const chartArea = svg.append('g')
        .attr("clip-path", "url(#clip)");

      this.eventRects = chartArea.selectAll('.event-group')
        .data(filteredEvents)
        .enter()
        .append('g')
        .attr('class', 'event-group')
        .attr('transform', d => `translate(${xScale(d.startTime)}, ${yScale(d.personId) ?? 0})`)
        .on("mouseover", (event, d) => {
          if (this.tooltip) {
            this.tooltip
              .classed("hidden", false)
              .html(this.tooltipFormatter(d));
            d3.select(event.currentTarget).selectAll('rect').style('opacity', 1);
            const highlights = d.visitedPlaceIds.map(id => ({ type: 'place', value: id }));
            highlights.push({ type: 'trip', value: d.trip.trip.id });
            this.linkingStore.setHoverHighlights(highlights);
          }
        })
        .on("mousemove", (event) => {
          if (this.tooltip) {
            this.tooltip
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          }
        })
        .on("mouseout", (event) => {
          if (this.tooltip) {
            this.tooltip.classed("hidden", true);
            d3.select(event.currentTarget).selectAll('rect').style('opacity', 0.8);
            this.linkingStore.setHoverHighlights([]);
          }
        });

      this.eventRects.each((d, i, nodes) => {
        const group = d3.select(nodes[i]);
        const totalVisits = Object.values(d.zoneCounts).reduce((a, b) => a + b, 0);
        if (totalVisits === 0) return;

        const tripWidth = Math.max(0, xScale(d.endTime) - xScale(d.startTime));
        const tripHeight = yScale.bandwidth();
        let currentY = 0;

        const sortedZones = Object.entries(d.zoneCounts).sort((a, b) => a[1] - b[1]);

        for (const [zone, count] of sortedZones) {
          const segmentHeight = (count / totalVisits) * tripHeight;

          group.append('rect')
            .attr('class', 'event-segment')
            .attr('x', 0)
            .attr('y', currentY)
            .attr('width', tripWidth)
            .attr('height', segmentHeight)
            .attr('fill', this.zoneColors[zone] || this.zoneColors.default)
            .style('opacity', 0.8);

          currentY += segmentHeight;
        }
      });

      this.zoom = d3.zoom()
        .scaleExtent([0.5, 20])
        .translateExtent([[0, 0], [width, height]])
        .on('zoom', (event) => {
          const newXScale = event.transform.rescaleX(xScale);
          xAxisGroup.call(xAxis.scale(newXScale));
          xAxisGroup.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

          this.eventRects
            .attr('transform', d => `translate(${newXScale(d.startTime)}, ${yScale(d.personId) ?? 0})`);

          this.eventRects.each(function (d) {
            const group = d3.select(this);
            group.selectAll('.event-segment').remove(); 

            const totalVisits = Object.values(d.zoneCounts).reduce((a, b) => a + b, 0);
            if (totalVisits === 0) return;

            const tripWidth = Math.max(0, newXScale(d.endTime) - newXScale(d.startTime));
            const tripHeight = yScale.bandwidth();
            let currentY = 0;

            const sortedZones = Object.entries(d.zoneCounts).sort((a, b) => a[1] - b[1]);

            for (const [zone, count] of sortedZones) {
              const segmentHeight = (count / totalVisits) * tripHeight;

              group.append('rect')
                .attr('class', 'event-segment')
                .attr('x', 0)
                .attr('y', currentY)
                .attr('width', tripWidth)
                .attr('height', segmentHeight)
                .attr('fill', zoneColors[zone] || zoneColors.default)
                .style('opacity', 0.8);

              currentY += segmentHeight;
            }
          });
        });

      svg.call(this.zoom);

      this.updateHighlighting();
    },

    resetZoom() {
      const svg = d3.select(this.$refs.timelineContainer).select('svg');
      if (svg && this.zoom) {
        svg.transition().duration(750).call(this.zoom.transform, d3.zoomIdentity);
      }
    },
    updatePreviewHighlighting() {
      if (!this.eventRects) return;

      const hoveredFilters = this.linkingStore.hoveredFilters;

      this.eventRects.selectAll('rect').style('opacity', d => {
        if (hoveredFilters.length === 0) {
          return 0.8;
        }

        const isHovered = hoveredFilters.every(filter => {
          return d.trip.visited_places.some(visitedPlace => {
            const place = visitedPlace.place;
            if (!place || !place.id) return false;

            if (filter.type === 'island') {
              const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(place.id);
              return parentFeatureName === filter.value;
            } else if (filter.type === 'zone') {
              return place.zone === filter.value;
            } else if (filter.type === 'in_graph') {
              return place.in_graph && Array.isArray(place.in_graph) && place.in_graph.includes(filter.value);
            }
            return false;
          });
        });

        return isHovered ? 1.0 : 0.3;
      });
    },
    updateHighlighting() {
      if (!this.eventRects) return;

      const { hoverHighlights } = this.linkingStore;
      const highlightedTrips = hoverHighlights.filter(h => h.type === 'trip').map(h => h.value);
      const highlightedPlaces = hoverHighlights.filter(h => h.type === 'place').map(h => h.value);
      const isTripHover = hoverHighlights.some(h => h.type === 'trip');

      this.eventRects
        .each(function (d) {
          const group = d3.select(this);
          let isHighlighted = false;

          if (isTripHover) {
            isHighlighted = highlightedTrips.includes(d.trip.trip.id);
          } else {
            isHighlighted = d.visitedPlaceIds.some(id => highlightedPlaces.includes(id));
          }

          group.selectAll('rect')
            .style('stroke', isHighlighted ? 'red' : 'none')
            .style('stroke-width', isHighlighted ? 2 : 0)
            .style('opacity', () => {
              if (hoverHighlights.length > 0) {
                return isHighlighted ? 0.8 : 0.3;
              }
              return 0.8;
            });
        });
    },
  },
};
</script>

<style scoped>
.event {
  pointer-events: all;
}

.timeline-container :deep(.axis.x-axis .tick text) {
  font-size: 0.75rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
