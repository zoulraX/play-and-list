// Background Script
console.log("Background service worker started");

// Track media state per tab
const mediaStates = new Map();

// Listen for messages from content scripts or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'mediaStatusUpdate') {
        if (sender.tab) {
            let finalTitle = message.status.title;

            // If the message comes from an iframe (frameId > 0) or has a weak title, assume tab title is better
            // especially for sites where video is in iframe
            if ((message.status.isIframe || !finalTitle) && sender.tab.title) {
                finalTitle = sender.tab.title;
                // Clean YouTube title if needed even from tab title
                if (finalTitle.endsWith(" - YouTube")) {
                    finalTitle = finalTitle.replace(" - YouTube", "");
                }
            }

            const currentState = mediaStates.get(sender.tab.id);

            // If we already have a state with media for this tab, and the URL is the same,
            // but the new report says "no media", we might want to ignore it 
            // to prevents flickering or removal when video is paused/hidden by site logic.
            // UNLESS it's a navigation event (URL changed).

            let shouldUpdate = true;

            if (currentState && currentState.hasMedia && !message.status.hasMedia) {
                // Check if URL is same (ignoring hash)
                if (currentState.url === sender.tab.url) {
                    shouldUpdate = false;
                }
            }

            if (shouldUpdate) {
                mediaStates.set(sender.tab.id, {
                    ...message.status,
                    title: finalTitle,
                    tabId: sender.tab.id,
                    favIconUrl: sender.tab.favIconUrl,
                    url: sender.tab.url
                });
            }
        }
    } else if (message.type === 'getMediaStates') {
        // Convert Map to Array for popup
        sendResponse({ states: Array.from(mediaStates.values()) });
    }
});

// Clean up when tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
    mediaStates.delete(tabId);
});
