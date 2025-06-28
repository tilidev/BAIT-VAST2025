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

export default {
  data() {
    return {
      timelineContainer: null,
      entityStore: useEntityStore(),
      linkingStore: useLinkingStore(),
      mapStore: useMapStore(),
      tooltip: null,
      eventRects: null,
    };
  },
  computed: {
    persons() {

      return [...this.entityStore.persons].sort((a, b) => a.id.localeCompare(b.id));
    },
    personIds() {

      return this.persons.map(p => p.id);
    },

    allEvents() {
      const allTrips = [];
      for (const personId in this.entityStore.personTripActivities) {
        const trips = this.entityStore.personTripActivities[personId];
        trips.forEach(trip => {

          if (trip && trip.visited_places && trip.visited_places.length > 0) {
            allTrips.push({
              trip: toRaw(trip),
              personId: personId,
              startTime: new Date(trip.visited_places[0]?.visit_rel.time),
              endTime: new Date(trip.visited_places[trip.visited_places.length - 1]?.visit_rel.time),
              startZone: trip.visited_places[0]?.place.zone,
              visitedPlaceNames: trip.visited_places.map(p => p.place.name),
            });
          }
        });
      }

      return allTrips.filter(d => d.startTime instanceof Date && !isNaN(d.startTime) && d.endTime instanceof Date && !isNaN(d.endTime));
    },
    filteredEvents() {
      if (this.linkingStore.activeFilters.length === 0) {
        return this.allEvents;
      }

      return this.allEvents.filter(event => {
        return this.linkingStore.activeFilters.every(filter => {
          return event.trip.visited_places.some(visitedPlace => {
            const place = visitedPlace.place;
            if (!place || !place.id) {
              return false;
            }

            if (filter.type === 'island') {
              const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(place.id);
              return parentFeatureName === filter.value;
            } else if (filter.type === 'zone') {
              return place.zone === filter.value;
            }
            return false;
          });
        });
      });
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
  watch: {
    'linkingStore.activeFilters': {
      handler() {
        this.$nextTick(this.drawTimeline);
      },
      deep: true,
    },
    'linkingStore.highlightedPlaces': {
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
  methods: {
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
            ${d.trip.visited_places.map(p => `<li>${p.place.name} (${p.place.zone})</li>`).join('')}
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
              .html(`<div class="font-semibold">${d.name}</div>`);
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


      personAvatars.append('circle')
        .attr('r', Math.min(16, yScale.bandwidth() / 2 * 0.9))
        .style('fill', d => colorScale(d.id));


      personAvatars.append('text')
        .text(d => this.getInitials(d.name))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .style('fill', 'white')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none');

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

      this.eventRects = chartArea.selectAll('.event')
        .data(filteredEvents)
        .enter()
        .append('rect')
        .attr('class', 'event shadow-md')
        .attr('x', d => xScale(d.startTime))
        .attr('y', d => yScale(d.personId) ?? 0)
        .attr('width', d => Math.max(0, xScale(d.endTime) - xScale(d.startTime)))
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.personId))
        .attr('rx', 3)
        .attr('ry', 3)
        .style('opacity', 0.8)
        .on("mouseover", (event, d) => {
          if (this.tooltip) {
            this.tooltip
              .classed("hidden", false)
              .html(this.tooltipFormatter(d));
            d3.select(event.currentTarget).style('opacity', 1);

            const placeNames = d.visitedPlaceNames;
            this.linkingStore.setHighlightedPlaces(placeNames);
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
            d3.select(event.currentTarget).style('opacity', 0.8);
            this.linkingStore.setHighlightedPlaces([]);
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
            .attr('x', d => newXScale(d.startTime))
            .attr('width', d => Math.max(0, newXScale(d.endTime) - newXScale(d.startTime)));
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

      this.eventRects.style('opacity', d => {
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
            }
            return false;
          });
        });

        return isHovered ? 1.0 : 0.3;
      });
    },
    updateHighlighting() {
      if (!this.eventRects) return;

      const highlightedPlaces = this.linkingStore.highlightedPlaces;

      this.eventRects
        .style('stroke', d => {
          const isHighlighted = d.visitedPlaceNames.some(placeName =>
            highlightedPlaces.includes(placeName)
          );
          return isHighlighted ? 'red' : 'none';
        })
        .style('stroke-width', d => {
          const isHighlighted = d.visitedPlaceNames.some(placeName =>
            highlightedPlaces.includes(placeName)
          );
          return isHighlighted ? 2 : 0;
        })
        .style('opacity', d => {
          const isHighlighted = d.visitedPlaceNames.some(placeName =>
            highlightedPlaces.includes(placeName)
          );
          return highlightedPlaces.length > 0 && !isHighlighted ? 0.3 : 0.8;
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
