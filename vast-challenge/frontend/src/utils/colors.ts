import * as d3 from 'd3';

export const sentimentColorScale = d3.scaleOrdinal<string>()
  .domain(['positiveSentiment', 'negativeSentiment', 'neutralSentiment'])
  .range(["#d15f5d", "#9ca3af", "#6a9f58"]); // Green, Red, Gray


export const createSentimentColorScale = () =>
  d3.scaleOrdinal<string>()
    .domain(['positiveSentiment', 'negativeSentiment', 'neutralSentiment'])
    .range(['#4ade80', '#f87171', '#9ca3af']); // Green, Red, Gray

export const sentimentColorScaleLinear = d3.scaleLinear<string>()
  .domain([-1, 0, 1])
  .range(["#d15f5d", "#9ca3af", "#6a9f58"]);


export const neutralBaseColor = '#6366f1';
export const positiveSentiment = "#d15f5d";
export const negativeSentiment = "#6a9f58";
export const neutralSentiment = "#9ca3af";

export const zoneColors: { [key: string]: string } = {
  "government": "#6366f1",
  "commercial": "#f59e0b",
  "residential": "#10b981",
  "industrial": "#ef4444",
  "default": "grey"
};

export const datasetColors: { [key: string]: string } = {
  jo: '#3b82f6', // blue-500
  fi: '#10b981', // emerald-500
  tr: '#f97316', // orange-500
};
