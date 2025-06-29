<template>
  <div ref="timelineContainer" class="timeline-container">
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useEntityStore } from '../stores/entityStore';
import { useLinkingStore } from '../stores/linkingStore';
import { useMapStore } from '../stores/mapStore';
import { toRaw } from 'vue';
import { zoneColors } from '../utils/colors';

export default {
  data() {
    return {
      timelineContainer: null,
      entityStore: useEntityStore(),
      linkingStore: useLinkingStore(),
      mapStore: useMapStore(),
      tooltip: null,
      eventRects: null,
      zoneColors: zoneColors,
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
              visitedPlaceNames: trip.visited_places.map(p => p.place.name),
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
        events = events.filter(event => {
          return this.linkingStore.activeFilters.every(filter => {
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

      // Filter by brushed places on the map
      if (this.linkingStore.brushedPlaces.length > 0) {
        const brushedPlaceNames = new Set(this.linkingStore.brushedPlaces);
        events = events.filter(event => {
          return event.visitedPlaceNames.some(placeName => brushedPlaceNames.has(placeName));
        });
      }

      return events;
    },
  },
  watch: {
    'linkingStore.brushedPlaces': {
      handler() {
        this.$nextTick(this.drawTimeline);
      },
      deep: true,
    },
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
    'linkingStore.highlightedPlaceIds': {
      handler() {
        this.updateHighlighting();
      },
      deep: true,
    },
    'linkingStore.hoveredPlaceId': {
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

    this.$nextTick(this.drawTimeline);
  },
  beforeUnmount() {
    if (this.tooltip) {
      this.tooltip.remove();
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
                ${p.place.name} (${p.place.zone})
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
            this.linkingStore.setHighlightedPlaceIds(d.visitedPlaceIds);
            this.linkingStore.setHighlightedTrips([d.trip.trip.id]);
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
            this.linkingStore.setHighlightedPlaceIds([]);
            this.linkingStore.setHighlightedTrips([]);
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

      const zoom = d3.zoom()
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
            group.selectAll('.event-segment').remove(); // Clear existing segments

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

      svg.call(zoom);


      const resetZoomButton = svg.append('g')
        .attr('transform', `translate(${width - marginRight + 10}, ${marginTop})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        });

      resetZoomButton.append('rect')
        .attr('width', 20)
        .attr('height', 20)
        .attr('fill', '#f0f0f0')
        .attr('rx', 3)
        .attr('ry', 3);

      resetZoomButton.append('text')
        .attr('x', 10)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .text('\u21BA');

      this.updateHighlighting();
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

      const { highlightedTrips, hoveredPlaceId } = this.linkingStore;

      this.eventRects
        .each(function (d) {
          const group = d3.select(this);
          const isTripHighlighted = highlightedTrips.includes(d.trip.trip.id);
          const isPlaceHovered = hoveredPlaceId && d.visitedPlaceIds.includes(hoveredPlaceId);
          const isHighlighted = isTripHighlighted || isPlaceHovered;

          group.selectAll('rect')
            .style('stroke', isHighlighted ? 'red' : 'none')
            .style('stroke-width', isHighlighted ? 2 : 0)
            .style('opacity', () => {
              if (highlightedTrips.length > 0 || hoveredPlaceId) {
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
</style>
