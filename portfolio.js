/**
 * Tiny Temple - Portfolio Player
 *
 * L'audio proviene esclusivamente dal lettore ufficiale di Spotify, pilotato
 * tramite la Spotify iFrame API. Nessun file audio e' ospitato o servito da noi.
 * L'iframe resta visibile sotto i controlli, come richiesto dalle condizioni
 * d'uso di Spotify: i nostri comandi lo pilotano, non lo sostituiscono.
 *
 * Nota: senza una sessione Spotify attiva nel browser l'embed riproduce
 * un'anteprima di 30 secondi. Non e' un limite del sito.
 */
document.addEventListener('DOMContentLoaded', () => {
    // === 1. DATABASE ===
    // spotifyType: "track" per le uscite con un brano di riferimento, "album" per le altre.
    // Gli ID album sono ricavati dagli URL; gli ID brano li fornisce Francesco (H4).
    const portfolioData = [
        { id: 1, type: "Album", title: "tutto bene", artist: "EDODACAPO", trackName: "tutto bene", genre: "Pop / Indie", roles: "Produzione / Mix / Master", cover: "assets/portfolio_covers/cover_1.webp", spotifyType: "track", spotifyId: "3sH9MtVUoFem1QbCeuUfw1", url: "https://open.spotify.com/album/1Ki813sOi4DpRX9gCc1XTb" },
        { id: 2, type: "Album", title: "Canzoni per la decrescita felice", artist: "España Circo Este", trackName: "Vino In Cartone", genre: "Folk / Indie", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_2.webp", spotifyType: "track", spotifyId: "55m4rAnIGJtrhxeKz5DIJx", url: "https://open.spotify.com/album/5RNBlmDZEGIrGZWnBMahBx" },
        { id: 3, type: "Singolo", title: "Breakfast", artist: "Corner in Bloom", genre: "Alt Pop", roles: "Produzione / Mix", cover: "assets/portfolio_covers/cover_3.webp", spotifyType: "album", spotifyId: "2lndT5UBQ4MsmB9mfZ60cd", url: "https://open.spotify.com/album/2lndT5UBQ4MsmB9mfZ60cd" },
        { id: 4, type: "Album", title: "storie di arcieri e altri animali", artist: "Maura", trackName: "Rubi in chiesa", genre: "Cantautorato", roles: "Mix / Master / Synth", cover: "assets/portfolio_covers/cover_4.webp", spotifyType: "track", spotifyId: "3Qv9K7ryK7SPrFgPJrfrdF", url: "https://open.spotify.com/album/0chcpZo5oBoXe7AaV9QBrz" },
        { id: 5, type: "Singolo", title: "Non so più correre", artist: "Santi", genre: "Indie Rock", roles: "Produzione / Arrangiamento", cover: "assets/portfolio_covers/cover_5.webp", spotifyType: "album", spotifyId: "7lcFADq6EULl5O42v3SsfM", url: "https://open.spotify.com/album/7lcFADq6EULl5O42v3SsfM" },
        { id: 6, type: "Singolo", title: "Straordinarie Primavere", artist: "Clemente Guidi", genre: "Cantautorato", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_6.webp", spotifyType: "album", spotifyId: "0qy84P5cRjPa0BAWabTp00", url: "https://open.spotify.com/album/0qy84P5cRjPa0BAWabTp00" },
        { id: 7, type: "Singolo", title: "Carpe die", artist: "STRE", genre: "Pop", roles: "Vocal Production / Mix", cover: "assets/portfolio_covers/cover_7.webp", spotifyType: "album", spotifyId: "3IBhGA2HsfvPPMpRqleJes", url: "https://open.spotify.com/album/3IBhGA2HsfvPPMpRqleJes" },
        { id: 8, type: "Singolo", title: "Tu Da Me", artist: "TiBi", genre: "Alt Pop", roles: "Produzione / Mix / Master", cover: "assets/portfolio_covers/cover_8.webp", spotifyType: "album", spotifyId: "0uzeXYj3sAYOF1CgoGN6rE", url: "https://open.spotify.com/album/0uzeXYj3sAYOF1CgoGN6rE" },
        { id: 9, type: "Album", title: "Restate Come Siete", artist: "Visioni di Cody", trackName: "Le Colonie", genre: "Rock", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_9.webp", spotifyType: "track", spotifyId: "4EiJY6YnokQtOKIEuGwD7g", url: "https://open.spotify.com/album/3JJTfTdtAbPEhH8SIJrn1h" },
        { id: 10, type: "Singolo", title: "Maldive", artist: "MANGO DREAM", genre: "Synth Pop", roles: "Produzione / Mix", cover: "assets/portfolio_covers/cover_10.webp", spotifyType: "album", spotifyId: "4JxqttXHh2g7MyWjFANmT0", url: "https://open.spotify.com/album/4JxqttXHh2g7MyWjFANmT0" },
        { id: 11, type: "Album", title: "Radici", artist: "My Girl Is Retro", trackName: "Tango!, atto I", genre: "Cantautorato", roles: "Master", cover: "assets/portfolio_covers/cover_11.webp", spotifyType: "track", spotifyId: "0FUsUiODo6pR7M2f5m5ZjO", url: "https://open.spotify.com/album/6OZa0WGIyhE18hWoAhiLOo" },
        { id: 12, type: "Singolo", title: "Lacci", artist: "Maura", genre: "Cantautorato", roles: "Produzione / Mix / Master", cover: "assets/portfolio_covers/cover_12.webp", spotifyType: "album", spotifyId: "4TTGgb7iBJ7WJGJLdY3Xbm", url: "https://open.spotify.com/album/4TTGgb7iBJ7WJGJLdY3Xbm" },
        { id: 13, type: "Singolo", title: "Lemon", artist: "Corner in Bloom", genre: "Alt Pop", roles: "Mix / Master", cover: "assets/portfolio_covers/cover_13.webp", spotifyType: "album", spotifyId: "03CUTGzybeijvohpiyXMN0", url: "https://open.spotify.com/album/03CUTGzybeijvohpiyXMN0" },
        { id: 14, type: "Singolo", title: "ciaociaoamore", artist: "Santi", genre: "Indie Rock", roles: "Produzione / Mix", cover: "assets/portfolio_covers/cover_14.webp", spotifyType: "album", spotifyId: "5qiw4a5WupiR0KeqJpTL0Z", url: "https://open.spotify.com/album/5qiw4a5WupiR0KeqJpTL0Z" },
        { id: 15, type: "Singolo", title: "Fuori Stagione", artist: "TiBi", genre: "Alt Pop", roles: "Produzione / Arrangiamento", cover: "assets/portfolio_covers/cover_15.webp", spotifyType: "album", spotifyId: "48MlZ37NjHyumT3gMlep0c", url: "https://open.spotify.com/album/48MlZ37NjHyumT3gMlep0c" }
    ];

    let currentIndex = Math.floor(Math.random() * portfolioData.length);
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

    // NODI EMBED / CONSENSO
    const consentBox = document.getElementById('mp-consent-box');
    const consentAllowBtn = document.getElementById('mp-consent-allow');
    const spotifyWrap = document.getElementById('mp-spotify-wrap');
    const spotifyHost = document.getElementById('mp-spotify-host');

    // === 2. STATO SPOTIFY ===
    let spotifyController = null;   // controller ufficiale della iFrame API
    let apiRequested = false;
    let durationMs = 0;
    let positionMs = 0;
    let pendingPlay = false;        // "play" chiesto prima che il controller fosse pronto

    function fmt(ms) {
        if (!ms || ms < 0 || !isFinite(ms)) return '0:00';
        const total = Math.floor(ms / 1000);
        return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
    }

    /* L'ID valido: quello del brano se Francesco l'ha fornito, altrimenti l'album. */
    function resolveUri(track) {
        const id = track.spotifyId;
        const valid = id && !/^<{3}TODO/.test(id);   // gli ID non ancora forniti sono segnaposto
        if (valid) return `spotify:${track.spotifyType}:${id}`;
        const fromUrl = (track.url || '').match(/\/(album|track)\/([A-Za-z0-9]+)/);
        if (fromUrl) return `spotify:${fromUrl[1]}:${fromUrl[2]}`;
        return null;
    }

    // === 3. COVERFLOW ===
    portfolioData.forEach((track, i) => {
        const img = document.createElement('img');
        img.src = track.cover;
        img.className = 'carousel-item';
        img.alt = `${track.title} - ${track.artist}`;

        img.addEventListener('click', (e) => {
            if (dragSuppressClick) { e.preventDefault(); return; }
            if (currentIndex !== i) {
                loadTrack(i);
                requestPlay();
            } else {
                togglePlay();
            }
        });

        mpCarousel.appendChild(img);
        coverElements.push(img);
    });

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

    // === 4. TRACKLIST ===
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
                    const rect = row.getBoundingClientRect();
                    seekToPercent((e.clientX - rect.left) / rect.width);
                }
            } else {
                loadTrack(index);
                requestPlay();
            }
        });
        tracklistBody.appendChild(row);
    });

    // === 5. CARICAMENTO TRACCIA ===
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

        // il riquadro di consenso mostra la copertina di questa uscita
        if (consentBox) {
            const ph = consentBox.querySelector('.mp-consent-cover');
            if (ph) { ph.src = track.cover; ph.alt = `${track.title} - ${track.artist}`; }
        }

        updateCarousel(0);

        positionMs = 0;
        durationMs = 0;
        mpProgressFill.style.width = '0%';
        mpTimeCurrent.textContent = '0:00';
        mpTimeTotal.textContent = '0:00';

        const activeRow = document.getElementById(`track-${currentIndex}`);
        if (activeRow) activeRow.classList.add('playing');

        if (spotifyController) {
            const uri = resolveUri(track);
            if (uri) spotifyController.loadUri(uri);
        }

        updatePlayIcons(isPlaying);
    }

    // === 6. SCROLL ROTELLINA DESKTOP ===
    const SCROLL_THRESHOLD = 45;
    let wheelDelta = 0;
    let wheelResetTimeout = null;

    mpCarousel.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        wheelDelta += delta;

        if (wheelDelta > SCROLL_THRESHOLD) {
            loadTrack(currentIndex + 1);
            if (isPlaying) requestPlay();
            wheelDelta = 0;
        } else if (wheelDelta < -SCROLL_THRESHOLD) {
            loadTrack(currentIndex - 1);
            if (isPlaying) requestPlay();
            wheelDelta = 0;
        }

        clearTimeout(wheelResetTimeout);
        wheelResetTimeout = setTimeout(() => { wheelDelta = 0; }, 180);
    }, { passive: false });

    // === 7. GESTI (drag con inerzia) ===
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
        if (inertiaRafId) { cancelAnimationFrame(inertiaRafId); inertiaRafId = null; }

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
        if (Math.abs(deltaX) > 6) dragSuppressClick = true;

        currentDragOffset = deltaX;
        updateCarousel(currentDragOffset / getStepPx());

        dragSamples.push({ x: e.clientX, t: now });
        while (dragSamples.length > 2 && dragSamples[0].t < now - 90) dragSamples.shift();
    });

    function finishDrag(e) {
        if (!isDragging) return;
        isDragging = false;

        try {
            if (mpCarousel.hasPointerCapture(e.pointerId)) mpCarousel.releasePointerCapture(e.pointerId);
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
            if (dt > 8) velocityPxMs = (first.x - last.x) / dt;
        }

        const friction = 0.92;
        let velocity = velocityPxMs * 16;
        const stepPx = getStepPx();

        function runInertia() {
            velocity *= friction;
            currentDragOffset += velocity;

            if (Math.abs(currentDragOffset) >= stepPx) {
                const shift = Math.trunc(currentDragOffset / stepPx);
                currentIndex = ((currentIndex + shift) % portfolioData.length + portfolioData.length) % portfolioData.length;
                currentDragOffset -= shift * stepPx;
            }

            updateCarousel(currentDragOffset / stepPx);

            if (Math.abs(velocity) > 0.5) {
                inertiaRafId = requestAnimationFrame(runInertia);
            } else {
                mpCarousel.classList.remove('is-dragging');
                loadTrack(currentIndex + Math.round(currentDragOffset / stepPx));
                if (isPlaying) requestPlay();
                inertiaRafId = null;
            }
        }

        if (Math.abs(velocity) > 1.2) {
            mpCarousel.classList.add('is-dragging');
            inertiaRafId = requestAnimationFrame(runInertia);
        } else {
            mpCarousel.classList.remove('is-dragging');
            const steps = Math.round(currentDragOffset / stepPx);
            if (steps !== 0) {
                loadTrack(currentIndex + steps);
                if (isPlaying) requestPlay();
            } else {
                updateCarousel(0);
            }
        }

        dragSamples = [];
        if (dragSuppressClick) setTimeout(() => { dragSuppressClick = false; }, 60);
    }

    mpCarousel.addEventListener('pointerup', finishDrag);
    mpCarousel.addEventListener('pointercancel', finishDrag);

    // === 8. CONTROLLI: pilotano il lettore Spotify via iFrame API ===
    /* L'API espone resume()/play()/togglePlay() a seconda della versione:
       proviamo in ordine, cosi' il comando non si perde. */
    function spotifyPlay() {
        if (!spotifyController) return false;
        try {
            if (typeof spotifyController.resume === 'function') spotifyController.resume();
            else if (typeof spotifyController.play === 'function') spotifyController.play();
            else if (typeof spotifyController.togglePlay === 'function') spotifyController.togglePlay();
            else return false;
            return true;
        } catch (err) {
            console.warn('[player] avvio non riuscito', err);
            return false;
        }
    }

    function requestPlay() {
        if (!window.TinyConsent || !window.TinyConsent.isGranted()) {
            pendingPlay = true;
            showConsentBox(true);
            return;
        }
        pendingPlay = true;
        ensureSpotifyApi();
        if (spotifyPlay()) {
            isPlaying = true;
            updatePlayIcons(true);
        }
    }

    function pausePlayback() {
        pendingPlay = false;
        if (spotifyController) spotifyController.pause();
        isPlaying = false;
        updatePlayIcons(false);
    }

    function togglePlay() {
        if (isPlaying) pausePlayback(); else requestPlay();
    }

    function seekToPercent(percent) {
        if (!spotifyController || !durationMs) return;
        const target = Math.max(0, Math.min(1, percent)) * durationMs;
        spotifyController.seek(target / 1000);
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

    function updateProgress() {
        const percent = durationMs ? (positionMs / durationMs) * 100 : 0;
        mpProgressFill.style.width = `${percent}%`;
        mpTimeCurrent.textContent = fmt(positionMs);
        mpTimeTotal.textContent = fmt(durationMs);

        const rowProgress = document.getElementById(`row-progress-${currentIndex}`);
        const rowTime = document.getElementById(`row-time-${currentIndex}`);
        if (rowProgress) rowProgress.style.width = `${percent}%`;
        if (rowTime) rowTime.textContent = fmt(positionMs);
    }

    mpPlayBtn.addEventListener('click', togglePlay);
    mpNextBtn.addEventListener('click', () => { loadTrack(currentIndex + 1); if (isPlaying || pendingPlay) requestPlay(); });
    mpPrevBtn.addEventListener('click', () => { loadTrack(currentIndex - 1); if (isPlaying || pendingPlay) requestPlay(); });

    mpProgressContainer.addEventListener('click', (e) => {
        seekToPercent(e.offsetX / mpProgressContainer.clientWidth);
    });

    // === 9. CONSENSO E CARICAMENTO DELL'EMBED ===
    function showConsentBox(show) {
        if (!consentBox) return;
        consentBox.hidden = !show;
        if (spotifyWrap) spotifyWrap.hidden = show;
    }

    /* Carica lo script della iFrame API. Chiamata SOLO dopo il consenso:
       e' la prima e unica richiesta verso open.spotify.com. */
    function ensureSpotifyApi() {
        if (apiRequested) return;
        apiRequested = true;

        window.onSpotifyIframeApiReady = (IFrameAPI) => {
            const uri = resolveUri(portfolioData[currentIndex]);
            if (!uri) { console.warn('[portfolio] nessun URI Spotify per questa uscita'); return; }

            IFrameAPI.createController(
                spotifyHost,
                { uri: uri, width: '100%', height: 80 },
                (controller) => {
                    spotifyController = controller;

                    controller.addListener('playback_update', (e) => {
                        if (!e || !e.data) return;
                        positionMs = e.data.position || 0;
                        durationMs = e.data.duration || 0;
                        const nowPlaying = e.data.isPaused === false;
                        if (nowPlaying !== isPlaying) {
                            isPlaying = nowPlaying;
                            updatePlayIcons(isPlaying);
                        }
                        updateProgress();
                    });

                    controller.addListener('ready', () => {
                        if (pendingPlay && spotifyPlay()) {
                            isPlaying = true;
                            updatePlayIcons(true);
                        }
                    });

                }
            );
        };

        const s = document.createElement('script');
        s.src = 'https://open.spotify.com/embed/iframe-api/v1';
        s.async = true;
        document.head.appendChild(s);
    }

    function activateEmbed() {
        showConsentBox(false);
        ensureSpotifyApi();
    }

    if (consentAllowBtn) {
        consentAllowBtn.addEventListener('click', () => {
            if (window.TinyConsent) window.TinyConsent.grant();
            activateEmbed();
        });
    }

    if (window.TinyConsent) {
        window.TinyConsent.onGrant(activateEmbed);
    }

    // === 10. AVVIO ===
    setTimeout(() => {
        document.body.classList.remove('loading-state');
        loadTrack(currentIndex);
        const granted = window.TinyConsent && window.TinyConsent.isGranted();
        showConsentBox(!granted);
        if (granted) ensureSpotifyApi();
    }, 150);
});
