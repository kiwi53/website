// Game Launcher: fetch games from games.json and enable multi-select category filtering
(function() {
    const searchInput = document.getElementById('game-search');
    const categoryList = document.getElementById('category-list');
    const selectedContainer = document.getElementById('selected-categories');
    const gamesGrid = document.getElementById('games-grid');
    const noResults = document.getElementById('no-results');
    const loading = document.getElementById('loading');

    let games = [];
    const selectedCategories = new Set();

    function normalizeCat(c) {
        return ('' + c).toLowerCase().trim();
    }

    function capitalize(s) {
        if (!s) return s;
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function renderCategories() {
        const allCats = new Set();
        games.forEach(g => (g.categories || []).forEach(c => allCats.add(normalizeCat(c))));
        categoryList.innerHTML = '';
        Array.from(allCats).sort().forEach(cat => {
            const li = document.createElement('li');
            li.dataset.cat = cat;
            li.textContent = capitalize(cat);
            if (selectedCategories.has(cat)) li.classList.add('selected');
            categoryList.appendChild(li);
        });
    }

    function updateSelectedUI() {
        selectedContainer.innerHTML = '';
        if (selectedCategories.size === 0) {
            selectedContainer.classList.add('hidden');
            return;
        }
        selectedContainer.classList.remove('hidden');
        Array.from(selectedCategories).forEach(cat => {
            const pill = document.createElement('span');
            pill.className = 'pill';
            pill.dataset.cat = cat;
            pill.textContent = capitalize(cat);
            const rem = document.createElement('span');
            rem.className = 'remove';
            rem.textContent = '×';
            pill.appendChild(rem);
            selectedContainer.appendChild(pill);
        });
    }

    function renderGames(list) {
        gamesGrid.innerHTML = '';
        if (!list || list.length === 0) {
            noResults.classList.remove('hidden');
            loading.classList.add('hidden');
            return;
        }
        noResults.classList.add('hidden');
        loading.classList.add('hidden');
        list.forEach(g => {
            const card = document.createElement('div');
            card.className = 'service-card';
            
            // Check if game is WIP (Work in Progress)
            const isWIP = g.state === 'WIP' || g.status === 'WIP';
            if (isWIP) {
                card.classList.add('wip');
            }

            // Use the metadata "name" when available; fall back to id
            const nameVal = (g.name || g.id || '').toString();
            card.dataset.name = nameVal;
            card.setAttribute('title', nameVal);
            card.setAttribute('aria-label', nameVal);

            card.dataset.categories = (g.categories || []).join(',');
            card.dataset.category = (g.categories && g.categories[0]) ? normalizeCat(g.categories[0]) : 'all';

            // Create the title element (display above thumbnail)
            const h3 = document.createElement('h3');
            h3.textContent = nameVal;

            // header to hold title and menu button (prevents overlap)
            const headerDiv = document.createElement('div');
            headerDiv.className = 'card-header';

            // menu button
            const menuBtn = document.createElement('button');
            menuBtn.className = 'card-menu';
            menuBtn.type = 'button';
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.setAttribute('aria-label', 'Open game details');
            menuBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="#2c3e50" stroke-width="2" stroke-linecap="round"/></svg>';
            menuBtn.addEventListener('click', (e) => { e.stopPropagation(); openInfoPanel(g, menuBtn); });

            headerDiv.appendChild(h3);
            headerDiv.appendChild(menuBtn);
            card.appendChild(headerDiv);

            // Thumbnail (if provided) or placeholder box with the game name
            const thumbValue = (g.thumbnail || '').toString().trim();
            if (thumbValue) {
                const img = document.createElement('img');
                img.className = 'game-thumb';
                // If thumbnail looks like an absolute URL or absolute path, use it as-is;
                // otherwise, resolve relative to the game's folder and URL-encode the filename.
                if (/^https?:\/\//i.test(thumbValue) || thumbValue.startsWith('/')) {
                    img.src = thumbValue;
                } else {
                    // derive base path from g.url if available (handles moved games folders)
                    let base = '/games/' + encodeURIComponent(g.id) + '/';
                    if (g.url) {
                        base = g.url.replace(/index\.html$/, '');
                        if (!base.endsWith('/')) base += '/';
                    }
                    img.src = base + encodeURIComponent(thumbValue);
                }
                img.alt = nameVal || 'Game thumbnail';
                // if image fails to load, replace with placeholder
                img.onerror = () => {
                    img.remove();
                    const placeholder = document.createElement('div');
                    placeholder.className = 'game-thumb placeholder';
                    placeholder.textContent = nameVal || 'Untitled';
                    card.appendChild(placeholder);
                };
                card.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'game-thumb placeholder';
                placeholder.textContent = nameVal || 'Untitled';
                card.appendChild(placeholder);
            }

            // attach dataset url for clicking and open-in-new-tab
            card.dataset.url = g.url || ('/games/' + encodeURIComponent(g.id) + '/');

            // Make card focusable and support keyboard activation
            card.tabIndex = 0;
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });

            // When clicking a card, navigate to the game player wrapper
            card.addEventListener('click', () => {
                const url = card.dataset.url;
                const name = g.name || g.id;
                
                // Show warning for WIP games
                if (isWIP) {
                    const confirmed = confirm(
                        `⚠️ Warning: "${name}" is still under construction.\n\n` +
                        `This game may be incomplete, have bugs, or not work properly.\n\n` +
                        `Do you want to continue anyway?`
                    );
                    if (!confirmed) return;
                }
                
                const playerUrl = '/website/game-launcher/' + name.replace(/\s+/g, '-');
                window.location.href = playerUrl;
            });

            gamesGrid.appendChild(card);
        });
    }

    function matchesGame(g, query) {
        const name = (g.name || '').toLowerCase();
        const cats = (g.categories || []).map(c => normalizeCat(c));
        const q = (query || '').toLowerCase();
        const matchesQuery = !q || name.includes(q);
        // Check that ALL selectedCategories are present in cats
        const matchesCategories = Array.from(selectedCategories).every(sel => cats.includes(sel));
        return matchesQuery && matchesCategories;
    }

    function filter() {
        const q = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
        const filtered = games.filter(g => matchesGame(g, q));
        renderGames(filtered);
        noResults.classList.toggle('hidden', filtered.length !== 0);
    }

    function wireCategoryClicks() {
        if (!categoryList) return;
        categoryList.addEventListener('click', function(e) {
            const li = e.target.closest('li[data-cat]');
            if (!li) return;
            const cat = normalizeCat(li.dataset.cat);

            // toggle selection
            if (selectedCategories.has(cat)) {
                selectedCategories.delete(cat);
                li.classList.remove('selected');
            } else {
                selectedCategories.add(cat);
                li.classList.add('selected');
            }

            updateSelectedUI();
            filter();
        });

        // allow removal via selected-categories pills
        selectedContainer.addEventListener('click', function(e) {
            const pill = e.target.closest('.pill');
            if (!pill) return;
            const cat = normalizeCat(pill.dataset.cat);
            selectedCategories.delete(cat);
            // update list item
            const li = categoryList.querySelector(`li[data-cat="${cat}"]`);
            if (li) li.classList.remove('selected');
            updateSelectedUI();
            filter();
        });
    }

    function loadGames() {
        loading.classList.remove('hidden');
        fetch('/api/games')
            .then(r => r.json())
            .then(data => {
                console.debug('API /api/games returned', (data || []).length, 'games', data);
                games = (data || []).map(g => {
                    g.categories = (g.categories || []).map(c => normalizeCat(c));
                    return g;
                });
                renderCategories();
                wireCategoryClicks();
                updateSelectedUI();
                filter();

                // If no games were returned, show a helpful message
                if (!data || data.length === 0) {
                    loading.classList.add('hidden');
                    if (noResults) {
                        noResults.classList.remove('hidden');
                        noResults.textContent = 'No games found. Make sure a "games" folder exists under the project and contains game folders.';
                    }
                }

                // wire player close and keyboard
                const closePlayer = document.getElementById('closePlayer');
                const player = document.getElementById('player');
                const frame = document.getElementById('gameFrame');
                const returnBtn = document.getElementById('returnLauncher');

                function closePlayerOverlay() {
                    frame.src = '';
                    player.classList.add('hidden');
                    player.classList.remove('fullscreen');
                    document.body.classList.remove('body-player-open');
                    // return focus to game grid
                    const firstCard = document.querySelector('.service-card');
                    if (firstCard) firstCard.focus();
                }

                closePlayer && closePlayer.addEventListener('click', closePlayerOverlay);
                returnBtn && returnBtn.addEventListener('click', closePlayerOverlay);

                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        closePlayerOverlay();
                    }
                });
            })
            .catch(err => {
                console.error('Failed to load games', err);
                loading.textContent = 'Failed to load games.';
            });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filter);
    }

    // helper to open info panel
    let currentOpenMenuButton = null;
    function openInfoPanel(g, btn) {
        const panel = document.getElementById('infoPanel');
        if (!panel) return;
        const title = document.getElementById('panelTitle');
        const thumb = document.getElementById('panelThumb');
        const desc = document.getElementById('panelDescription');
        const pcats = document.getElementById('panelCategories');
        const openLink = document.getElementById('panelOpen');
        const playBtn = document.getElementById('panelPlay');

        title.textContent = g.name || g.id;
        // thumbnail resolution
        const thumbValue = (g.thumbnail || '').toString().trim();
        const placeholder = document.getElementById('panelThumbPlaceholder');
        if (thumbValue) {
            let thumbUrl = thumbValue;
            if (!/^https?:\/\//i.test(thumbValue) && !thumbValue.startsWith('/')) {
                let base = '/games/' + encodeURIComponent(g.id) + '/';
                if (g.url) {
                    base = g.url.replace(/index\.html$/, '');
                    if (!base.endsWith('/')) base += '/';
                }
                thumbUrl = base + encodeURIComponent(thumbValue);
            }
            thumb.src = thumbUrl;
            thumb.alt = g.name || 'thumbnail';
            thumb.classList.remove('hidden');
            // if thumb fails to load, fall back to placeholder
            thumb.onerror = () => {
                thumb.classList.add('hidden');
                if (placeholder) placeholder.classList.remove('hidden');
            };
            placeholder.classList.add('hidden');
        } else {
            thumb.classList.add('hidden');
            if (placeholder) {
                placeholder.textContent = g.name || '';
                placeholder.classList.remove('hidden');
            }
        }

        desc.textContent = g.description || '';

        // Metadata fields (show metadata above categories)
        const devEl = document.getElementById('panelDeveloper');
        const verEl = document.getElementById('panelVersion');
        const relEl = document.getElementById('panelReleaseDate');
        const stateEl = document.getElementById('panelState');

        devEl.textContent = g.developer || '—';
        verEl.textContent = g.version || '—';
        relEl.textContent = g.release_date || '—';
        stateEl.textContent = g.state || g.status || g.release_state || '—';

        // Categories are shown after metadata
        pcats.innerHTML = '';
        (g.categories || []).forEach(c => {
            const el = document.createElement('span');
            el.className = 'pill';
            el.textContent = c;
            pcats.appendChild(el);
        });

        const gameUrl = g.url || ('/games/' + encodeURIComponent(g.id) + '/');
        playBtn.textContent = 'Play';
        playBtn.onclick = () => {
            const isWIP = g.state === 'WIP' || g.status === 'WIP';
            
            // Show warning for WIP games
            if (isWIP) {
                const confirmed = confirm(
                    `⚠️ Warning: "${g.name || g.id}" is still under construction.\n\n` +
                    `This game may be incomplete, have bugs, or not work properly.\n\n` +
                    `Do you want to continue anyway?`
                );
                if (!confirmed) return;
            }
            
            const playerUrl = '/website/game-launcher/' + (g.name || g.id).replace(/\s+/g, '-');
            window.location.href = playerUrl;
        };

        panel.classList.remove('hidden');
        setTimeout(() => panel.classList.add('open'), 20);
        panel.setAttribute('aria-hidden', 'false');

        if (currentOpenMenuButton) currentOpenMenuButton.setAttribute('aria-expanded', 'false');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        currentOpenMenuButton = btn;
    }

    function closeInfoPanel() {
        const panel = document.getElementById('infoPanel');
        if (!panel) return;
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        setTimeout(() => panel.classList.add('hidden'), 280);
        if (currentOpenMenuButton) currentOpenMenuButton.setAttribute('aria-expanded', 'false');
        currentOpenMenuButton = null;
    }

    document.addEventListener('click', (e) => {
        const panel = document.getElementById('infoPanel');
        if (!panel || panel.classList.contains('hidden')) return;
        // if click outside the panel, close it
        const inside = e.target.closest('#infoPanel');
        if (!inside) closeInfoPanel();
    });

    const closeInfo = document.getElementById('closeInfoPanel');
    closeInfo && closeInfo.addEventListener('click', closeInfoPanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeInfoPanel();
    });

    // Start
    loadGames();
})();