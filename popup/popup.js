// Popup Logic
console.log("Popup script loaded");

document.addEventListener('DOMContentLoaded', async () => {
    // Navigation
    const navPlaylist = document.getElementById('nav-playlist');
    const navSettings = document.getElementById('nav-settings');
    const activeMediaView = document.getElementById('active-media-list');
    const playlistView = document.getElementById('playlist-view');
    const settingsView = document.getElementById('settings-view');
    const views = [activeMediaView, playlistView, settingsView];

    function showView(view, activeBtn = null) {
        views.forEach(v => v.classList.remove('active-view'));
        view.classList.add('active-view');

        // Reset buttons
        [navPlaylist, navSettings].forEach(btn => btn.classList.remove('active-nav-btn'));

        // Optimize: if activeBtn provided, add class
        if (activeBtn) {
            activeBtn.classList.add('active-nav-btn');
        }
    }

    navPlaylist.addEventListener('click', () => {
        if (playlistView.classList.contains('active-view')) {
            showView(activeMediaView);
        } else {
            showView(playlistView, navPlaylist);
            loadPlaylistsView();
        }
    });

    navSettings.addEventListener('click', () => {
        if (settingsView.classList.contains('active-view')) {
            showView(activeMediaView);
        } else {
            showView(settingsView, navSettings);
        }
    });

    // Settings Logic
    const themeLightBtn = document.getElementById('theme-light');
    const themeDarkBtn = document.getElementById('theme-dark');

    themeLightBtn.addEventListener('click', () => Theme.set('light'));
    themeDarkBtn.addEventListener('click', () => Theme.set('dark'));

    // Language Logic
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        const settings = await Storage.getSettings();
        languageSelect.value = settings.language || 'en';
        languageSelect.addEventListener('change', async (e) => {
            const s = await Storage.getSettings();
            s.language = e.target.value;
            await Storage.saveSettings(s);

            // Apply change immediately
            await I18n.init();
        });
    }

    // Active Media Logic
    let isMediaViewActive = true;
    // Should track if other views are active to pause polling? 
    // For now simple interval

    loadActiveMedia();
    setInterval(() => {
        if (activeMediaView.classList.contains('active-view')) {
            loadActiveMedia();
        }
    }, 2000);

    async function loadActiveMedia() {
        const response = await browser.runtime.sendMessage({ type: 'getMediaStates' })
            .catch(() => ({ states: [] }));

        const mediaStates = response.states || [];
        const mediaContainer = document.getElementById('media-list-container');

        mediaContainer.innerHTML = '';

        if (mediaStates.length === 0) {
            mediaContainer.innerHTML = '<p style="text-align:center; opacity:0.6; padding: 20px;">No media detected.</p>';
            return;
        }

        mediaStates.forEach(state => {
            if (state.hasMedia) {
                mediaContainer.appendChild(createMediaElement(state));
            }
        });
    }

    function createMediaElement(state) {
        const div = document.createElement('div');
        div.className = 'media-item';
        div.dataset.tabId = state.tabId;
        div.innerHTML = `
      <img src="${state.favIconUrl || 'icons/icon-48.png'}" class="media-icon" onerror="this.src='icons/icon-48.png'" />
      <div class="media-info">
        <div class="media-title" title="${state.title}">${state.title}</div>
        <div style="font-size:0.8em; opacity:0.7;">${state.hostname}</div>
      </div>
      <div class="media-controls">
        <button class="control-btn play-pause-btn" data-tab-id="${state.tabId}">
             ${state.isPlaying ? '⏸' : '▶'}
        </button>
        <button class="control-btn add-playlist-btn" data-tab-id="${state.tabId}" title="Add to Playlist">
             +
        </button>
      </div>
    `;

        div.querySelector('.play-pause-btn').addEventListener('click', () => {
            browser.tabs.sendMessage(state.tabId, { command: 'togglePlayback' });
            setTimeout(loadActiveMedia, 100);
        });

        div.querySelector('.add-playlist-btn').addEventListener('click', () => {
            openAddToPlaylistModal(state);
        });

        return div;
    }

    // Playlist Logic
    const modal = document.getElementById('add-modal');
    const closeModalSpan = document.querySelector('.close-modal');
    let currentMediaToAdd = null;

    closeModalSpan.onclick = () => { modal.style.display = "none"; currentMediaToAdd = null; };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            currentMediaToAdd = null;
        }
    };

    async function openAddToPlaylistModal(mediaState) {
        currentMediaToAdd = mediaState;
        modal.style.display = "block";
        document.getElementById('modal-media-info').textContent = mediaState ? mediaState.title : "Create New Playlist";
        await renderPlaylistSelectionList();
    }

    async function renderPlaylistSelectionList() {
        const container = document.getElementById('modal-playlist-list');
        container.innerHTML = '';

        const playlists = await Storage.getPlaylists();

        if (playlists.length === 0) {
            container.innerHTML = '<div style="font-size:0.9em; padding:10px;">No playlists yet. Create one below.</div>';
        }

        playlists.forEach(pl => {
            const div = document.createElement('div');
            div.className = 'playlist-select-item';
            div.innerText = pl.name + ` (${pl.items.length})`;
            div.onclick = async () => {
                if (currentMediaToAdd) {
                    await addToPlaylist(pl.id, currentMediaToAdd);
                    modal.style.display = "none";
                }
            };
            container.appendChild(div);
        });
    }

    async function addToPlaylist(playlistId, media) {
        const playlists = await Storage.getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            if (!playlist.items.some(i => i.url === media.url)) {
                playlist.items.push({
                    url: media.url,
                    title: media.title,
                    icon: media.favIconUrl || 'icons/icon-48.png',
                    addedAt: Date.now()
                });
                await Storage.savePlaylist(playlist);
            }
        }
        loadPlaylistsView();
    }

    document.getElementById('modal-create-playlist-btn').addEventListener('click', async () => {
        const nameInput = document.getElementById('new-playlist-name');
        const name = nameInput.value.trim();
        if (name) {
            const newPlaylist = {
                id: crypto.randomUUID(),
                name: name,
                createdAt: Date.now(),
                items: []
            };

            await Storage.savePlaylist(newPlaylist);
            if (currentMediaToAdd) {
                await addToPlaylist(newPlaylist.id, currentMediaToAdd);
                modal.style.display = "none";
            } else {
                loadPlaylistsView();
                renderPlaylistSelectionList();
            }
            nameInput.value = '';
        }
    });

    document.getElementById('create-playlist-btn').addEventListener('click', async () => {
        currentMediaToAdd = null;
        modal.style.display = "block";
        document.getElementById('modal-media-info').textContent = "Create New Playlist";
        renderPlaylistSelectionList();
    });

    async function loadPlaylistsView() {
        const container = document.getElementById('playlist-container');
        container.innerHTML = '';
        const playlists = await Storage.getPlaylists();

        if (playlists.length === 0) {
            container.innerHTML = "<p style='text-align:center; padding:20px; opacity:0.6'>No playlists created.</p>";
            return;
        }

        playlists.forEach(pl => {
            const div = document.createElement('div');
            div.className = 'playlist-item-card';
            div.style.border = "1px solid var(--border-color)";
            div.style.margin = "10px 0";
            div.style.borderRadius = "8px";
            div.style.padding = "10px";

            // Header with Name (Double click to edit) and Delete Playlist
            div.innerHTML = `
                <div style="font-weight: bold; display:flex; justify-content:space-between; align-items:center;">
                   <span class="playlist-name-display" data-id="${pl.id}" title="Double click to rename" style="cursor:text;">${pl.name}</span>
                   <div>
                       <span style="font-size:0.8em; opacity:0.7; margin-right:5px;">${pl.items.length} items</span>
                       <button class="icon-btn delete-playlist-btn" data-id="${pl.id}" style="color:red; font-size:0.9em;" title="Delete Playlist">🗑</button>
                   </div>
                </div>
                <div class="playlist-items-preview" style="margin-top:10px;">
                   <ul class="playlist-ul" style="padding-left:10px; margin:0; list-style:none;">  
                   </ul>
                </div>
            `;

            const ul = div.querySelector('.playlist-ul');
            if (pl.items.length === 0) {
                ul.innerHTML = '<div style="font-size:0.8em; opacity:0.6; margin-left:10px;">Empty</div>';
            } else {
                pl.items.forEach((item, index) => {
                    const li = document.createElement('li');
                    li.style.display = 'flex';
                    li.style.justifyContent = 'space-between';
                    li.style.alignItems = 'center';
                    li.style.marginBottom = '5px';
                    li.style.fontSize = '0.9em';

                    li.innerHTML = `
                      <a href="${item.url}" target="_blank" style="color:var(--text-color); text-decoration:none; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1; margin-right:5px;">${item.title}</a>
                      <button class="icon-btn delete-item-btn" style="color:red; font-size:0.8em; padding:2px;" title="Remove">✕</button>
                   `;

                    // Remove individual item
                    li.querySelector('.delete-item-btn').addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Avoid triggering route
                        const allPlaylists = await Storage.getPlaylists();
                        const targetPl = allPlaylists.find(p => p.id === pl.id);
                        if (targetPl) {
                            targetPl.items.splice(index, 1);
                            await Storage.savePlaylist(targetPl);
                            loadPlaylistsView();
                        }
                    });

                    ul.appendChild(li);
                });
            }

            // Rename Playlist Logic
            const nameSpan = div.querySelector('.playlist-name-display');
            nameSpan.addEventListener('dblclick', async () => {
                const newName = prompt("Rename Playlist:", pl.name);
                if (newName && newName.trim() !== "") {
                    const allPlaylists = await Storage.getPlaylists();
                    const targetPl = allPlaylists.find(p => p.id === pl.id);
                    if (targetPl) {
                        targetPl.name = newName.trim();
                        await Storage.savePlaylist(targetPl);
                        loadPlaylistsView();
                    }
                }
            });

            // Delete Playlist Logic
            div.querySelector('.delete-playlist-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete playlist "' + pl.name + '"?')) {
                    const pls = await Storage.getPlaylists();
                    const newPls = pls.filter(p => p.id !== pl.id);
                    await Storage.set({ playlists: newPls });
                    loadPlaylistsView();
                }
            });

            container.appendChild(div);
        });
    }
});
