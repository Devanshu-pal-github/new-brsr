import React, { useState } from 'react';

const PlantLocationMap = ({ plants }) => {
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // SVG viewBox coordinates for India map representation
  const mapDimensions = {
    width: 600,
    height: 600,
    viewBox: "0 0 600 600"
  };

  // Convert geographic coordinates to SVG coordinates
  const convertToSVGCoords = (lat, lng) => {
    // Simple linear mapping of coordinates to SVG space
    // India bounds: Lat: 8.4-37.6, Lng: 68.7-97.25
    const x = ((lng - 68.7) / (97.25 - 68.7)) * mapDimensions.width;
    const y = mapDimensions.height - ((lat - 8.4) / (37.6 - 8.4)) * mapDimensions.height;
    return { x, y };
  };

  const getMarkerColor = (type) => {
    const colors = {
      'Manufacturing': '#2563EB',
      'Assembly': '#9333EA',
      'R&D': '#4F46E5'
    };
    return colors[type] || '#2563EB';
  };

  const handleMarkerHover = (plant, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left,
      y: rect.top - 10
    });
    setSelectedPlant(plant);
  };

  return (
    <div className="relative w-full h-[400px] bg-gray-50 rounded-lg overflow-hidden">
      {/* Simplified India Map */}
      <svg
        width="100%"
        height="100%"
        viewBox={mapDimensions.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="bg-[#E0F2FE]"
      >
        {/* Simplified India outline */}
        <path
          d="M200,100 L400,100 L450,200 L500,300 L450,400 L350,500 L250,500 L150,400 L100,300 L150,200 Z"
          fill="#F8FAFC"
          stroke="#CBD5E1"
          strokeWidth="2"
        />

        {/* Plant Location Markers */}
        {plants.map(plant => {
          const coords = convertToSVGCoords(plant.latitude, plant.longitude);
          return (
            <g
              key={plant.id}
              transform={`translate(${coords.x}, ${coords.y})`}
              onMouseEnter={(e) => handleMarkerHover(plant, e)}
              onMouseLeave={() => setSelectedPlant(null)}
              className="cursor-pointer"
            >
              <circle
                r="6"
                fill={getMarkerColor(plant.type)}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-200 hover:r-8"
              />
              <circle
                r="3"
                fill="white"
                className="transition-all duration-200"
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {selectedPlant && (
        <div
          className="absolute z-10 bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]"
          style={{
            left: tooltipPosition.x + 'px',
            top: tooltipPosition.y + 'px',
            transform: 'translateY(-100%)'
          }}
        >
          <h4 className="font-semibold text-[#1A2341] mb-1">{selectedPlant.name}</h4>
          <p className="text-sm text-gray-600 mb-1">{selectedPlant.address}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium">{selectedPlant.type}</span>
            <span className={`text-sm font-medium capitalize ${
              selectedPlant.status === 'active' ? 'text-green-600' : 'text-orange-500'
            }`}>
              {selectedPlant.status}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
        <div className="text-sm font-medium mb-2">Facility Types</div>
        {['Manufacturing', 'Assembly', 'R&D'].map(type => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getMarkerColor(type) }}
            />
            <span>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlantLocationMap; 