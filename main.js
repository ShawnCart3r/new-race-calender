 const sheetURL = 'https://docs.google.com/spreadsheets/d/1H0pvW1hrIi3zCNPrIRN_oOKzN8Hw2RaY8vXERcmLiSU/gviz/tq?tqx=out:json&sheet=Sheet1';
    const monthsGrid = document.getElementById('months-grid');
    const searchInput = document.getElementById('search');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
 
    let monthMap = {};
 
    // Distinct gradients per month slot (cycles if > 12 months)
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
 
            const match = rawDate?.match(/Date\((\d+),(\d+),(\d+)\)/);
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
            <p class="month-card-tag">Fleet Feet Vermont</p>
            <h2 class="month-card-title">${month}</h2>
            <span class="month-card-cta">
              View Races
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
          </div>
        `;
 
        card.addEventListener('click', () => openModal(month, races));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(month, races); });
 
        // Staggered reveal on load
        setTimeout(() => card.classList.add('visible'), i * 80);
        monthsGrid.appendChild(card);
      });
    }
 
    function openModal(month, races) {
      document.getElementById('modal-tag').textContent = 'Race Calendar';
      document.getElementById('modal-title').textContent = month;
      document.getElementById('modal-subtitle').textContent = `${races.length} upcoming race${races.length !== 1 ? 's' : ''}`;
 
      const grid = document.getElementById('modal-cards-grid');
      grid.innerHTML = '';
 
      races.forEach(race => {
        const typeClass = race.isToday ? 'today' : race.isWeekend ? 'weekend' : 'weekday';
        const typeLabel = race.isToday ? 'Today' : race.isWeekend ? 'Weekend' : 'Weekday';
 
        const wrapper = document.createElement('div');
        wrapper.className = 'flip-wrapper';
 
        wrapper.innerHTML = `
          <div class="flip-card" tabindex="0" role="button" aria-label="${race.name} — tap to see details">
            <div class="flip-face flip-front">
              <div class="flip-front-badge ${typeClass}">${typeLabel}</div>
              <div class="flip-front-date-display">
                ${race.dayNum}
                <span>${race.dayName}</span>
              </div>
              <div class="flip-front-name">${race.name}</div>
              <div class="flip-hint">Tap for details</div>
              <div class="flip-front-bar ${typeClass}"></div>
            </div>
            <div class="flip-face flip-back">
              <div class="flip-back-title">${race.name}</div>
              <div class="stats-grid">
                <div class="stat stat--full">
                  <span class="stat-label">Date</span>
                  <span class="stat-value">${race.prettyDate}</span>
                </div>
                <div class="stat stat--full">
                  <span class="stat-label">Location</span>
                  <span class="stat-value">${race.location || '—'}</span>
                </div>
                <div class="stat stat--full">
                  <span class="stat-label">Distance</span>
                  <span class="stat-value">${race.distance || '—'}</span>
                </div>
              </div>
              <div class="flip-back-cta">
                ${race.link
                  ? `<a href="${race.link}" target="_blank" rel="noopener">Event Info &rarr;</a>`
                  : `<span class="no-link">No link available</span>`
                }
              </div>
            </div>
          </div>
        `;
 
        // Flip on click / keyboard
        const flipCard = wrapper.querySelector('.flip-card');
        flipCard.addEventListener('click', () => flipCard.classList.toggle('flipped'));
        flipCard.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') flipCard.classList.toggle('flipped');
        });
 
        grid.appendChild(wrapper);
      });
 
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
 
    function closeModal() {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
      // reset all flipped cards
      document.querySelectorAll('.flip-card.flipped').forEach(c => c.classList.remove('flipped'));
    }
 
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
 
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