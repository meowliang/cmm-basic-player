// Playlist data (hardcoded for now)
const playlist = {
    playlist_name: "Ni de Aquí, ni de Allá",
    tracks: [
        {
            chapter: 1,
            title: "La Placita Raid",
            audio_url: "https://cmm-cloud-2.s3.us-west-1.amazonaws.com/WALKING+TOURS/2025-03-15-DTLA-WALKINGTOUR/2025-03-15-DTLA-AUDIO/2025-03-15-DTLA-CH-1.mp3",
            artwork_url: "https://cmm-cloud-2.s3.us-west-1.amazonaws.com/WALKING+TOURS/2025-03-15-DTLA-WALKINGTOUR/2025-03-15-DTLA-ART/2025-03-15-DTLA-ART-CH-1.jpg",
            IsAR: true,
            XR_Scene: "https://cmm-cloud-2.s3.us-west-1.amazonaws.com/XR-TEASERS/2025-03-31-XR-TEASERS/2025-02-24-DTLA-AR-1-PLACITA.mp4",
            duration: "1:15"
        },
        // Add more tracks as needed
    ]
};

// State management
const state = {
    currentTrack: 0,
    isPlaying: false,
    isXRMode: false,
    volume: 1,
    isMuted: false,
    videoElement: null,
    isVideoSynced: false
};

