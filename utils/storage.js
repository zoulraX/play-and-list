/**
 * Wrapper for browser.storage.local
 */
const Storage = {
    async get(keys) {
        return browser.storage.local.get(keys);
    },

    async set(items) {
        return browser.storage.local.set(items);
    },

    async getPlaylists() {
        const data = await this.get('playlists');
        return data.playlists || [];
    },

    async savePlaylist(playlist) {
        const playlists = await this.getPlaylists();
        // Check if updating or creating
        const index = playlists.findIndex(p => p.id === playlist.id);
        if (index !== -1) {
            playlists[index] = playlist;
        } else {
            playlists.push(playlist);
        }
        await this.set({ playlists });
    },

    async getSettings() {
        const data = await this.get('settings');
        return data.settings || { theme: 'system', language: 'en' }; // Default settings
    },

    async saveSettings(settings) {
        await this.set({ settings });
    }
};
