/**
 * Interactive 2D Map Visualization
 * Uses Leaflet.js to render sample locations from Wikibase P35 property.
 */

let myMap = null;
let markerLayer = null;

function initMap() {
    console.log("Initializing Leaflet Map...");
    const container = document.getElementById('globe-viz');
    if (!container) {
        console.error("Map container (#globe-viz) not found in the DOM.");
        return;
    }

    if (typeof L === 'undefined') {
        console.error("Leaflet library is not loaded. Check script tags in index.html.");
        return;
    }

    // Filter samples with location data
    const locationData = (typeof samplesData !== 'undefined' && samplesData.length > 0)
        ? samplesData
            .filter(s => {
                const loc = s.claims.Location;
                const hasLoc = loc && typeof loc === 'object' && 
                               (loc.lat !== undefined || loc.latitude !== undefined) && 
                               (loc.lon !== undefined || loc.longitude !== undefined || loc.lng !== undefined);
                return hasLoc;
            })
            .map(s => {
                const loc = s.claims.Location;
                return {
                    lat: parseFloat(loc.lat || loc.latitude),
                    lng: parseFloat(loc.lon || loc.longitude || loc.lng),
                    label: s.label,
                    id: s.id,
                    color: '#06b6d4'
                };
            })
        : [];

    // Initialize Map if not already created
    if (!myMap) {
        const isLightMode = document.documentElement.classList.contains('light');
        const tileLayerUrl = isLightMode 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        myMap = L.map('globe-viz', {
            center: [20, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer(tileLayerUrl, {
            maxZoom: 19
        }).addTo(myMap);

        L.control.zoom({
            position: 'bottomright'
        }).addTo(myMap);

        markerLayer = L.layerGroup().addTo(myMap);
    }

    // Clear existing markers
    markerLayer.clearLayers();

    // Custom Icon
    const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    // Add Markers
    locationData.forEach(d => {
        const marker = L.marker([d.lat, d.lng], { icon: customIcon })
            .bindTooltip(`
                <div class="bg-white p-3 rounded-2xl shadow-xl border border-slate-100">
                    <div class="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-1">Genomic Sample</div>
                    <div class="text-slate-900 font-bold text-sm">${d.label}</div>
                    <div class="text-[9px] text-slate-400 mt-1">ID: ${d.id}</div>
                </div>
            `, {
                className: 'custom-leaflet-tooltip',
                direction: 'top',
                offset: [0, -10],
                opacity: 1
            })
            .on('click', () => {
                const sample = samplesData.find(s => s.id === d.id);
                if (sample && typeof openModal === 'function') {
                    openModal(sample);
                }
            })
            .addTo(markerLayer);
    });

    // Fit bounds if markers exist
    if (locationData.length > 0) {
        const bounds = L.latLngBounds(locationData.map(d => [d.lat, d.lng]));
        myMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    }

    console.log(`Map updated with ${locationData.length} markers.`);
}

// Add CSS for Leaflet Tooltip specifically
const style = document.createElement('style');
style.textContent = `
    .leaflet-tooltip {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
    }
    .leaflet-tooltip-top:before {
        border-top-color: white !important;
    }
    .custom-map-marker {
        cursor: pointer;
    }
`;
document.head.appendChild(style);