// DOM Elements
const elements = {
    audioElement: document.getElementById('audioElement'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    muteBtn: document.getElementById('muteBtn'),
    volumeSlider: document.getElementById('volumeSlider'),
    progress: document.getElementById('progress'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    albumArt: document.getElementById('albumArt'),
    trackTitle: document.getElementById('trackTitle'),
    trackArtist: document.getElementById('trackArtist'),
    viewXRBtn: document.getElementById('viewXRBtn'),
    exitXRBtn: document.getElementById('exitXRBtn'),
    audioContent: document.getElementById('audioContent'),
    xrContent: document.getElementById('xrContent'),
    sceneContainer: document.getElementById('sceneContainer'),
    playlistContainer: document.getElementById('playlistContainer'),
    playlistTracks: document.getElementById('playlistTracks'),
    playlistClose: document.getElementById('playlistClose'),
    permissionOverlay: document.getElementById('permissionOverlay'),
    enableMotionBtn: document.getElementById('enableMotionBtn'),
    videoFrame: document.getElementById('videoFrame')
};

// Initialize the player
function initializePlayer() {
    setupEventListeners();
    populatePlaylist();
    setupAudioElement();
    checkDeviceOrientation();
}

// Setup event listeners
function setupEventListeners() {
    // Play/Pause
    elements.playPauseBtn.addEventListener('click', togglePlayPause);

    // Volume control
    elements.muteBtn.addEventListener('click', toggleMute);
    elements.volumeSlider.addEventListener('input', handleVolumeChange);

    // Progress bar
    elements.audioElement.addEventListener('timeupdate', updateProgress);
    elements.progress.parentElement.addEventListener('click', seekTo);

    // XR mode
    elements.viewXRBtn.addEventListener('click', enterXRMode);
    elements.exitXRBtn.addEventListener('click', exitXRMode);

    // Playlist
    elements.playlistClose.addEventListener('click', togglePlaylist);

    // Device orientation
    elements.enableMotionBtn.addEventListener('click', requestDeviceOrientation);

    // Video frame
    elements.videoFrame.addEventListener('load', () => {
        // When iframe loads, sync with audio
        const video = elements.videoFrame.contentDocument.querySelector('video');
        if (video) {
            video.currentTime = elements.audioElement.currentTime;
            if (!elements.audioElement.paused) {
                video.play();
            }
        }
    });
}

// Audio element setup
function setupAudioElement() {
    elements.audioElement.addEventListener('ended', () => {
        state.isPlaying = false;
        updatePlayPauseButton();
    });

    elements.audioElement.addEventListener('loadedmetadata', () => {
        elements.duration.textContent = formatTime(elements.audioElement.duration);
    });
}

// Play/Pause functionality
function togglePlayPause() {
    const xrContent = document.getElementById('xrContent');
    const videoFrame = document.getElementById('videoFrame');
    const iframeDoc = videoFrame.contentDocument || videoFrame.contentWindow.document;
    const video = iframeDoc.getElementById('xrVideo');
    
    if (xrContent.style.display === 'block' && video) {
        // In XR mode
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    } else {
        // In audio mode
        if (elements.audioElement.paused) {
            elements.audioElement.play().then(() => {
                if (state.videoElement) {
                    state.videoElement.play().catch(error => {
                        console.error('Error playing video:', error);
                    });
                }
            }).catch(error => {
                console.error('Error playing audio:', error);
            });
        } else {
            elements.audioElement.pause();
            if (state.videoElement) {
                state.videoElement.pause();
            }
        }
    }
    state.isPlaying = !state.isPlaying;
    updatePlayPauseButton();
}

// Volume control
function toggleMute() {
    state.isMuted = !state.isMuted;
    elements.audioElement.muted = state.isMuted;
    if (state.videoElement) {
        state.videoElement.muted = state.isMuted;
    }
    elements.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
}

function handleVolumeChange(e) {
    const volume = e.target.value;
    elements.audioElement.volume = volume;
    if (state.videoElement) {
        state.videoElement.volume = volume;
    }
    state.volume = volume;
    elements.muteBtn.textContent = volume > 0 ? '🔊' : '🔇';
}

function seekTo(e) {
    const xrContent = document.getElementById('xrContent');
    const videoFrame = document.getElementById('videoFrame');
    const iframeDoc = videoFrame.contentDocument || videoFrame.contentWindow.document;
    const video = iframeDoc.getElementById('xrVideo');
    
    const progressBar = e.currentTarget;
    const clickPosition = e.offsetX / progressBar.offsetWidth;
    
    if (xrContent.style.display === 'block' && video) {
        const time = clickPosition * video.duration;
        video.currentTime = time;
    } else {
        const time = clickPosition * elements.audioElement.duration;
        elements.audioElement.currentTime = time;
    }
}

// XR mode
function enterXRMode() {
    const currentTrack = playlist.tracks[state.currentTrack];
    if (currentTrack.IsAR && currentTrack.XR_Scene) {
        state.isXRMode = true;
        elements.audioContent.style.display = 'none';
        elements.xrContent.style.display = 'block';
        elements.viewXRBtn.style.display = 'none';
        elements.exitXRBtn.style.display = 'block';
        
        // Small delay to ensure DOM updates are complete
        setTimeout(() => {
            setupXRScene(currentTrack.XR_Scene);
        }, 100);
    }
}

function exitXRMode() {
    state.isXRMode = false;
    elements.audioContent.style.display = 'flex';
    elements.xrContent.style.display = 'none';
    elements.viewXRBtn.style.display = 'block';
    elements.exitXRBtn.style.display = 'none';
    cleanupXRScene();
    
    // Pause video but keep it for future use
    if (state.videoElement) {
        state.videoElement.pause();
    }
}

// XR Scene setup
function setupXRScene(sceneUrl) {
    // Clean up any existing scene
    cleanupXRScene();

    // Create new scene with proper sizing
    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute('renderer', 'logarithmicDepthBuffer: true');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
    
    // Create sky and camera
    const sky = document.createElement('a-sky');
    sky.setAttribute('src', sceneUrl);
    sky.setAttribute('rotation', '0 -130 0');
    
    const camera = document.createElement('a-camera');
    camera.setAttribute('position', '0 1.6 0');
    camera.setAttribute('look-controls', '');
    
    // Append elements to scene
    scene.appendChild(sky);
    scene.appendChild(camera);
    
    // Append scene to container
    elements.sceneContainer.appendChild(scene);

    // Create single video element for sync
    if (!state.videoElement) {
        state.videoElement = document.createElement('video');
        state.videoElement.style.display = 'none';
        document.body.appendChild(state.videoElement);
    }
    
    state.videoElement.src = sceneUrl;
    
    // Set up video event listeners
    state.videoElement.addEventListener('loadedmetadata', () => {
        elements.duration.textContent = formatTime(state.videoElement.duration);
        // Sync video with audio if audio is already playing
        if (state.isPlaying) {
            syncVideoWithAudio();
        }
    });
    
    state.videoElement.addEventListener('timeupdate', () => {
        if (state.isVideoSynced) {
            updateProgress();
        }
    });

    // Ensure video is ready to play
    state.videoElement.load();

    // Force A-Frame to resize and initialize
    setTimeout(() => {
        if (scene.hasLoaded) {
            scene.resize();
            scene.forceResize();
        } else {
            scene.addEventListener('loaded', () => {
                scene.resize();
                scene.forceResize();
            });
        }
    }, 100);
}

function cleanupXRScene() {
    elements.sceneContainer.innerHTML = '';
}

function syncVideoWithAudio() {
    if (state.videoElement && elements.audioElement) {
        state.videoElement.currentTime = elements.audioElement.currentTime;
        if (state.isPlaying) {
            state.videoElement.play().catch(error => {
                console.error('Error playing video:', error);
            });
        }
        state.isVideoSynced = true;
    }
}

function updateProgress() {
    const element = state.isXRMode ? state.videoElement : elements.audioElement;
    if (element) {
        const progress = (element.currentTime / element.duration) * 100;
        elements.progress.style.width = `${progress}%`;
        elements.currentTime.textContent = formatTime(element.currentTime);
    }
}

function updatePlayPauseButton() {
    elements.playPauseBtn.innerHTML = state.isPlaying ? '⏸' : '▶';
}

// Playlist management
function populatePlaylist() {
    elements.playlistTracks.innerHTML = playlist.tracks.map((track, index) => `
        <div class="playlist-track" data-index="${index}">
            <div>${track.title}</div>
            <div>${track.duration}</div>
        </div>
    `).join('');

    elements.playlistTracks.addEventListener('click', (e) => {
        const trackElement = e.target.closest('.playlist-track');
        if (trackElement) {
            const index = parseInt(trackElement.dataset.index);
            loadTrack(index);
        }
    });
}

function loadTrack(index) {
    const track = playlist.tracks[index];
    state.currentTrack = index;
    state.isPlaying = false;

    elements.audioElement.src = track.audio_url;
    elements.albumArt.src = track.artwork_url;
    elements.trackTitle.textContent = track.title;
    elements.trackArtist.textContent = `Chapter ${track.chapter}`;
    elements.duration.textContent = track.duration;

    // Update XR button visibility
    elements.viewXRBtn.style.display = track.IsAR && track.XR_Scene ? 'block' : 'none';
    elements.exitXRBtn.style.display = 'none';

    // Reset XR mode if switching tracks
    if (state.isXRMode) {
        exitXRMode();
    }

    updatePlayPauseButton();
    togglePlaylist();
}

function togglePlaylist() {
    elements.playlistContainer.classList.toggle('open');
}

// Device orientation
function checkDeviceOrientation() {
    if (typeof DeviceOrientationEvent !== 'undefined') {
        elements.permissionOverlay.style.display = 'flex';
    } else {
        elements.permissionOverlay.style.display = 'none';
    }
}

function requestDeviceOrientation() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    elements.permissionOverlay.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error requesting device orientation permission:', error);
                elements.permissionOverlay.style.display = 'none';
            });
    } else {
        elements.permissionOverlay.style.display = 'none';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePlayer);