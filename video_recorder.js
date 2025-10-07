// Video recording utility class
class VideoRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
    }

    // Request camera permission and start preview
    async setupCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            // Create video preview element
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

            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            return false;
        }
    }

    // Start recording
    startRecording() {
        if (!this.stream) return false;

        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        return true;
    }

    // Stop recording and save video
    async stopRecording(filename) {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                reject('No active recording');
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.saveVideo(blob, filename);
                this.isRecording = false;
                resolve();
            };

            this.mediaRecorder.stop();
        });
    }

    // Save video file
    saveVideo(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Stop camera and cleanup
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        const videoPreview = document.getElementById('camera-preview');
        if (videoPreview) {
            videoPreview.remove();
        }
    }
}

// Export for use in other files
window.VideoRecorder = VideoRecorder;