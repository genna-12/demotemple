/**
 * Tiny Temple - Master Player (Hardware-Accelerated Pointer Engine with Inertia)
 */
document.addEventListener('DOMContentLoaded', () => {
    // === 1. DATABASE ===
    const portfolioData = [
        { id: 1, type: "Album", title: "tutto bene", artist: "EDODACAPO", trackName: "tutto bene", genre: "Pop / Indie", roles: "Produzione / Mix / Master", cover: "assets/portfolio_covers/cover_1.webp", audio: "assets/audio/track_1.mp3", url: "https://open.spotify.com/intl-it/album/1Ki813sOi4DpRX9gCc1XTb" },
        { id: 2, type: "Album", title: "Canzoni per la decrescita felice", artist: "España Circo Este", trackName: "Vino In Cartone", genre: "Folk / Indie", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_2.webp", audio: "assets/audio/track_2.mp3", url: "https://open.spotify.com/intl-it/album/5RNBlmDZEGIrGZWnBMahBx" },
        { id: 3, type: "Singolo", title: "Breakfast", artist: "Corner in Bloom", genre: "Alt Pop", roles: "Produzione / Mix", cover: "assets/portfolio_covers/cover_3.webp", audio: "assets/audio/track_3.mp3", url: "https://open.spotify.com/intl-it/album/2lndT5UBQ4MsmB9mfZ60cd" },
        { id: 4, type: "Album", title: "storie di arcieri e altri animali", artist: "Maura", trackName: "Rubi in chiesa", genre: "Cantautorato", roles: "Mix / Master / Synth", cover: "assets/portfolio_covers/cover_4.webp", audio: "assets/audio/track_4.mp3", url: "https://open.spotify.com/intl-it/album/0chcpZo5oBoXe7AaV9QBrz" },
        { id: 5, type: "Singolo", title: "Non so più correre", artist: "Santi", genre: "Indie Rock", roles: "Produzione / Arrangiamento", cover: "assets/portfolio_covers/cover_5.webp", audio: "assets/audio/track_5.mp3", url: "https://open.spotify.com/intl-it/album/7lcFADq6EULl5O42v3SsfM" },
        { id: 6, type: "Singolo", title: "Straordinarie Primavere", artist: "Clemente Guidi", genre: "Cantautorato", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_6.webp", audio: "assets/audio/track_6.mp3", url: "https://open.spotify.com/intl-it/album/0qy84P5cRjPa0BAWabTp00" },
        { id: 7, type: "Singolo", title: "Carpe die", artist: "STRE", genre: "Pop", roles: "Vocal Production / Mix", cover: "assets/portfolio_covers/cover_7.webp", audio: "assets/audio/track_7.mp3", url: "https://open.spotify.com/intl-it/album/3IBhGA2HsfvPPMpRqleJes" },
        { id: 8, type: "Singolo", title: "Tu Da Me", artist: "TiBi", genre: "Alt Pop", roles: "Produzione / Mix / Master", cover: "assets/portfolio_covers/cover_8.webp", audio: "assets/audio/track_8.mp3", url: "https://open.spotify.com/intl-it/album/0uzeXYj3sAYOF1CgoGN6rE" },
        { id: 9, type: "Album", title: "Restate Come Siete", artist: "Visioni di Cody", trackName: "Le Colonie", genre: "Rock", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_9.webp", audio: "assets/audio/track_9.mp3", url: "https://open.spotify.com/intl-it/album/3JJTfTdtAbPEhH8SIJrn1h" },
        { id: 10, type: "Singolo", title: "Maldive", artist: "MANGO DREAM", genre: "Synth Pop", roles: "Produzione / Mix", cover: "assets/portfolio_covers/cover_10.webp", audio: "assets/audio/track_10.mp3", url: "https://open.spotify.com/intl-it/album/4JxqttXHh2g7MyWjFANmT0" },
        { id: 11, type: "Album", title: "Radici", artist: "My Girl Is Retro", trackName: "Tango!, atto I", genre: "Cantautorato", roles: "Master", cover: "assets/portfolio_covers/cover_11.webp", audio: "assets/audio/track_11.mp3", url: "https://open.spotify.com/intl-it/album/6OZa0WGIyhE18hWoAhiLOo" },
        { id: 12, type: "Singolo", title: "Lacci", artist: "Maura", genre: "Cantautorato", roles: "Produzione / Mix / Master", cover: "assets/portfolio_covers/cover_12.webp", audio: "assets/audio/track_12.mp3", url: "https://open.spotify.com/intl-it/album/4TTGgb7iBJ7WJGJLdY3Xbm" },
        { id: 13, type: "Singolo", title: "Lemon", artist: "Corner in Bloom", genre: "Alt Pop", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_13.webp", audio: "assets/audio/track_13.mp3", url: "https://open.spotify.com/intl-it/album/03CUTGzybeijvohpiyXMN0" },
        { id: 14, type: "Singolo", title: "ciaociaoamore", artist: "Santi", genre: "Indie Rock", roles: "Produzione / Mix", cover: "assets/portfolio_covers/cover_14.webp", audio: "assets/audio/track_14.mp3", url: "https://open.spotify.com/intl-it/album/5qiw4a5WupiR0KeqJpTL0Z" },
        { id: 15, type: "Singolo", title: "Fuori Stagione", artist: "TiBi", genre: "Alt Pop", roles: "Produzione / Arrangiamento", cover: "assets/portfolio_covers/cover_15.webp", audio: "assets/audio/track_15.mp3", url: "https://open.spotify.com/intl-it/album/48MlZ37NjHyumT3gMlep0c" }
    ];

    let currentIndex = Math.floor(Math.random() * portfolioData.length);
    let currentAudio = new Audio();
    let isPlaying = false;
    let coverElements = [];

    // NODI INFO
    const dynType = document.getElementById('mp-dynamic-type');
    const dynTitle = document.getElementById('mp-dynamic-title');
    const dynArtist = document.getElementById('mp-dynamic-artist');
    const dynSongWrap = document.getElementById('mp-dynamic-song');
    const dynSongName = document.getElementById('mp-song-name');

    // NODI CONTROLLI
    const mpCarousel = document.getElementById('mp-carousel');
    const mpPlayBtn = document.getElementById('mp-play');
    const mpIconPlay = document.getElementById('mp-icon-play');
    const mpIconPause = document.getElementById('mp-icon-pause');
    const mpPrevBtn = document.getElementById('mp-prev');
    const mpNextBtn = document.getElementById('mp-next');
    const mpSpotifyBtn = document.getElementById('mp-spotify-btn');
    const mpProgressContainer = document.getElementById('mp-progress-container');
    const mpProgressFill = document.getElementById('mp-progress-fill');
    const mpTimeCurrent = document.getElementById('mp-time-current');
    const mpTimeTotal = document.getElementById('mp-time-total');
    const tracklistBody = document.getElementById('tracklist-body');

    // === 2. INIZIALIZZAZIONE COVERFLOW ===
    portfolioData.forEach((track, i) => {
        const img = document.createElement('img');
        img.src = track.cover;
        img.className = 'carousel-item';
        img.alt = `${track.title} - ${track.artist}`;

        img.addEventListener('click', (e) => {
            if (dragSuppressClick) {
                e.preventDefault();
                return;
            }
            if (currentIndex !== i) {
                loadTrack(i);
                playAudio();
            } else {
                togglePlay();
            }
        });

        mpCarousel.appendChild(img);
        coverElements.push(img);
    });

    // Rendering posizioni 3D
    function updateCarousel(liveOffset = 0) {
        const total = portfolioData.length;
        const isMobile = window.innerWidth <= 768;
        const offset = isMobile ? 95 : 140;
        const zOffset = isMobile ? 70 : 100;
        const rotation = isMobile ? 38 : 45;

        coverElements.forEach((img, i) => {
            let diff = (i - currentIndex) % total;
            if (diff > Math.floor(total / 2)) diff -= total;
            if (diff < -Math.floor(total / 2)) diff += total;

            diff -= liveOffset;

            const absDiff = Math.abs(diff);
            const clampedDiff = Math.max(-1, Math.min(1, diff));

            const translateX = diff * offset + clampedDiff * (isMobile ? 12 : 20);
            const translateZ = -absDiff * zOffset + Math.max(0, 1 - absDiff) * (isMobile ? 28 : 40);
            const rotateY = -clampedDiff * rotation;

            img.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`;
            img.style.opacity = absDiff > 3.5 ? 0 : Math.max(0, 1 - absDiff * 0.2);
            img.style.pointerEvents = absDiff > 4 ? 'none' : 'auto';
        });
    }

    // === 3. TABELLA TRACKLIST ===
    portfolioData.forEach((track, index) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.id = `track-${index}`;
        row.innerHTML = `
            <div class="track-progress" id="row-progress-${index}"></div>
            <div class="col-play">
                <button class="list-play-btn" id="row-btn-${index}" aria-label="Play ${track.title}">
                    <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
            </div>
            <div class="col-cover"><img src="${track.cover}" alt="Cover" loading="lazy"></div>
            <div class="mobile-stack"><div class="col-title">${track.title}</div><div class="col-artist">${track.artist}</div></div>
            <div class="col-genre">${track.genre}</div>
            <div class="col-roles">${track.roles}</div>
            <div class="col-time" id="row-time-${index}">0:00</div>
        `;
        row.addEventListener('click', (e) => {
            if (currentIndex === index) {
                if (e.target.closest('.list-play-btn')) {
                    togglePlay();
                } else {
                    const percent = (e.clientX - row.getBoundingClientRect().left) / row.getBoundingClientRect().width;
                    if (currentAudio.duration) currentAudio.currentTime = percent * currentAudio.duration;
                }
            } else {
                loadTrack(index);
                playAudio();
            }
        });
        tracklistBody.appendChild(row);
    });

    // === 4. LOGICA CARICAMENTO TRACCIA (GPU NATIVE) ===
    function loadTrack(index) {
        document.querySelectorAll('.track-row').forEach(el => el.classList.remove('playing'));
        document.querySelectorAll('.icon-play').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.icon-pause').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.track-progress').forEach(el => el.style.width = '0%');

        currentIndex = ((index % portfolioData.length) + portfolioData.length) % portfolioData.length;
        const track = portfolioData[currentIndex];

        dynType.textContent = track.type || "Singolo";
        dynType.setAttribute('data-type', track.type || "Singolo");
        dynTitle.textContent = track.title;
        dynArtist.textContent = track.artist;

        if (track.type === "Album" && track.trackName) {
            dynSongName.textContent = track.trackName;
            dynSongWrap.style.display = 'block';
        } else {
            dynSongWrap.style.display = 'none';
        }

        mpSpotifyBtn.href = track.url || "#";
        updateCarousel(0);
        currentAudio.src = track.audio;

        const activeRow = document.getElementById(`track-${currentIndex}`);
        if (activeRow) activeRow.classList.add('playing');
        updatePlayIcons(isPlaying);
    }

    // === 5. SCROLL ROTELLINA DESKTOP ===
    const SCROLL_THRESHOLD = 45;
    let wheelDelta = 0;
    let wheelResetTimeout = null;

    mpCarousel.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        wheelDelta += delta;

        if (wheelDelta > SCROLL_THRESHOLD) {
            loadTrack(currentIndex + 1);
            if (isPlaying) playAudio();
            wheelDelta = 0;
        } else if (wheelDelta < -SCROLL_THRESHOLD) {
            loadTrack(currentIndex - 1);
            if (isPlaying) playAudio();
            wheelDelta = 0;
        }

        clearTimeout(wheelResetTimeout);
        wheelResetTimeout = setTimeout(() => { wheelDelta = 0; }, 180);
    }, { passive: false });

    // === 6. GESTIONE GESTI UNIVERSALE (INERTIAL / MOMENTUM FLICK ENGINE) ===
    const getStepPx = () => (window.innerWidth <= 768 ? 85 : 135);
    let isDragging = false;
    let dragSuppressClick = false;
    let startX = 0;
    let startY = 0;
    let currentDragOffset = 0;
    let isHorizontalGesture = null;
    let dragSamples = [];
    let inertiaRafId = null;

    mpCarousel.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        
        if (inertiaRafId) {
            cancelAnimationFrame(inertiaRafId);
            inertiaRafId = null;
        }

        isDragging = true;
        dragSuppressClick = false;
        startX = e.clientX;
        startY = e.clientY;
        currentDragOffset = 0;
        isHorizontalGesture = null;
        dragSamples = [{ x: e.clientX, t: performance.now() }];
        
        mpCarousel.classList.add('is-dragging');
        mpCarousel.setPointerCapture(e.pointerId);
    });

    mpCarousel.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const now = performance.now();
        const deltaX = startX - e.clientX;
        const deltaY = startY - e.clientY;

        if (isHorizontalGesture === null && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
            isHorizontalGesture = Math.abs(deltaX) >= Math.abs(deltaY);
        }

        if (isHorizontalGesture === false) return;

        if (Math.abs(deltaX) > 6) {
            dragSuppressClick = true;
        }

        currentDragOffset = deltaX;
        const liveOffset = currentDragOffset / getStepPx();
        updateCarousel(liveOffset);

        dragSamples.push({ x: e.clientX, t: now });
        while (dragSamples.length > 2 && dragSamples[0].t < now - 90) {
            dragSamples.shift();
        }
    });

    function finishDrag(e) {
        if (!isDragging) return;
        isDragging = false;

        try {
            if (mpCarousel.hasPointerCapture(e.pointerId)) {
                mpCarousel.releasePointerCapture(e.pointerId);
            }
        } catch (err) {}

        if (isHorizontalGesture === false) {
            mpCarousel.classList.remove('is-dragging');
            updateCarousel(0);
            return;
        }

        let velocityPxMs = 0;
        if (dragSamples.length >= 2) {
            const first = dragSamples[0];
            const last = dragSamples[dragSamples.length - 1];
            const dt = last.t - first.t;
            if (dt > 8) {
                velocityPxMs = (first.x - last.x) / dt;
            }
        }

        const friction = 0.92;
        let velocity = velocityPxMs * 16;
        const stepPx = getStepPx();

        function runInertia() {
            velocity *= friction;
            currentDragOffset += velocity;

            // Se lo spostamento supera una copertina, aggiorna l'indice
            if (Math.abs(currentDragOffset) >= stepPx) {
                const shift = Math.trunc(currentDragOffset / stepPx);
                currentIndex = ((currentIndex + shift) % portfolioData.length + portfolioData.length) % portfolioData.length;
                currentDragOffset -= shift * stepPx;
            }

            const liveOffset = currentDragOffset / stepPx;
            // Mantieni attiva la classe .is-dragging per MANTENERE disattivate le transizioni CSS mentre si muove
            updateCarousel(liveOffset);

            if (Math.abs(velocity) > 0.5) {
                inertiaRafId = requestAnimationFrame(runInertia);
            } else {
                // INERZIA FINITA: Rimuovi la classe per riattivare le transizioni fluide CSS prima dello SNAP
                mpCarousel.classList.remove('is-dragging');
                
                const finalShift = Math.round(currentDragOffset / stepPx);
                loadTrack(currentIndex + finalShift);
                if (isPlaying) playAudio();
                inertiaRafId = null;
            }
        }

        if (Math.abs(velocity) > 1.2) {
            // Mantiene .is-dragging attivo durante l'inerzia per evitare glitch visivi
            mpCarousel.classList.add('is-dragging');
            inertiaRafId = requestAnimationFrame(runInertia);
        } else {
            mpCarousel.classList.remove('is-dragging');
            const steps = Math.round(currentDragOffset / stepPx);
            if (steps !== 0) {
                loadTrack(currentIndex + steps);
                if (isPlaying) playAudio();
            } else {
                updateCarousel(0);
            }
        }

        dragSamples = [];
        if (dragSuppressClick) {
            setTimeout(() => { dragSuppressClick = false; }, 60);
        }
    }

    mpCarousel.addEventListener('pointerup', finishDrag);
    mpCarousel.addEventListener('pointercancel', finishDrag);

    // === 7. CONTROLLI AUDIO PLAYBACK ===
    function playAudio() {
        currentAudio.play().catch(() => console.log("Audio pronto"));
        isPlaying = true;
        updatePlayIcons(true);
    }

    function pauseAudio() {
        currentAudio.pause();
        isPlaying = false;
        updatePlayIcons(false);
    }

    function togglePlay() {
        isPlaying ? pauseAudio() : playAudio();
    }

    function updatePlayIcons(playing) {
        mpIconPlay.style.display = playing ? 'none' : 'block';
        mpIconPause.style.display = playing ? 'block' : 'none';
        const activeRowBtn = document.getElementById(`row-btn-${currentIndex}`);
        if (activeRowBtn) {
            activeRowBtn.querySelector('.icon-play').style.display = playing ? 'none' : 'block';
            activeRowBtn.querySelector('.icon-pause').style.display = playing ? 'block' : 'none';
        }
    }

    mpPlayBtn.addEventListener('click', togglePlay);
    mpNextBtn.addEventListener('click', () => { loadTrack(currentIndex + 1); if (isPlaying) playAudio(); });
    mpPrevBtn.addEventListener('click', () => { loadTrack(currentIndex - 1); if (isPlaying) playAudio(); });

    currentAudio.addEventListener('loadedmetadata', () => {
        const totalMins = Math.floor(currentAudio.duration / 60);
        const totalSecs = Math.floor(currentAudio.duration % 60).toString().padStart(2, '0');
        mpTimeTotal.textContent = `${totalMins}:${totalSecs}`;
    });

    currentAudio.addEventListener('timeupdate', () => {
        if (!currentAudio.duration) return;
        const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
        const currentMins = Math.floor(currentAudio.currentTime / 60);
        const currentSecs = Math.floor(currentAudio.currentTime % 60).toString().padStart(2, '0');
        const timeString = `${currentMins}:${currentSecs}`;

        mpProgressFill.style.width = `${percent}%`;
        mpTimeCurrent.textContent = timeString;

        const rowProgress = document.getElementById(`row-progress-${currentIndex}`);
        const rowTime = document.getElementById(`row-time-${currentIndex}`);
        if (rowProgress) rowProgress.style.width = `${percent}%`;
        if (rowTime) rowTime.textContent = timeString;
    });

    mpProgressContainer.addEventListener('click', (e) => {
        const percent = e.offsetX / mpProgressContainer.clientWidth;
        if (currentAudio.duration) currentAudio.currentTime = percent * currentAudio.duration;
    });

    currentAudio.addEventListener('ended', () => {
        loadTrack(currentIndex + 1);
        playAudio();
    });

    setTimeout(() => {
        document.body.classList.remove('loading-state');
        loadTrack(currentIndex);
    }, 150);
});