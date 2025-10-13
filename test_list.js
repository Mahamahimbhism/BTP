document.addEventListener('DOMContentLoaded', function () {
    // Check for existing user session
    const currentUser = sessionStorage.getItem('currentUser');

    if (currentUser) {
        window.location.href = 'finger_tapping/finger_tapping.html';
        return;
    }

    // Initialize users array
    let users = JSON.parse(localStorage.getItem('users')) || [];

    // Update range value displays
    const updateRangeValue = (sliderId, valueId) => {
        const slider = document.getElementById(sliderId);
        const value = document.getElementById(valueId);
        if (slider && value) {
            slider.addEventListener('input', function () {
                value.textContent = this.value;
            });
        }
    };

    updateRangeValue('sleepiness', 'sleepinessValue');
    updateRangeValue('feeling', 'feelingValue');
    updateRangeValue('mood', 'moodValue');

    // Handle form submission
    const userInfoForm = document.getElementById('userInfoForm');
    if (userInfoForm) {
        userInfoForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            try {
                // Request camera access before starting tests
                const videoRecorder = new VideoRecorder();
                const cameraAccess = await videoRecorder.setupCamera();

                if (!cameraAccess) {
                    if (!confirm('Camera access was denied. Continue without video recording?')) {
                        return;
                    }
                } else {
                    // Store camera permission state
                    sessionStorage.setItem('cameraPermissionGranted', 'true');

                    // Start recording if camera access was granted
                    const started = videoRecorder.startRecording();
                    if (started) {
                        sessionStorage.setItem('recordingStarted', 'true');
                    }
                }
            } catch (error) {
                console.error('Error with camera setup:', error);
                if (!confirm('Error with camera setup. Continue without recording?')) {
                    return;
                }
            }

            // Get form values
            const formData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                age: parseInt(document.getElementById('userAge').value),
                sex: document.querySelector('input[name="sex"]:checked')?.value,
                consent: document.getElementById('consent').checked,
                sleepiness: parseInt(document.getElementById('sleepiness').value),
                feeling: parseInt(document.getElementById('feeling').value),
                mood: parseInt(document.getElementById('mood').value)
            };

            // Validate form
            if (!formData.name || !formData.email || isNaN(formData.age) || !formData.sex || !formData.consent) {
                showError('Please fill all required fields');
                return;
            }

            if (formData.age < 18) {
                showError('You must be at least 18 years old to participate');
                return;
            }

            // Create user object
            const user = {
                id: Date.now().toString(),
                ...formData,
                stateAssessment: {
                    sleepiness: formData.sleepiness,
                    feeling: formData.feeling,
                    mood: formData.mood,
                    timestamp: new Date().toISOString()
                },
                results: {
                    fingerTapping: null,
                    goNoGo: null,
                    pvt: null,
                    trailMaking: null
                },
                testStartTime: new Date().toISOString(),
                completedTests: []
            };

            // Save to storage
            users.push(user);
            localStorage.setItem('users', JSON.stringify(users));
            sessionStorage.setItem('currentUser', JSON.stringify(user));

            // Redirect to first test
            window.location.href = 'finger_tapping/finger_tapping.html';
        });
    }

    // Error handling
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #dc3545;
            margin: 15px 0;
            padding: 12px;
            background-color: #f8d7da;
            border-radius: 6px;
            border: 1px solid #f5c6cb;
            text-align: center;
            font-weight: 500;
        `;

        const form = document.getElementById('userInfoForm');
        if (form) {
            const submitButton = form.querySelector('button[type="submit"]');
            form.insertBefore(errorElement, submitButton);

            setTimeout(() => {
                errorElement.style.opacity = '0';
                setTimeout(() => errorElement.remove(), 300);
            }, 5000);
        }
    }
});