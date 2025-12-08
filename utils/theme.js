/**
 * Theme management utility
 */
const Theme = {
    async init() {
        const settings = await Storage.getSettings();
        this.apply(settings.theme);
    },

    apply(theme) {
        if (theme === 'system') {
            // Logic for system preference could be added here
            // For now, default to no specific attribute (CSS media query prefers-color-scheme would handle it naturally if set up)
            // or explicitly check:
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    },

    async set(theme) {
        const settings = await Storage.getSettings();
        settings.theme = theme;
        await Storage.saveSettings(settings);
        this.apply(theme);
    }
};

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => Theme.init());
