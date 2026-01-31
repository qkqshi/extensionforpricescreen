// Pre-check if library is loaded
if (typeof html2canvas === 'undefined') {
    console.error('Steam Screenshot Error: html2canvas.min.js was not loaded. Please check file placement and refresh the page.');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capturePrice') {
        if (typeof html2canvas === 'undefined') {
            alert('Error: html2canvas library is missing. \n1. Make sure html2canvas.min.js is in your folder. \n2. REFRESH the Steam page and try again.');
            return;
        }
        capturePriceSections(request.options);
        sendResponse({ status: 'started' });
    }
    return true; 
});

async function capturePriceSections(options = {}) {
    const { includeDlc = true } = options;
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        await wait(200);

        // Get Game Name
        const urlParts = window.location.pathname.split('/');
        let gameName = urlParts[3] || 'steam_game';
        const titleEl = document.querySelector('.apphub_AppName');
        if (titleEl) gameName = titleEl.innerText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${gameName}_${timestamp}.png`;

        // Selectors
        const selectors = [
            '.game_area_purchase_game_wrapper',
            '.game_area_purchase_game',
            '#game_area_purchase_section',
            '.game_area_purchase_group'
        ];
        
        if (includeDlc) {
            selectors.push('#gameAreaDLCSection');
            selectors.push('.bundle_border');
            selectors.push('#package_header');
        }

        let elementsToCapture = [];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.offsetParent !== null && !elementsToCapture.includes(el)) {
                    elementsToCapture.push(el);
                }
            });
        });

        // Filter out nested elements to prevent double screenshots
        // If an element's parent is already in the list, we don't need to capture the child separately
        elementsToCapture = elementsToCapture.filter(el => {
            return !elementsToCapture.some(otherEl => {
                return otherEl !== el && otherEl.contains(el);
            });
        });

        if (elementsToCapture.length === 0) {
            alert('No price sections found. Try scrolling down so they load.');
            return;
        }

        const canvasArray = [];
        for (const el of elementsToCapture) {
            // Temporarily fix styles to prevent clipping
            const originalStyles = {
                transition: el.style.transition,
                overflow: el.style.overflow,
                height: el.style.height,
                position: el.style.position
            };
            
            el.style.transition = 'none';
            el.style.overflow = 'visible';
            el.style.height = 'auto';
            // Ensure the element isn't being cut off by its own container
            el.style.position = 'relative'; 

            const canvas = await html2canvas(el, {
                backgroundColor: '#1b2838',
                scale: 2,
                useCORS: true,
                logging: false,
                // Add some padding to capture borders and shadows
                x: -5,
                y: -5,
                width: el.offsetWidth + 10,
                height: el.offsetHeight + 10,
                ignoreElements: (element) => element.classList.contains('sharing_block')
            });
            
            // Restore original styles
            Object.assign(el.style, originalStyles);
            canvasArray.push(canvas);
        }

        // Combine with padding between sections
        const SECTION_GAP = 30; // 30px gap between blocks
        const totalHeight = canvasArray.reduce((sum, c) => sum + c.height, 0) + ((canvasArray.length - 1) * SECTION_GAP);
        const maxWidth = Math.max(...canvasArray.map(c => c.width));
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = maxWidth;
        finalCanvas.height = totalHeight;
        const ctx = finalCanvas.getContext('2d');
        
        // Fill background with Steam's dark blue
        ctx.fillStyle = '#1b2838';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        let currentHeight = 0;
        canvasArray.forEach((canvas, index) => {
            ctx.drawImage(canvas, 0, currentHeight);
            currentHeight += canvas.height + SECTION_GAP;
        });

        const link = document.createElement('a');
        link.download = filename;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();

    } catch (error) {
        console.error('Capture failed:', error);
        alert('Failed to capture: ' + error.message);
    }
}