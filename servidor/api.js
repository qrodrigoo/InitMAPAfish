const WIKIBASE_URL = 'https://rodrigo-test-ciimar.wikibase.cloud';
const API_URL = `${WIKIBASE_URL}/w/api.php`;
const SPARQL_URL = `${WIKIBASE_URL}/query/sparql`;

const PROPERTY_MAP = {
    "P1": "Tissue",
    "P5": "Species",
    "P29": "Project",
    "P30": "Raw Reads",
    "P31": "Pipeline Version",
    "P32": "Experimental Conditions",
    "P33": "Relative Abundance",
    "P34": "Taxonomic Rank",
    "P2": "Health Status"
};

let samplesData = [];
// Chache para nomes de entidades (evita pedir o mesmo nome várias vezes)
let entityLabels = {};

function getClaimValue(claim) {
    if (!claim || !claim.mainsnak) return null;
    const mainsnak = claim.mainsnak;
    if (mainsnak.snaktype !== 'value') return null;
    const datavalue = mainsnak.datavalue;

    switch (datavalue.type) {
        case 'string': return datavalue.value;
        case 'wikibase-entityid': return datavalue.value.id; // Retorna ID primeiro
        case 'quantity':
            let val = datavalue.value.amount;
            if (val.startsWith('+')) val = val.substring(1);
            return parseFloat(val).toLocaleString('en-US');
        default: return null;
    }
}

// Função para buscar labels de múltiplos IDs de uma vez
async function fetchEntityLabels(ids) {
    const uniqueIds = [...new Set(ids)].filter(id => id.startsWith('Q') && !entityLabels[id]);
    if (uniqueIds.length === 0) return;

    // Wikibase API permite buscar labels em blocos de 50
    const chunks = [];
    for (let i = 0; i < uniqueIds.length; i += 50) {
        chunks.push(uniqueIds.slice(i, i + 50));
    }

    for (const chunk of chunks) {
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: chunk.join('|'),
            props: 'labels',
            languages: 'en|pt|pt-br',
            format: 'json',
            origin: '*'
        });
        try {
            const response = await fetch(`${API_URL}?${params.toString()}`);
            const data = await response.json();
            if (data.entities) {
                Object.values(data.entities).forEach(entity => {
                    entityLabels[entity.id] = entity.labels?.en?.value || entity.labels?.pt?.value || entity.id;
                });
            }
        } catch (e) { console.error("Error fetching labels", e); }
    }
}

// Global data fetch mechanism
async function fetchSamples() {
    const grid = document.getElementById('samples-grid');
    const loading = document.getElementById('loading-state');
    const error = document.getElementById('error-state');
    const refreshIcon = document.getElementById('refresh-icon');
    const statCount = document.getElementById('stat-count');

    if(grid) grid.innerHTML = '';
    if(loading) {
        loading.classList.remove('hidden');
        loading.classList.add('flex');
    }
    if(error) error.classList.add('hidden');
    if(refreshIcon) refreshIcon.classList.add('animate-spin');
    if(statCount) statCount.textContent = '...';

    try {
        const sparqlQuery = `
            PREFIX wd: <https://rodrigo-test-ciimar.wikibase.cloud/entity/>
            PREFIX wdt: <https://rodrigo-test-ciimar.wikibase.cloud/prop/direct/>
            SELECT DISTINCT ?item WHERE {
                { ?item wdt:P5 ?o. } UNION { ?item wdt:P29 ?o. } UNION { ?item wdt:P1 ?o. }
            }
        `;
        
        const sparqlParams = new URLSearchParams({ query: sparqlQuery, format: 'json' });
        const sparqlResponse = await fetch(`${SPARQL_URL}?${sparqlParams.toString()}`);
        const sparqlData = await sparqlResponse.json();
        const discoveredIds = sparqlData.results.bindings.map(b => {
             const uri = b.item.value;
             return uri.substring(uri.lastIndexOf('/') + 1);
        });

        if (discoveredIds.length === 0) {
            samplesData = [];
            if(statCount) statCount.textContent = '0';
            if (typeof renderSamples === 'function') renderSamples([]);
            return;
        }

        let rawSamples = [];
        const idChunks = [];
        for (let i = 0; i < discoveredIds.length; i += 50) {
            idChunks.push(discoveredIds.slice(i, i + 50));
        }

        for (const chunk of idChunks) {
            const apiParams = new URLSearchParams({
                action: 'wbgetentities',
                ids: chunk.join('|'),
                languages: 'en|pt|pt-br',
                format: 'json',
                origin: '*'
            });

            const apiResponse = await fetch(`${API_URL}?${apiParams.toString()}`);
            const data = await apiResponse.json();

            if (data.entities) {
                const chunkEntities = Object.values(data.entities).filter(e => !e.missing);
                rawSamples = rawSamples.concat(chunkEntities);
            }
        }

        if (rawSamples.length > 0) {
            
            // Coletar todos os Q-IDs mencionados para buscar as labels
            let allMentionedIds = [];
            rawSamples.forEach(entity => {
                if (entity.claims) {
                    Object.values(entity.claims).forEach(claimSet => {
                        const val = getClaimValue(claimSet[0]);
                        if (typeof val === 'string' && val.startsWith('Q')) allMentionedIds.push(val);
                    });
                }
            });

            // Buscar os nomes reais de todos esses IDs de uma vez
            await fetchEntityLabels(allMentionedIds);

            samplesData = rawSamples.map(entity => {
                const claims = {};
                if (entity.claims) {
                    Object.keys(entity.claims).forEach(pId => {
                        const label = PROPERTY_MAP[pId];
                        if (label) {
                            let val = getClaimValue(entity.claims[pId][0]);
                            // Substituir ID pelo Nome Real se existir no cache
                            if (typeof val === 'string' && entityLabels[val]) {
                                val = entityLabels[val];
                            }
                            claims[label] = val;
                        }
                    });
                }
                return {
                    id: entity.id,
                    label: entity.labels?.en?.value || entity.labels?.pt?.value || entity.id,
                    description: entity.descriptions?.en?.value || entity.descriptions?.pt?.value || 'Genomic sample.',
                    claims: claims,
                    url: `${WIKIBASE_URL}/wiki/${entity.id}?uselang=en`
                };
            });

            if(statCount) statCount.textContent = samplesData.length;
            if (typeof populateFilters === 'function') populateFilters(samplesData);
            if (typeof renderSamples === 'function') renderSamples(samplesData);
        }
    } catch (err) {
        console.error('Fetch error:', err);
        if(error) error.classList.remove('hidden');
        if(loading) {
            loading.classList.remove('flex');
            loading.classList.add('hidden');
        }
    } finally {
        if(refreshIcon) refreshIcon.classList.remove('animate-spin');
    }
}
