import React, { useEffect, useRef } from 'react';
import { 
  select, 
  scaleLog, 
  scaleLinear, 
  axisBottom, 
  axisLeft, 
  line, 
  curveMonotoneX 
} from 'd3';
import './FrequencyResponse.css';

const FrequencyResponse = ({ frequencyResponse }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!frequencyResponse) return;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 15, right: 10, bottom: 25, left: 35 }; // Reduced margins
    const width = 350 - margin.left - margin.right; // Smaller width
    const height = 120 - margin.top - margin.bottom; // Smaller height

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create logarithmic scale for frequency
    const xScale = scaleLog()
      .domain([20, 20000])
      .range([0, width]);

    const yScale = scaleLinear()
      .domain([0, 2])
      .range([height, 0]);

    // Create line generator
    const lineGenerator = line()
      .x(d => xScale(d.frequency))
      .y(d => yScale(d.magnitude))
      .curve(curveMonotoneX);

    // Add grid
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(axisBottom(xScale)
        .tickSize(-height)
        .tickFormat("")
        .ticks(5)
      );

    g.append("g")
      .attr("class", "grid")
      .call(axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("")
      );

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(axisBottom(xScale)
        .ticks(5, ".0s"))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("fill", "#ecf0f1")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .text("Frequency (Hz)");

    g.append("g")
      .call(axisLeft(yScale).ticks(4))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -25)
      .attr("x", -height / 2)
      .attr("fill", "#ecf0f1")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .text("Gain");

    // Add the response line
    const responseData = frequencyResponse.frequencies.map((freq, i) => ({
      frequency: freq,
      magnitude: frequencyResponse.magnitude[i]
    }));

    g.append("path")
      .datum(responseData)
      .attr("class", "response-line")
      .attr("fill", "none")
      .attr("stroke", "#FF6B6B")
      .attr("stroke-width", 2)
      .attr("d", lineGenerator);

    // Add reference line at 1.0 (unity gain)
    g.append("line")
      .attr("class", "unity-line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(1))
      .attr("y2", yScale(1))
      .attr("stroke", "#666")
      .attr("stroke-dasharray", "4,4")
      .attr("stroke-width", 1);

  }, [frequencyResponse]);

  return (
    <div className="frequency-response compact">
      <h4>Frequency Response</h4>
      <svg
        ref={svgRef}
        width={350}
        height={120}
      />
    </div>
  );
};

export default FrequencyResponse;