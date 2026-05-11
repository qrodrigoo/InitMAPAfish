// --- 1. Metadata Dictionary ---
const METADATA_DICTIONARY = {
    "Abundance Score": "Confidence value assigned to the metagenomic identification.",
    "Linked Taxon": "Direct reference to the official taxonomic entity in the database."
};



// --- 3. Modal Controls ---
function openModal(sample) {
    const modal = document.getElementById('sample-modal');
    const content = document.getElementById('sample-modal-content');
    
    document.getElementById('modal-id').textContent = `ID: ${sample.id}`;
    document.getElementById('modal-title').textContent = sample.label;
    document.getElementById('modal-desc').textContent = `"${sample.description}"`;
    document.getElementById('modal-link').href = sample.url;
    
    const claimsContainer = document.getElementById('modal-claims');
    claimsContainer.innerHTML = '';
    
    const entries = Object.entries(sample.claims);
    if(entries.length > 0) {
        entries.forEach(([label, value]) => {
            // Format value if it's an object (like coordinates)
            let displayValue = value;
            if (typeof value === 'object' && value !== null) {
                if (value.lat !== undefined && value.lon !== undefined) {
                    displayValue = `Lat: ${value.lat.toFixed(4)}, Lon: ${value.lon.toFixed(4)}`;
                } else if (value.latitude !== undefined && value.longitude !== undefined) {
                    displayValue = `Lat: ${value.latitude.toFixed(4)}, Lon: ${value.longitude.toFixed(4)}`;
                } else {
                    displayValue = JSON.stringify(value);
                }
            }

            const isAbundance = label.includes('Abundance') || label.includes('Score');
            const isReads = label.includes('Reads');
            const isID = displayValue.toString().startsWith('Q') && displayValue.toString().length < 5;
            const description = METADATA_DICTIONARY[label] || "Genomic property stored in Wikibase.";
            
            let valClass = 'text-slate-900 dark:text-white text-sm font-medium';
            if (isAbundance) valClass = 'text-emerald-600 dark:text-emerald-400 text-sm font-bold';
            else if (isReads) valClass = 'text-blue-600 dark:text-blue-400 text-sm font-mono';
            else if (isID) valClass = 'text-purple-600 dark:text-purple-400 text-sm font-mono';

            claimsContainer.innerHTML += `
                <div class="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group/modal-item shadow-sm dark:shadow-none">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] font-bold text-cyan-600 dark:text-cyan-500/80 uppercase tracking-widest">${label}</span>
                        <div class="relative group/tooltip">
                            <i data-lucide="help-circle" class="w-3 h-3 text-slate-400 dark:text-slate-600 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-help"></i>
                            <div class="absolute bottom-full left-0 mb-2 w-56 p-3 bg-slate-900 border border-white/10 rounded-xl text-xs text-white leading-relaxed opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none shadow-2xl">
                                ${description}
                                <div class="absolute top-full left-4 border-8 border-transparent border-t-slate-900"></div>
                            </div>
                        </div>
                    </div>
                    <span class="${valClass} break-words block">${displayValue}${isAbundance && !label.includes('Score') ? '%' : ''}</span>
                </div>
            `;
        });
    } else {
        claimsContainer.innerHTML = `<div class="col-span-full text-center text-slate-500 py-6">No additional properties recorded in WikiBase.</div>`;
    }
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        lucide.createIcons();
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('sample-modal');
    const content = document.getElementById('sample-modal-content');
    
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// --- 4. Event Listeners & Filters ---
let currentFilteredData = [];
let currentPage = 1;
const itemsPerPage = 8; 

let activeFilters = {
    "Project": [],
    "Tissue": [],
    "Species": []
};

function populateFilters(data) {
    const categories = {
        "Project": new Set(),
        "Tissue": new Set(),
        "Species": new Set()
    };
    
    data.forEach(s => {
        Object.keys(categories).forEach(cat => {
            if (s.claims[cat]) {
                categories[cat].add(s.claims[cat]);
            }
        });
    });
    
    const createCheckboxes = (containerId, category, valuesSet) => {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = '';
        
        if (valuesSet.size === 0) {
            container.innerHTML = '<span class="text-xs text-slate-500 italic block">No data available</span>';
            return;
        }
        
        Array.from(valuesSet).sort().forEach(val => {
            const label = document.createElement('label');
            label.className = "flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors";
            
            label.innerHTML = `
                <div class="relative flex items-center justify-center">
                    <input type="checkbox" class="peer appearance-none w-4 h-4 rounded border border-slate-600 bg-ocean-900 checked:bg-cyan-500 checked:border-cyan-500 transition-all cursor-pointer filter-checkbox" data-category="${category}" value="${val}">
                    <i data-lucide="check" class="absolute w-3 h-3 text-ocean-900 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
                </div>
                <span class="text-sm text-slate-300 peer-checked:text-white transition-colors select-none">${val}</span>
            `;
            container.appendChild(label);
        });
    };
    
    createCheckboxes('filter-projeto', "Project", categories["Project"]);
    createCheckboxes('filter-tecido', "Tissue", categories["Tissue"]);
    createCheckboxes('filter-especie', "Species", categories["Species"]);
    
    document.querySelectorAll('.filter-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const cat = e.target.getAttribute('data-category');
            const val = e.target.value;
            
            if (e.target.checked) {
                if (!activeFilters[cat].includes(val)) activeFilters[cat].push(val);
            } else {
                activeFilters[cat] = activeFilters[cat].filter(v => v !== val);
            }
            
            applySearchAndFilters();
        });
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function applySearchAndFilters() {
    if (typeof samplesData === 'undefined') return;
    
    const term = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = samplesData.filter(s => {
        const matchSearch = 
            s.label.toLowerCase().includes(term) || 
            s.id.toLowerCase().includes(term) || 
            Object.values(s.claims).some(val => val && val.toString().toLowerCase().includes(term));
            
        let matchFilters = true;
        for (const [cat, activeVals] of Object.entries(activeFilters)) {
            if (activeVals.length > 0) {
                const itemVal = s.claims[cat];
                if (!itemVal || !activeVals.includes(itemVal)) {
                    matchFilters = false;
                    break;
                }
            }
        }
        
        return matchSearch && matchFilters;
    });
    
    currentFilteredData = filtered;
    currentPage = 1;
    renderSamples(filtered);
    updateCharts(filtered);
}

document.getElementById('search-input').addEventListener('input', applySearchAndFilters);

// Pagination Buttons
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderSamples(currentFilteredData);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(currentFilteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderSamples(currentFilteredData);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const controls = document.getElementById('pagination-controls');
    const currNum = document.getElementById('current-page-num');
    const totalNum = document.getElementById('total-pages-num');

    if (totalItems <= itemsPerPage) {
        controls.classList.add('hidden');
        return;
    }

    controls.classList.remove('hidden');
    controls.classList.add('flex');
    
    currNum.textContent = currentPage;
    totalNum.textContent = totalPages;

    prevBtn.disabled = (currentPage === 1);
    nextBtn.disabled = (currentPage === totalPages);
}

function renderSamples(data) {
    const grid = document.getElementById('samples-grid');
    const empty = document.getElementById('empty-state');
    const loading = document.getElementById('loading-state');
    
    if (grid) grid.innerHTML = '';
    if (loading) {
        loading.classList.remove('flex');
        loading.classList.add('hidden');
    }

    if (data.length === 0) {
        if (empty) empty.classList.remove('hidden');
        const pagination = document.getElementById('pagination-controls');
        if (pagination) pagination.classList.add('hidden');
        return;
    } else {
        if (empty) empty.classList.add('hidden');
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

    paginatedData.forEach(s => {
        const card = document.createElement('div');
        card.className = "cursor-pointer group bg-ocean-800/40 backdrop-blur-md rounded-[2rem] border border-white/5 p-7 hover:border-cyan-500/40 hover:bg-ocean-800/80 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] transition-all duration-500 relative flex flex-col h-full overflow-hidden";
        card.onclick = () => openModal(s);

        let claimsHtml = '';
        // --- RESUMO NO CARD: Apenas Projeto e Espécie ---
        const summaryKeys = ['Project', 'Species'];
        const entries = Object.entries(s.claims).filter(([key]) => summaryKeys.includes(key));
        
        if (entries.length > 0) {
            entries.forEach(([label, value]) => {
                const isAbundance = label.includes('Abundance') || label.includes('Score');
                const isReads = label.includes('Reads');
                const isID = value.toString().startsWith('Q') && value.toString().length < 5;
                const description = METADATA_DICTIONARY[label] || "Genomic property stored in Wikibase.";
                
                let valClass = 'text-slate-300 font-medium';
                if (isAbundance) valClass = 'text-emerald-400 font-bold';
                else if (isReads) valClass = 'text-blue-400 font-mono';
                else if (isID) valClass = 'text-purple-400 font-mono text-[10px] bg-purple-500/10 px-2 py-0.5 rounded';

                claimsHtml += `
                    <div class="flex justify-between items-center text-[11px] p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.03] group-hover:bg-white/[0.05] transition-colors relative">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="font-bold text-slate-500 uppercase tracking-wider truncate">${label}</span>
                            <div class="relative group/tooltip">
                                <i data-lucide="help-circle" class="w-3 h-3 text-slate-600 hover:text-cyan-400 transition-colors cursor-help"></i>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white leading-relaxed opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none shadow-xl">
                                    ${description}
                                    <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                                </div>
                            </div>
                        </div>
                        <span class="${valClass} text-right break-words max-w-[45%] leading-tight">
                            ${value}${isAbundance && !label.includes('Score') ? '%' : ''}
                        </span>
                    </div>
                `;
            });
        } else {
            claimsHtml = `<p class="text-xs text-slate-500 italic text-center py-4 bg-white/[0.02] rounded-xl border border-dashed border-white/[0.05]">No processed properties</p>`;
        }

        const footerLabel = s.claims['Species'] || s.claims['Project'] || s.claims['Tissue'] || 'Genomic Record';
        const footerIcon = s.claims['Relative Abundance'] ? 'bar-chart-2' : (s.claims['Taxonomic Rank'] ? 'git-merge' : 'database');

        const isSelected = typeof selectedForComparison !== 'undefined' && selectedForComparison.includes(s.id);
        const compareBtnClass = isSelected 
            ? "bg-cyan-500 text-ocean-900 border-cyan-400 font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400" 
            : "bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/20 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 border-slate-200 dark:border-transparent hover:border-cyan-500/30";

        card.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div class="relative z-10 flex flex-col h-full">
                <div class="flex justify-between items-start mb-6">
                    <div class="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black tracking-widest uppercase border border-slate-200 dark:border-white/10 group-hover:bg-cyan-500 group-hover:text-ocean-900 group-hover:border-cyan-400 transition-colors shadow-sm">
                        ID: ${s.id}
                    </div>
                    <div class="flex items-center gap-2">
                        <button title="Compare Sample" class="compare-trigger-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all border text-[10px] font-bold ${compareBtnClass}">
                            <i data-lucide="git-compare" class="w-3.5 h-3.5 pointer-events-none"></i>
                            <span class="pointer-events-none">${isSelected ? 'Selected' : 'Compare'}</span>
                        </button>
                        <a href="${s.url}" target="_blank" onclick="event.stopPropagation()" title="View on Wikibase" class="text-slate-500 hover:text-cyan-400 transition-colors bg-slate-100 dark:bg-white/[0.03] p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10">
                            <i data-lucide="external-link" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>
                
                <h3 class="text-2xl font-outfit font-black text-slate-900 dark:text-white mb-3 group-hover:text-cyan-400 transition-colors leading-tight drop-shadow-md">
                    ${s.label}
                </h3>
                
                <p class="text-slate-400 text-xs font-light leading-relaxed mb-8 italic flex-grow min-h-[3rem]">
                    "${s.description}"
                </p>
                
                <div class="space-y-2 mb-8 mt-auto">
                    ${claimsHtml}
                </div>
                
                <div class="pt-5 border-t border-white/5 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                        <i data-lucide="${footerIcon}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <span class="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Primary Metadata</span>
                        <span class="text-sm font-bold text-slate-200 block truncate max-w-[200px]" title="${footerLabel}">${footerLabel}</span>
                    </div>
                </div>
            </div>
        `;

        const cBtn = card.querySelector('.compare-trigger-btn');
        if (cBtn) {
            cBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof toggleComparison === 'function') {
                    toggleComparison(s.id);
                }
            });
        }

        grid.appendChild(card);
    });
    renderPagination(data.length);
    lucide.createIcons();
}

// Toggle Dropdowns
const filterBtn = document.getElementById('filter-btn');
const filterDropdown = document.getElementById('filter-dropdown');
const exportBtn = document.getElementById('export-btn');
const exportDropdown = document.getElementById('export-dropdown');

function setupDropdown(btn, dropdown) {
    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            // Close other dropdowns
            [filterDropdown, exportDropdown].forEach(d => {
                if (d !== dropdown) d.classList.add('hidden');
            });
        });
    }
}

setupDropdown(filterBtn, filterDropdown);
setupDropdown(exportBtn, exportDropdown);

document.addEventListener('click', (e) => {
    if (filterDropdown && !filterDropdown.contains(e.target) && !filterBtn.contains(e.target)) {
        filterDropdown.classList.add('hidden');
    }
    if (exportDropdown && !exportDropdown.contains(e.target) && !exportBtn.contains(e.target)) {
        exportDropdown.classList.add('hidden');
    }
});

document.querySelectorAll('.toggle-category').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const targetList = document.getElementById(targetId);
        const icon = btn.querySelector('.category-icon');
        
        if (targetList) {
            targetList.classList.toggle('hidden');
            if (targetList.classList.contains('hidden')) {
                icon.classList.remove('rotate-180');
                btn.classList.add('text-slate-400');
                btn.classList.remove('text-cyan-400');
            } else {
                icon.classList.add('rotate-180');
                btn.classList.add('text-cyan-400');
                btn.classList.remove('text-slate-400');
            }
        }
    });
});

// --- 5. Export Logic ---
function exportData(format) {
    if (currentFilteredData.length === 0) {
        alert("No data available to export.");
        return;
    }

    const dataToExport = currentFilteredData.map(s => {
        const row = {
            ID: s.id,
            Label: s.label,
            Description: s.description,
            URL: s.url
        };
        // Add all metadata claims
        Object.entries(s.claims).forEach(([key, val]) => {
            row[key] = val;
        });
        return row;
    });

    let blob;
    let filename = `mapafish_export_${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
        const jsonContent = JSON.stringify(dataToExport, null, 2);
        blob = new Blob([jsonContent], { type: 'application/json' });
        filename += '.json';
    } else if (format === 'csv') {
        const headers = Array.from(new Set(dataToExport.flatMap(obj => Object.keys(obj))));
        const csvRows = [
            headers.join(','), // Header row
            ...dataToExport.map(row => 
                headers.map(header => {
                    const val = row[header] || '';
                    // Escape commas and quotes for CSV
                    const stringVal = val.toString().replace(/"/g, '""');
                    return `"${stringVal}"`;
                }).join(',')
            )
        ];
        blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        filename += '.csv';
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Close dropdown
    if (exportDropdown) exportDropdown.classList.add('hidden');
}

// --- 6. Analytics Logic (Charts) ---
let speciesChartInstance = null;
let abundanceChartInstance = null;

function updateCharts(data) {
    if (typeof Chart === 'undefined') return;

    // 1. Species Distribution (Pie)
    const speciesCounts = {};
    data.forEach(s => {
        const sp = s.claims['Species'] || 'Unknown';
        speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
    });

    const pieCanvas = document.getElementById('speciesChart');
    if (!pieCanvas) return;
    const pieCtx = pieCanvas.getContext('2d');
    if (speciesChartInstance) speciesChartInstance.destroy();

    speciesChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(speciesCounts),
            datasets: [{
                data: Object.values(speciesCounts),
                backgroundColor: [
                    'rgba(6, 182, 212, 0.7)',  // cyan-500
                    'rgba(16, 185, 129, 0.7)', // emerald-500
                    'rgba(59, 130, 246, 0.7)', // blue-500
                    'rgba(99, 102, 241, 0.7)', // indigo-500
                    'rgba(168, 85, 247, 0.7)'  // purple-500
                ],
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
                }
            },
            cutout: '70%'
        }
    });

    // 2. Relative Abundance (Bar)
    // We take top 15 samples with abundance data
    const abundanceData = data
        .filter(s => s.claims['Relative Abundance'])
        .slice(0, 15)
        .map(s => ({
            label: s.label,
            value: parseFloat(s.claims['Relative Abundance'].toString().replace(',', '.'))
        }));

    const barCtx = document.getElementById('abundanceChart').getContext('2d');
    if (abundanceChartInstance) abundanceChartInstance.destroy();

    abundanceChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: abundanceData.map(d => d.label),
            datasets: [{
                label: 'Relative Abundance (%)',
                data: abundanceData.map(d => d.value),
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 9 }, maxRotation: 45, minRotation: 45 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

const refreshBtn = document.getElementById('refresh-btn');
if(refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        fetchSamples().then(() => {
            if (typeof initMap === 'function') initMap();
        });
    });
}

// Initialize App
window.onload = () => {
    // Initialize map immediately (empty)
    if (typeof initMap === 'function') initMap();

    if (typeof fetchSamples === 'function') {
        fetchSamples().then(() => {
            currentFilteredData = [...samplesData];
            updateCharts(currentFilteredData);
            // Update map with data if available
            if (typeof initMap === 'function') initMap();
        });
    }
    lucide.createIcons();
};
