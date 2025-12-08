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

            mediaStates.set(sender.tab.id, {
                ...message.status,
                title: finalTitle,
                tabId: sender.tab.id,
                favIconUrl: sender.tab.favIconUrl,
                url: sender.tab.url
            });
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
