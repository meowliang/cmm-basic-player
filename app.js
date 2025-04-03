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
    
    // Add message listener for iframe communication
    window.addEventListener('message', handleIframeMessages);
}

function handleIframeMessages(event) {
    console.log('Parent received:', event.data);
    if (event.data.type === 'videoReady') {
        postMessageToIframe({
            action: 'setTime',
            time: elements.audioElement.currentTime
        });
        if (state.isPlaying) {
            postMessageToIframe({ 
                action: 'play',
                time: elements.audioElement.currentTime
            });
        }
    } else if (event.data.type === 'currentTime') {
        // This handles the exitXRMode response
        completeExitXRMode(event.data.time);
    }
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

//XR Mode functions

function enterXRMode() {
    const currentTrack = playlist.tracks[state.currentTrack];
    if (currentTrack.IsAR && currentTrack.XR_Scene) {
        // Store current playback state
        const wasPlaying = !elements.audioElement.paused;
        
        // Switch to XR mode
        state.isXRMode = true;
        elements.audioContent.style.display = 'none';
        elements.xrContent.style.display = 'block';
        elements.viewXRBtn.style.display = 'none';
        elements.exitXRBtn.style.display = 'block';
        
        // Setup XR scene with current time
        setupXRScene(currentTrack.XR_Scene);
        
        // If audio was playing, start video at same position
        if (wasPlaying) {
            setTimeout(() => {
                postMessageToIframe({
                    action: 'play',
                    time: elements.audioElement.currentTime
                });
            }, 300); // Small delay to ensure iframe is ready
        }
    }
}

function exitXRMode() {
    console.log('Attempting to exit XR mode');
    postMessageToIframe({ action: 'getCurrentTime' });
}

function completeExitXRMode(videoTime) {
    console.log('Completing exit with time:', videoTime);
    state.isXRMode = false;
    elements.audioContent.style.display = 'flex';
    elements.xrContent.style.display = 'none';
    elements.viewXRBtn.style.display = 'block';
    elements.exitXRBtn.style.display = 'none';
    
    elements.audioElement.currentTime = videoTime;
    if (state.isPlaying) {
        elements.audioElement.play().catch(console.error);
    }
}


function setupXRScene(videoUrl) {
    const iframe = elements.videoFrame;
    
    const aframeHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>360 Video</title>
            <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
            <style>body { margin: 0; overflow: hidden; }</style>
        </head>
        <body>
            <a-scene>
                <a-assets>
                    <video id="xrVideo" muted crossorigin="anonymous">
                        <source src="${videoUrl}" type="video/mp4">
                    </video>
                </a-assets>
                
                <a-videosphere src="#xrVideo" rotation="0 -130 0"></a-videosphere>
                <a-camera position="0 1.6 0" look-controls></a-camera>
                
                <script>
                    const video = document.getElementById('xrVideo');
                    video.muted = true;
                    
                    // Handle parent messages
                    window.addEventListener('message', (event) => {
                        console.log('iframe received:', event.data);
                        switch(event.data.action) {
                            case 'play':
                                video.currentTime = event.data.time || ${elements.audioElement.currentTime};
                                video.play().catch(e => console.log(e));
                                break;
                            case 'pause':
                                video.pause();
                                break;
                            case 'setTime':
                                video.currentTime = event.data.time;
                                break;
                            case 'getCurrentTime':
                                window.parent.postMessage({
                                    type: 'currentTime',
                                    time: video.currentTime
                                }, '*');
                                break;
                        }
                    });
                    
                    // Notify parent when ready
                    video.addEventListener('canplay', () => {
                        window.parent.postMessage({ type: 'videoReady' }, '*');
                    });
                </script>
            </a-scene>
        </body>
        </html>
    `;
    
    iframe.srcdoc = aframeHTML;
}

function postMessageToIframe(message) {
    console.log('Posting to iframe:', message);
    const iframe = elements.videoFrame;
    if (iframe.contentWindow) {
        try {
            iframe.contentWindow.postMessage(message, '*');
        } catch (e) {
            console.error('PostMessage error:', e);
        }
    } else {
        console.warn('Iframe contentWindow not available yet');
        // Retry after short delay if needed
        setTimeout(() => postMessageToIframe(message), 100);
    }
}

// Unified play/pause control
function togglePlayPause() {
    state.isPlaying = !state.isPlaying;
    updatePlayPauseButton();
    
    if (state.isPlaying) {
        elements.audioElement.play().catch(console.error);
        if (state.isXRMode) {
            postMessageToIframe({
                action: 'play',
                time: elements.audioElement.currentTime
            });
        }
    } else {
        elements.audioElement.pause();
        if (state.isXRMode) {
            postMessageToIframe({ action: 'pause' });
        }
    }
}

// Update seekTo function to handle iframe
function seekTo(e) {
    const progressBar = e.currentTarget;
    const clickPosition = e.offsetX / progressBar.offsetWidth;
    const newTime = clickPosition * elements.audioElement.duration;
    
    elements.audioElement.currentTime = newTime;
    
    if (state.isXRMode) {
        postMessageToIframe({
            action: 'setTime',
            time: newTime
        });
    }
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

// Update progress bar
function updateProgress() {
    const currentTime = elements.audioElement.currentTime;
    const duration = elements.audioElement.duration || playlist.tracks[state.currentTrack].duration;
    
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        elements.progress.style.width = `${progressPercent}%`;
        elements.currentTime.textContent = formatTime(currentTime);
    }
    
    // Sync video time if in XR mode
    if (state.isXRMode) {
        postMessageToIframe({
            action: 'setTime',
            time: currentTime
        });
    }
}

// Helper to get video time (will be async in real implementation)
function getVideoCurrentTime() {
    // In real implementation, this would use postMessage
    return elements.audioElement.currentTime; // Fallback
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

        // Preload video metadata if XR is available
        if (track.IsAR && track.XR_Scene) {
            const video = document.createElement('video');
            video.src = track.XR_Scene;
            video.load();
        }
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