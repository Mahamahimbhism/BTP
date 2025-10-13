// Simple video recording utility class
class VideoRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
    }

    // Start camera and recording immediately
    async startCamera() {
        try {
            // Get camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            // Create small preview
            const videoPreview = document.createElement('video');
            videoPreview.id = 'camera-preview';
            videoPreview.srcObject = this.stream;
            videoPreview.autoplay = true;
            videoPreview.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 160px;
                height: 90px;
                border-radius: 8px;
                border: 2px solid #3498db;
                background-color: #000;
            `;
            document.body.appendChild(videoPreview);

            // Start recording immediately
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            // Request data chunks every 1 second to avoid memory issues
            this.mediaRecorder.start(1000);
            return true;
        } catch (error) {
            console.error('Error starting camera:', error);
            return false;
        }
    }

    // Stop everything and save the recording
    async stopAndSave(filename) {
        if (!this.mediaRecorder) return;

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                // Create video file from recorded chunks
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Clean up
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                const preview = document.getElementById('camera-preview');
                if (preview) {
                    preview.remove();
                }

                resolve();
            };

            this.mediaRecorder.stop();
        });
    }
}


// Export for use in other files
window.VideoRecorder = VideoRecorder;