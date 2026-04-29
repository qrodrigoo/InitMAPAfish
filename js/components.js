/**
 * Components Loader - InitMAPAfish
 * Handles the injection of common UI elements like the topbar.
 */

async function loadTopbar() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    // Detect project root path
    const isSubdir = window.location.pathname.includes('/paginas/');
    const basePath = isSubdir ? '../' : './';
    const topbarPath = isSubdir ? '../paginas/includes/topbar.html' : './paginas/includes/topbar.html';

    try {
        const response = await fetch(topbarPath);
        const html = await response.text();
        nav.innerHTML = html;

        // --- 1. Fix Paths for Logo and Links ---
        const logoLink = nav.querySelector('#logo-link');
        const apiLink = nav.querySelector('#nav-api');

        if (logoLink) logoLink.href = basePath + 'index.html';
        if (apiLink) apiLink.href = basePath + 'paginas/api.html';
        const submitLink = nav.querySelector('#nav-submit');
        if (submitLink) submitLink.href = basePath + 'paginas/submit.html';

        // --- 2. Handle Navigation Toggles (SPA logic for index.html) ---
        if (!isSubdir) {
            setupSPATabs(nav);
            // Handle cross-page navigation via URL parameters
            const params = new URLSearchParams(window.location.search);
            const targetSection = params.get('section');
            if (targetSection) {
                const tabToActivate = nav.querySelector(`[data-target="${targetSection}"]`);
                if (tabToActivate) tabToActivate.click();
            }
        } else {
            // Highlight active page
            if (window.location.pathname.includes('api.html') && apiLink) {
                apiLink.classList.remove('text-slate-400');
                apiLink.classList.add('bg-indigo-500', 'text-white', 'shadow-lg');
            } else if (window.location.pathname.includes('submit.html') && submitLink) {
                submitLink.classList.remove('text-emerald-400/70');
                submitLink.classList.add('bg-emerald-500', 'text-ocean-900', 'shadow-lg');
            }
            
            // Redirect tabs back to index.html with parameters
            const tabs = nav.querySelectorAll('.nav-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const sectionId = tab.getAttribute('data-target');
                    window.location.href = `${basePath}index.html?section=${sectionId}`;
                });
            });
        }

        // --- 3. Re-initialize Lucide Icons for the injected HTML ---
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

    } catch (error) {
        console.error("Error loading topbar:", error);
    }
}

function setupSPATabs(nav) {
    const tabs = nav.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('main > section');
    
    // Set default active tab
    const defaultTab = tabs[0];
    if (defaultTab) {
        defaultTab.classList.add('tab-active');
        defaultTab.classList.remove('tab-inactive');
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update tabs styles
            tabs.forEach(t => {
                t.classList.remove('tab-active');
                t.classList.add('tab-inactive');
            });
            const apiLink = nav.querySelector('#nav-api');
            if(apiLink) {
                apiLink.classList.add('text-slate-400');
                apiLink.classList.remove('bg-indigo-500', 'text-white');
            }

            tab.classList.remove('tab-inactive');
            tab.classList.add('tab-active');

            // Toggle sections
            sections.forEach(s => {
                s.classList.remove('block');
                s.classList.add('hidden');
            });

            const targetId = tab.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('block');
            }
        });
    });
}

// Auto-load on script execution
loadTopbar();
 
