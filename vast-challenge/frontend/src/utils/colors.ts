import * as d3 from 'd3';

export const sentimentColorScale = d3.scaleOrdinal<string>()
  .domain(['positiveSentiment', 'negativeSentiment', 'neutralSentiment'])
  .range(["#d15f5d", "#ffffff", "#6a9f58"]); // Green, Red, Gray
        

export const sentimentColorScaleLinear = d3.scaleLinear<number>()
  .domain([-1, 0, 1])
  .range(["#d15f5d", "#FFFFFF", "#6a9f58"]);
        

export const neutralBaseColor = '#6366f1'; // muted indigo
