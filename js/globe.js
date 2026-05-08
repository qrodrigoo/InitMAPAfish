/**
 * Interactive Globe Visualization
 * Uses Globe.gl to render sample locations from Wikibase P35 property.
 */

let myGlobe = null;

function initGlobe() {
    const container = document.getElementById('globe-viz');
    if (!container || !window.Globe) {
        console.warn("Globe container or library not found.");
        return;
    }

    // Filter samples with location data
    const locationData = (typeof samplesData !== 'undefined' ? samplesData : [])
        .filter(s => s.claims.Location && typeof s.claims.Location === 'object' && s.claims.Location.lat && s.claims.Location.lon)
        .map(s => ({
            lat: parseFloat(s.claims.Location.lat),
            lng: parseFloat(s.claims.Location.lon),
            label: s.label,
            id: s.id,
            color: '#06b6d4'
        }));

    if (myGlobe) {
        // Update data if already initialized
        myGlobe.pointsData(locationData);
        return;
    }

    myGlobe = Globe()
        (container)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .pointsData(locationData)
        .pointAltitude(0.1)
        .pointRadius(0.5)
        .pointColor('color')
        .pointLabel(d => `
            <div class="bg-ocean-900/90 border border-cyan-500/30 p-3 rounded-2xl backdrop-blur-md shadow-2xl">
                <div class="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Genomic Sample</div>
                <div class="text-white font-outfit font-bold">${d.label}</div>
                <div class="text-[9px] text-slate-400 mt-1">ID: ${d.id}</div>
            </div>
        `)
        .onPointClick(point => {
            const sample = samplesData.find(s => s.id === point.id);
            if (sample && typeof openModal === 'function') {
                openModal(sample);
            }
        });

    // Rotation and interaction settings
    myGlobe.controls().autoRotate = true;
    myGlobe.controls().autoRotateSpeed = 0.8;
    myGlobe.controls().enableZoom = true;

    // Premium look: atmosphere and bloom
    myGlobe.showAtmosphere(true);
    myGlobe.atmosphereColor('#06b6d4');
    myGlobe.atmosphereDaylightAlpha(0.1);

    // Responsive sizing
    const resizeGlobe = () => {
        const parent = container.parentElement;
        myGlobe.width(parent.offsetWidth);
        myGlobe.height(parent.offsetHeight);
    };

    window.addEventListener('resize', resizeGlobe);
    resizeGlobe();
}
