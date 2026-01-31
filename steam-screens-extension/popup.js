document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const statusEl = document.getElementById('status');
    const includeDlcCheckbox = document.getElementById('includeDlc');

    captureBtn.addEventListener('click', async () => {
        setStatus('Accessing page...', 'loading');
        captureBtn.disabled = true;

        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('store.steampowered.com/app/')) {
                setStatus('Not a Steam game page.', 'error');
                captureBtn.disabled = false;
                return;
            }

            // Execute content script to capture screenshot
            setStatus('Capturing screenshot...', 'loading');
            
            // Pass options to content script
            const includeDlc = includeDlcCheckbox.checked;

            await chrome.tabs.sendMessage(tab.id, { 
                action: 'capturePrice', 
                options: { includeDlc } 
            });
            
            setStatus('Screenshot saved!', 'success');
        } catch (error) {
            console.error(error);
            setStatus('Error: ' + error.message, 'error');
        } finally {
            captureBtn.disabled = false;
        }
    });

    function setStatus(msg, type) {
        statusEl.textContent = msg;
        statusEl.className = 'status ' + type;
    }
});