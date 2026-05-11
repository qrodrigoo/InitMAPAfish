/**
 * Interactive Globe Visualization
 * Uses Globe.gl to render sample locations from Wikibase P35 property.
 */

let myGlobe = null;

function initGlobe() {
    console.log("Initializing Globe...");
    const container = document.getElementById('globe-viz');
    if (!container) {
        console.error("Globe container (#globe-viz) not found in the DOM.");
        return;
    }

    if (typeof Globe === 'undefined') {
        console.error("Globe.gl library is not loaded. Check script tags in index.html.");
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
                    color: '#06b6d4' // Premium Cyan
                };
            })
        : [];

    if (myGlobe) {
        myGlobe.pointsData(locationData);
        return;
    }

    try {
        myGlobe = Globe()
            (container)
            .backgroundColor('rgba(0,0,0,0)')
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .showAtmosphere(true)
            .atmosphereColor('#06b6d4')
            .atmosphereAltitude(0.15)
            .pointsData(locationData)
            .pointAltitude(0.01)
            .pointRadius(0.5)
            .pointColor('color')
            .pointLabel(d => `
                <div class="bg-white/95 border border-cyan-500/40 p-4 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                    <div class="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                        <div class="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                        Genomic Sample
                    </div>
                    <div class="text-slate-900 font-outfit font-black text-lg">${d.label}</div>
                    <div class="text-[10px] text-slate-500 mt-2 font-mono">ID: ${d.id} • Lat: ${d.lat.toFixed(4)}</div>
                </div>
            `)
            .onPointClick(point => {
                const sample = samplesData.find(s => s.id === point.id);
                if (sample && typeof openModal === 'function') {
                    openModal(sample);
                }
            });

        // Premium interaction settings
        myGlobe.controls().autoRotate = true;
        myGlobe.controls().autoRotateSpeed = 0.5;
        myGlobe.controls().enableZoom = true;
        
        // Interaction: Stop rotation on hover
        container.addEventListener('mouseenter', () => {
            myGlobe.controls().autoRotate = false;
        });
        container.addEventListener('mouseleave', () => {
            myGlobe.controls().autoRotate = true;
        });

        // Initial POV (Centralize)
        myGlobe.pointOfView({ lat: 10, lng: 0, altitude: 2.5 });

        console.log("Interactive Globe successfully initialized.");

        const resizeGlobe = () => {
            const parent = document.getElementById('globe-container');
            if (parent && myGlobe) {
                myGlobe.width(parent.offsetWidth);
                myGlobe.height(parent.offsetHeight || 600);
            }
        };

        window.addEventListener('resize', resizeGlobe);
        setTimeout(resizeGlobe, 100);

    } catch (err) {
        console.error("Critical error initializing globe:", err);
    }
}
