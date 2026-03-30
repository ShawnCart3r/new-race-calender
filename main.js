 const sheetURL = 'https://docs.google.com/spreadsheets/d/1H0pvW1hrIi3zCNPrIRN_oOKzN8Hw2RaY8vXERcmLiSU/gviz/tq?tqx=out:json&sheet=Sheet1';
    const monthsGrid = document.getElementById('months-grid');
    const searchInput = document.getElementById('search');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
 
    let monthMap = {};
    let _currentMonth = '';
    let _currentRaces = [];
 
    // Parse "Town, ST" → { town, state }
    function parseLocation(loc) {
      if (!loc) return { town: '', state: '' };
      const parts = loc.split(',');
      if (parts.length < 2) return { town: loc.trim(), state: '' };
      return { town: parts.slice(0, -1).join(',').trim(), state: parts[parts.length - 1].trim() };
    }
 
    // Build state → town → races map
    function buildStateMap(races) {
      const stateMap = {};
      races.forEach(race => {
        const { town, state } = parseLocation(race.location);
        const s = state || 'Other';
        const t = town || 'Unknown';
        if (!stateMap[s]) stateMap[s] = {};
        if (!stateMap[s][t]) stateMap[s][t] = [];
        stateMap[s][t].push({ ...race, parsedTown: t, parsedState: s });
      });
      return stateMap;
    }
 
    const monthGradients = [
      'linear-gradient(135deg, #1a3a5c 0%, #0a1628 100%)',
      'linear-gradient(135deg, #1e2d52 0%, #0a1628 100%)',
      'linear-gradient(135deg, #1c3d4a 0%, #0a1628 100%)',
      'linear-gradient(135deg, #1a3a2e 0%, #0a1628 100%)',
      'linear-gradient(135deg, #2d2040 0%, #0a1628 100%)',
      'linear-gradient(135deg, #3a1c2e 0%, #0a1628 100%)',
      'linear-gradient(135deg, #2a3a1a 0%, #0a1628 100%)',
      'linear-gradient(135deg, #1a2a3a 0%, #0a1628 100%)',
      'linear-gradient(135deg, #3a2a1a 0%, #0a1628 100%)',
      'linear-gradient(135deg, #1a3a3a 0%, #0a1628 100%)',
      'linear-gradient(135deg, #2a1a3a 0%, #0a1628 100%)',
      'linear-gradient(135deg, #1c2a3a 0%, #0a1628 100%)',
    ];
 
    const stateGradients = [
      'linear-gradient(135deg, #1a3a5c 0%, #0e2040 100%)',
      'linear-gradient(135deg, #2d2040 0%, #0e1828 100%)',
      'linear-gradient(135deg, #1c3d4a 0%, #0a1e28 100%)',
      'linear-gradient(135deg, #1a3a2e 0%, #0a1a18 100%)',
      'linear-gradient(135deg, #3a1c2e 0%, #1a0e18 100%)',
      'linear-gradient(135deg, #2a3a1a 0%, #141e0a 100%)',
    ];
 
    function loadRaces() {
      fetch(sheetURL)
        .then(res => res.text())
        .then(raw => {
          const json = JSON.parse(raw.substring(47).slice(0, -2));
          const rows = json.table.rows;
 
          const today = new Date();
          const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const races = [];
 
          rows.forEach(row => {
            const rawDate = row.c[2]?.v;
            const name     = row.c[3]?.v || '';
            const distance = row.c[4]?.v || '';
            const location = row.c[5]?.v || '';
            const link     = row.c[6]?.v || '';
 
            const match = String(rawDate ?? '').match(/Date\((\d+),(\d+),(\d+)\)/);
            if (!match) return;
 
            const [_, y, m, d] = match;
            const date     = new Date(Number(y), Number(m), Number(d));
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            if (dateOnly < todayOnly) return;
 
            const prettyDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const dayNum     = date.getDate();
            const dayName    = date.toLocaleDateString('en-US', { weekday: 'short' });
            const isToday    = dateOnly.getTime() === todayOnly.getTime();
            const isWeekend  = [0, 6].includes(dateOnly.getDay());
 
            races.push({ name, distance, location, link, date, prettyDate, dayNum, dayName, isToday, isWeekend });
          });
 
          monthMap = {};
          races.sort((a, b) => a.date - b.date);
          races.forEach(race => {
            const key = race.date.toLocaleString('default', { month: 'long' }) + ' ' + race.date.getFullYear();
            if (!monthMap[key]) monthMap[key] = [];
            monthMap[key].push(race);
          });
 
          renderMonths(monthMap);
        })
        .catch(() => {
          monthsGrid.innerHTML = '<div class="empty-state"><strong>Could not load races</strong>Check your connection and try refreshing.</div>';
        });
    }
 
    function renderMonths(map) {
      monthsGrid.innerHTML = '';
      const keys = Object.keys(map).filter(k => map[k].length > 0);
 
      if (keys.length === 0) {
        monthsGrid.innerHTML = '<div class="empty-state"><strong>No races found</strong>Try adjusting your search.</div>';
        return;
      }
 
      keys.forEach((month, i) => {
        const races = map[month];
        const stateCount = Object.keys(buildStateMap(races)).length;
        const gradient = monthGradients[i % monthGradients.length];
        const card = document.createElement('div');
        card.className = 'month-card';
        card.style.setProperty('--card-gradient', gradient);
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `View ${month} races`);
 
        card.innerHTML = `
          <div class="month-card-bg"></div>
          <div class="month-card-geo"></div>
          <div class="month-card-badge">${races.length} Race${races.length !== 1 ? 's' : ''}</div>
          <div class="month-card-content">
            <p class="month-card-tag">${stateCount} State${stateCount !== 1 ? 's' : ''}</p>
            <h2 class="month-card-title">${month}</h2>
            <span class="month-card-cta">
              View Races
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
          </div>
        `;
 
        card.addEventListener('click', () => openModal(month, races));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(month, races); });
 
        setTimeout(() => card.classList.add('visible'), i * 80);
        monthsGrid.appendChild(card);
      });
    }
 
    function openModal(month, races) {
      _currentMonth = month;
      _currentRaces = races;
      const stateMap = buildStateMap(races);
      const stateCount = Object.keys(stateMap).length;
 
      document.getElementById('modal-tag').textContent = 'Race Calendar';
      document.getElementById('modal-title').textContent = month;
      document.getElementById('modal-subtitle').textContent = `${races.length} race${races.length !== 1 ? 's' : ''} · ${stateCount} state${stateCount !== 1 ? 's' : ''}`;
 
      showStateView(races);
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
 
    function showStateView(races) {
      const grid = document.getElementById('modal-cards-grid');
      grid.innerHTML = '';
      grid.className = 'state-cards-grid';
 
      const stateMap = buildStateMap(races);
 
      Object.keys(stateMap).sort().forEach((state, i) => {
        const townMap = stateMap[state];
        const totalRaces = Object.values(townMap).flat().length;
        const townCount = Object.keys(townMap).length;
        const gradient = stateGradients[i % stateGradients.length];
 
        const card = document.createElement('div');
        card.className = 'state-card';
        card.style.setProperty('--card-gradient', gradient);
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `View ${state} races`);
 
        card.innerHTML = `
          <div class="state-card-bg"></div>
          <div class="state-card-geo"></div>
          <div class="state-card-badge">${totalRaces} Race${totalRaces !== 1 ? 's' : ''}</div>
          <div class="state-card-content">
            <p class="state-card-tag">${townCount} Town${townCount !== 1 ? 's' : ''}</p>
            <h3 class="state-card-title">${state}</h3>
            <div class="state-card-towns">${Object.keys(townMap).sort().join(' · ')}</div>
            <span class="state-card-cta">
              View Races
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
          </div>
        `;
 
        card.addEventListener('click', () => showTownView(state, townMap));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') showTownView(state, townMap); });
        grid.appendChild(card);
      });
    }
 
    function showTownView(state, townMap) {
      const totalRaces = Object.values(townMap).flat().length;
      document.getElementById('modal-tag').textContent = _currentMonth + ' · ' + state;
      document.getElementById('modal-title').textContent = state;
      document.getElementById('modal-subtitle').textContent = `${totalRaces} race${totalRaces !== 1 ? 's' : ''}`;
 
      const grid = document.getElementById('modal-cards-grid');
      grid.innerHTML = '';
      grid.className = 'town-view-grid';
 
      // Back button
      const backBtn = document.createElement('button');
      backBtn.className = 'back-btn';
      backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> All States`;
      backBtn.addEventListener('click', () => {
        const stateCount = Object.keys(buildStateMap(_currentRaces)).length;
        document.getElementById('modal-tag').textContent = 'Race Calendar';
        document.getElementById('modal-title').textContent = _currentMonth;
        document.getElementById('modal-subtitle').textContent = `${_currentRaces.length} race${_currentRaces.length !== 1 ? 's' : ''} · ${stateCount} state${stateCount !== 1 ? 's' : ''}`;
        showStateView(_currentRaces);
      });
      grid.appendChild(backBtn);
 
      // Town sections
      Object.keys(townMap).sort().forEach(town => {
        const races = townMap[town];
 
        const section = document.createElement('div');
        section.className = 'town-section';
 
        const heading = document.createElement('div');
        heading.className = 'town-heading';
        heading.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          ${town}
          <span>${races.length} race${races.length !== 1 ? 's' : ''}</span>
        `;
        section.appendChild(heading);
 
        const flipGrid = document.createElement('div');
        flipGrid.className = 'cards-grid';
 
        races.forEach(race => {
          const typeClass = race.isToday ? 'today' : race.isWeekend ? 'weekend' : 'weekday';
          const typeLabel = race.isToday ? 'Today' : race.isWeekend ? 'Weekend' : 'Weekday';
 
          const wrapper = document.createElement('div');
          wrapper.className = 'flip-wrapper town-flip-wrapper';
 
          wrapper.innerHTML = `
            <div class="flip-card town-race-card" tabindex="0" role="button" aria-label="${race.name}">
              <div class="flip-face flip-front">
                <div class="flip-front-badge ${typeClass}">${typeLabel}</div>
                <div class="flip-front-date-display">
                  ${race.dayNum}
                  <span>${race.dayName}</span>
                </div>
                <div class="flip-front-name">${race.name}</div>
                <div class="flip-hint">Tap for info ›</div>
                <div class="flip-front-bar ${typeClass}"></div>
              </div>
            </div>
          `;
 
          const flipCard = wrapper.querySelector('.flip-card');
          flipCard.addEventListener('click', () => openRacePopup(race));
          flipCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openRacePopup(race); });
 
          flipGrid.appendChild(wrapper);
        });
 
        section.appendChild(flipGrid);
        grid.appendChild(section);
      });
    }
 
    function openRacePopup(race) {
      const typeClass = race.isToday ? 'today' : race.isWeekend ? 'weekend' : 'weekday';
      const typeLabel = race.isToday ? 'Today' : race.isWeekend ? 'Weekend' : 'Weekday';
 
      document.getElementById('race-popup-type').textContent = typeLabel;
      document.getElementById('race-popup-type').className = `race-popup-type ${typeClass}`;
      document.getElementById('race-popup-date').innerHTML = `${race.dayNum}<span>${race.dayName} · ${race.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>`;
      document.getElementById('race-popup-name').textContent = race.name;
 
      document.getElementById('race-popup-stats').innerHTML = `
        <div class="stat stat--full">
          <span class="stat-label">Date</span>
          <span class="stat-value">${race.prettyDate}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Location</span>
          <span class="stat-value">${race.location || '—'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Distance</span>
          <span class="stat-value">${race.distance || '—'}</span>
        </div>
      `;
 
      document.getElementById('race-popup-cta').innerHTML = race.link
        ? `<a href="${race.link}" target="_blank" rel="noopener">Register / Event Info</a>`
        : `<span class="no-link">No registration link available</span>`;
 
      document.getElementById('race-popup-overlay').classList.add('active');
    }
 
    function closeRacePopup() {
      document.getElementById('race-popup-overlay').classList.remove('active');
    }
 
    document.getElementById('race-popup-close').addEventListener('click', closeRacePopup);
    document.getElementById('race-popup-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('race-popup-overlay')) closeRacePopup();
    });
 
    function closeModal() {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
      document.querySelectorAll('.flip-card.flipped').forEach(c => c.classList.remove('flipped'));
    }
 
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('race-popup-overlay').classList.contains('active')) {
          closeRacePopup();
        } else {
          closeModal();
        }
      }
    });
 
    // Live search
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.toLowerCase().trim();
      if (!term) { renderMonths(monthMap); return; }
      const filtered = {};
      Object.keys(monthMap).forEach(month => {
        filtered[month] = monthMap[month].filter(r =>
          r.name.toLowerCase().includes(term) ||
          r.location.toLowerCase().includes(term) ||
          r.distance.toLowerCase().includes(term)
        );
      });
      renderMonths(filtered);
    });
 
    document.getElementById('refresh-button').addEventListener('click', loadRaces);
 
    loadRaces();