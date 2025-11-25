import React, { useEffect, useRef } from 'react';
import { 
  select, 
  scaleLog, 
  scaleLinear, 
  axisBottom, 
  axisLeft, 
  line, 
  curveMonotoneX,
  max 
} from 'd3';
import './FrequencyResponse.css';

const FrequencyResponse = ({ frequencyResponse }) => {
  const svgRef = useRef();

  useEffect(() => {
    // Add debugging
    console.log('FrequencyResponse component received:', frequencyResponse);
    
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    if (!frequencyResponse) {
      console.log('No frequency response data available');
      // Add "No Data" message
      svg.append("text")
        .attr("x", 175) // Half of 350 width
        .attr("y", 60)  // Half of 120 height
        .attr("text-anchor", "middle")
        .style("fill", "#BDC3C7")
        .style("font-size", "12px")
        .text("No Frequency Response Data");
      return;
    }

    if (!frequencyResponse.frequencies || !frequencyResponse.magnitude) {
      console.error('Invalid frequency response structure:', frequencyResponse);
      svg.append("text")
        .attr("x", 175)
        .attr("y", 60)
        .attr("text-anchor", "middle")
        .style("fill", "#E74C3C")
        .style("font-size", "12px")
        .text("Invalid Data Structure");
      return;
    }

    if (frequencyResponse.frequencies.length === 0 || frequencyResponse.magnitude.length === 0) {
      console.log('Empty frequency response data');
      svg.append("text")
        .attr("x", 175)
        .attr("y", 60)
        .attr("text-anchor", "middle")
        .style("fill", "#BDC3C7")
        .style("font-size", "12px")
        .text("No Data Points");
      return;
    }

    console.log(`Plotting ${frequencyResponse.frequencies.length} frequency response points`);

    const margin = { top: 10, right: 8, bottom: 20, left: 30 };
    const width = 280 - margin.left - margin.right; // Increased width
    const height = 120 - margin.top - margin.bottom; // Increased height

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create logarithmic scale for frequency (20Hz to 20kHz)
    const xScale = scaleLog()
      .domain([20, 20000])
      .range([0, width])
      .clamp(true);

    // Create linear scale for magnitude (0 to 2, but show from 0 to 2.2 for some headroom)
    const yScale = scaleLinear()
      .domain([0, 2.2])
      .range([height, 0]);

    // Create line generator
    const lineGenerator = line()
      .x(d => xScale(d.frequency))
      .y(d => yScale(d.magnitude))
      .curve(curveMonotoneX);

    // Prepare data for plotting
    const responseData = [];
    for (let i = 0; i < frequencyResponse.frequencies.length; i++) {
      const freq = frequencyResponse.frequencies[i];
      const mag = frequencyResponse.magnitude[i];
      
      // Only include valid data points within our frequency range
      if (freq >= 20 && freq <= 20000 && mag >= 0 && mag <= 2.2) {
        responseData.push({
          frequency: freq,
          magnitude: mag
        });
      }
    }

    if (responseData.length === 0) {
      svg.append("text")
        .attr("x", 175)
        .attr("y", 60)
        .attr("text-anchor", "middle")
        .style("fill", "#E74C3C")
        .style("font-size", "12px")
        .text("No Valid Data Points");
      return;
    }

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
        .ticks(4)
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

    // Add some data point indicators for key frequencies
    const keyFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    keyFrequencies.forEach(freq => {
      const dataPoint = responseData.find(d => Math.abs(d.frequency - freq) < freq * 0.1);
      if (dataPoint) {
        g.append("circle")
          .attr("cx", xScale(dataPoint.frequency))
          .attr("cy", yScale(dataPoint.magnitude))
          .attr("r", 2)
          .attr("fill", "#3498DB")
          .attr("stroke", "white")
          .attr("stroke-width", 1);
      }
    });

  }, [frequencyResponse]);

  return (
    <div className="frequency-response compact">
      <h4>Frequency Response</h4>
      <svg
        ref={svgRef}
        width={320} // Increased from 300
        height={140} // Increased from 100
      />
    </div>
  );
};

export default FrequencyResponse;