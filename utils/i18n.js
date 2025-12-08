const I18n = {
    messages: {},

    async init() {
        const settings = await Storage.getSettings();
        const lang = settings.language || 'en';
        await this.loadLocale(lang);
        this.localizePage();
    },

    async loadLocale(lang) {
        try {
            // In Extensions, we can use simple fetch for local files
            const url = `../_locales/${lang}/messages.json`;
            const response = await fetch(url);
            this.messages = await response.json();
        } catch (e) {
            console.error("Failed to load locale", e);
            // Fallback to en?
            if (lang !== 'en') {
                await this.loadLocale('en');
            }
        }
    },

    getMessage(key) {
        if (this.messages[key]) {
            return this.messages[key].message;
        }
        // Fallback to browser i18n if possible, or key
        return browser.i18n.getMessage(key) || key;
    },

    localizePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            if (message) {
                element.textContent = message;
            }
        });
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => I18n.init());
