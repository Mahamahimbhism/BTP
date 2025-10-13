// Base functionality for all test pages
document.addEventListener('DOMContentLoaded', async function() {
    // Check if we have camera permission and recording was started
    if (sessionStorage.getItem('cameraPermissionGranted') === 'true' && 
        sessionStorage.getItem('recordingStarted') === 'true') {
        
        // Initialize video recorder with existing permission
        const videoRecorder = new VideoRecorder();
        await videoRecorder.setupCamera(true);
    }
});