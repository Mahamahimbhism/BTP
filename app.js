// Main application controller
class App {
    constructor() {
        this.currentScreen = 'welcomeScreen';
        this.videoRecorder = null;
        this.testSequence = [
            'fingerTappingScreen',
            'goNoGoScreen',
            'pvtScreen',
            'trailMakingScreen'
        ];
        this.completedTests = [];
        this.currentTest = null;

        // Initialize video recorder
        this.videoRecorder = new VideoRecorder();

        // Bind event listeners
        this.bindEvents();

        // Show welcome screen
        this.showScreen('welcomeScreen');
    }

    bindEvents() {
        // Welcome screen buttons
        document.getElementById('readMoreBtn').addEventListener('click', () => {
            // Scroll to about section (we'll add this later if needed)
        });

        document.getElementById('beginTestBtn').addEventListener('click', () => {
            this.showScreen('registrationScreen');
        });

        // Registration form
        document.getElementById('userInfoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegistration(e);
        });

        // Completion screen buttons
        document.getElementById('viewResults').addEventListener('click', () => {
            this.toggleResults();
        });

        document.getElementById('startNewSession').addEventListener('click', () => {
            this.resetAndStartNew();
        });

        // Setup range value displays
        ['sleepiness', 'feeling', 'mood'].forEach(id => {
            const slider = document.getElementById(id);
            const value = document.getElementById(`${id}Value`);
            if (slider && value) {
                slider.addEventListener('input', () => {
                    value.textContent = slider.value;
                });
            }
        });
    }

    async handleRegistration(e) {
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
        if (!this.validateForm(formData)) {
            return;
        }

        // Start video recording
        try {
            const started = await this.videoRecorder.startCamera();
            if (!started && !confirm('Camera access was denied. Continue without video recording?')) {
                return;
            }
        } catch (error) {
            console.error('Error starting camera:', error);
            if (!confirm('Could not start video recording. Continue without it?')) {
                return;
            }
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

        // Save user data
        localStorage.setItem('users', JSON.stringify([...JSON.parse(localStorage.getItem('users') || '[]'), user]));
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        // Start first test
        this.startNextTest();
    }

    validateForm(formData) {
        if (!formData.name || !formData.email || isNaN(formData.age) || !formData.sex || !formData.consent) {
            this.showError('Please fill all required fields');
            return false;
        }

        if (formData.age < 18) {
            this.showError('You must be at least 18 years old to participate');
            return false;
        }

        return true;
    }

    showError(message) {
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
        const submitButton = form.querySelector('button[type="submit"]');
        form.insertBefore(errorElement, submitButton);

        setTimeout(() => {
            errorElement.style.opacity = '0';
            setTimeout(() => errorElement.remove(), 300);
        }, 5000);
    }

    async showScreen(screenId) {
        const currentScreen = document.querySelector('.screen.active');
        const nextScreen = document.getElementById(screenId);
        
        if (currentScreen) {
            currentScreen.classList.add('fade-out');
            currentScreen.classList.remove('active');
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for fade out
        }

        // Update progress bar
        if (this.testSequence.includes(screenId)) {
            const progress = (this.completedTests.length / this.testSequence.length) * 100;
            document.getElementById('progressFill').style.width = `${progress}%`;
        }

        // Reset next screen initial state
        nextScreen.classList.remove('fade-out');
        nextScreen.style.display = 'block';
        
        // Force a reflow to ensure transition works
        nextScreen.offsetHeight;
        
        nextScreen.classList.add('active');
        this.currentScreen = screenId;
    }

    getTestName(testId) {
        const names = {
            'fingerTappingScreen': 'Finger Tapping Test',
            'goNoGoScreen': 'Go/No-Go Test',
            'pvtScreen': 'Psychomotor Vigilance Test',
            'trailMakingScreen': 'Trail Making Test'
        };
        return names[testId] || testId;
    }

    getTestDescription(testId) {
        const descriptions = {
            'fingerTappingScreen': 'Measure your tapping speed and consistency.',
            'goNoGoScreen': 'Test your response control and inhibition.',
            'pvtScreen': 'Measure your reaction time and alertness.',
            'trailMakingScreen': 'Test your visual attention and task switching.'
        };
        return descriptions[testId] || '';
    }

    async showTransition(nextTest) {
        const overlay = document.getElementById('loadingOverlay');
        const announcement = document.getElementById('testAnnouncement');
        const title = document.getElementById('announcementTitle');
        const message = document.getElementById('announcementMessage');

        // Show next test announcement
        title.textContent = `Next Test: ${this.getTestName(nextTest)}`;
        message.textContent = this.getTestDescription(nextTest);
        announcement.classList.add('visible');

        // Wait for 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Hide announcement and show loading
        announcement.classList.remove('visible');
        overlay.classList.add('visible');
        
        // Wait for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Hide loading overlay
        overlay.classList.remove('visible');
    }

    async startNextTest() {
        // Find next test
        const nextTest = this.testSequence.find(test => !this.completedTests.includes(test));

        if (nextTest) {
            this.currentTest = nextTest;
            
            // Show transition UI
            await this.showTransition(nextTest);
            
            // Show and initialize the test
            await this.showScreen(nextTest);
            this.initializeTest(nextTest);
        } else {
            this.completeAllTests();
        }
    }

    async completeAllTests() {
        // Stop video recording if it was started
        if (this.videoRecorder) {
            try {
                await this.videoRecorder.stopAndSave(`cognitive_test_session_${new Date().toISOString().split('T')[0]}`);
            } catch (error) {
                console.error('Error stopping video recording:', error);
            }
        }

        // Generate final JSON file
        if (window.GameDataCollector) {
            setTimeout(() => {
                GameDataCollector.generateSessionJSON();
            }, 1000);
        }

        // Show completion screen
        this.showScreen('completionScreen');
    }

    initializeTest(testId) {
        switch (testId) {
            case 'fingerTappingScreen':
                this.initializeFingerTapping();
                break;
            case 'goNoGoScreen':
                this.initializeGoNoGo();
                break;
            case 'pvtScreen':
                this.initializePVT();
                break;
            case 'trailMakingScreen':
                this.initializeTrailMaking();
                break;
        }
    }

    completeTest(testId, results) {
        this.completedTests.push(testId);

        // Save results
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (currentUser) {
            const testName = testId.replace('Screen', '');
            currentUser.results[testName] = results;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        // Move to next test
        this.startNextTest();
    }

    toggleResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        const viewResultsBtn = document.getElementById('viewResults');

        if (resultsContainer.style.display === 'none') {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            if (currentUser) {
                const tbody = document.querySelector('.results-table tbody');
                tbody.innerHTML = `
                    <tr>
                        <td>Finger Tapping</td>
                        <td>${this.formatResults(currentUser.results.fingerTapping)}</td>
                    </tr>
                    <tr>
                        <td>Go/No-Go</td>
                        <td>${this.formatResults(currentUser.results.goNoGo)}</td>
                    </tr>
                    <tr>
                        <td>PVT</td>
                        <td>${this.formatResults(currentUser.results.pvt)}</td>
                    </tr>
                    <tr>
                        <td>Trail Making</td>
                        <td>${this.formatResults(currentUser.results.trailMaking)}</td>
                    </tr>
                `;
            }
            resultsContainer.style.display = 'block';
            viewResultsBtn.textContent = 'Hide Results';
        } else {
            resultsContainer.style.display = 'none';
            viewResultsBtn.textContent = 'View My Results';
        }
    }

    formatResults(result) {
        return result || 'Not completed';
    }

    resetAndStartNew() {
        sessionStorage.removeItem('currentUser');
        this.completedTests = [];
        this.currentTest = null;
        this.showScreen('welcomeScreen');
    }

    // Test initialization methods (we'll implement these when converting the tests)
    initializeFingerTapping() {
        let tapCount = 0;
        let testDuration = 30;
        let timeLeft = testDuration;
        let timerInterval;
        let isTestRunning = false;
        let isPracticeRound = false;
        let practiceDuration = 5;
        let dataCollector = null;

        const elements = {
            tapButton: document.getElementById('tapButton'),
            tapCount: document.getElementById('tapCount'),
            timeLeft: document.getElementById('timeLeft'),
            testScreen: document.getElementById('testScreen'),
            practiceMessage: document.getElementById('practiceMessage'),
            result: document.getElementById('result')
        };

        const handleKeyPress = (e) => {
            if (e.code === 'Space' && isTestRunning) {
                e.preventDefault();
                tapCount++;
                elements.tapCount.textContent = tapCount;

                // Record tap data if not in practice round
                if (!isPracticeRound && dataCollector) {
                    dataCollector.addDataPoint('tap', {
                        tapNumber: tapCount,
                        timeLeft: timeLeft
                    });
                }
            }
        };

        const startTimer = () => {
            clearInterval(timerInterval);
            elements.timeLeft.textContent = timeLeft;

            timerInterval = setInterval(() => {
                timeLeft--;
                elements.timeLeft.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    if (isPracticeRound) {
                        setTimeout(startMainTest, 1000);
                    } else {
                        endTest();
                    }
                }
            }, 1000);
        };

        const startPracticeRound = () => {
            isPracticeRound = true;
            tapCount = 0;
            timeLeft = practiceDuration;
            isTestRunning = true;

            elements.tapCount.textContent = tapCount;
            elements.timeLeft.textContent = timeLeft;
            elements.practiceMessage.textContent = "Practice Round - Tap the SPACE BAR quickly!";
            elements.testScreen.style.display = 'block';
            elements.tapButton.style.display = 'none';

            startTimer();
        };

        const startMainTest = () => {
            isPracticeRound = false;
            tapCount = 0;
            timeLeft = testDuration;
            isTestRunning = true;

            // Initialize data collector for the main test
            dataCollector = new GameDataCollector('finger_tapping');

            elements.tapCount.textContent = tapCount;
            elements.timeLeft.textContent = timeLeft;
            elements.practiceMessage.textContent = "Real Test - Tap as fast as you can!";

            startTimer();
        };

        const endTest = () => {
            isTestRunning = false;
            elements.result.textContent = `Test Over! You tapped ${tapCount} times in ${testDuration} seconds.`;
            
            // Save final data
            if (dataCollector) {
                const finalStats = {
                    totalTaps: tapCount,
                    averageTapsPerSecond: (tapCount / testDuration).toFixed(2),
                    testDuration: testDuration
                };
                dataCollector.saveData(finalStats);
            }

            // Clean up event listener
            document.removeEventListener('keydown', handleKeyPress);

            // Mark test as completed and move to next
            this.completeTest('fingerTappingScreen', {
                totalTaps: tapCount,
                averageTapsPerSecond: (tapCount / testDuration).toFixed(2)
            });
        };

        // Set up initial state
        elements.tapButton.textContent = "Start Test";
        elements.tapButton.disabled = false;
        elements.testScreen.style.display = 'none';
        elements.result.textContent = '';

        // Add event listeners
        elements.tapButton.addEventListener('click', startPracticeRound);
        document.addEventListener('keydown', handleKeyPress);
    }

    initializeGoNoGo() {
        let score = 0;
        let correctResponses = 0;
        let wrongResponses = 0;
        let totalTrials = 0;
        const shapes = ['orange', 'blue'];
        let interval;
        let testDuration = 30;
        let timeLeft = testDuration;
        let timerInterval;
        let isTestRunning = false;
        let isPracticeRound = false;
        let currentRound = 1;
        const totalRounds = 2;
        let roundResults = [];
        let stimulusTimeout;
        let fixationTimeout;
        let stimulusStartTime = 0;
        let reactionTimes = [];
        let currentRoundReactionTimes = [];
        let dataCollector = null;

        const elements = {
            goNoGoWelcome: document.getElementById('goNoGoWelcome'),
            goNoGoTest: document.getElementById('goNoGoTest'),
            shapeDisplay: document.getElementById('shapeDisplay'),
            currentRound: document.getElementById('currentRound'),
            timeLeft: document.getElementById('goNoGoTimeLeft'),
            message: document.getElementById('message'),
            resultsScreen: document.getElementById('resultsScreen'),
            resultsBody: document.getElementById('resultsBody'),
            goNoGoButton: document.getElementById('goNoGoButton')
        };

        const startTimer = () => {
            clearInterval(timerInterval);
            elements.timeLeft.textContent = timeLeft;

            timerInterval = setInterval(() => {
                timeLeft--;
                elements.timeLeft.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    clearTimeout(stimulusTimeout);
                    clearTimeout(fixationTimeout);
                    endRound();
                }
            }, 1000);
        };

        const showNextStimulus = () => {
            clearTimeout(stimulusTimeout);
            clearTimeout(fixationTimeout);

            elements.shapeDisplay.textContent = "+";
            elements.shapeDisplay.style.backgroundColor = "transparent";

            fixationTimeout = setTimeout(() => {
                const randomShape = shapes[Math.random() < 0.7 ? 0 : 1]; // 70% orange, 30% blue
                elements.shapeDisplay.textContent = "";
                elements.shapeDisplay.style.backgroundColor = randomShape === 'orange' ? '#ff9800' : '#2196f3';
                elements.shapeDisplay.className = `shape-display ${randomShape}-square`;

                stimulusStartTime = Date.now();
                totalTrials++;

                if (!isPracticeRound && dataCollector) {
                    dataCollector.addDataPoint('stimulus_shown', {
                        stimulusType: randomShape,
                        trialNumber: totalTrials
                    });
                }

                stimulusTimeout = setTimeout(() => {
                    elements.shapeDisplay.textContent = "+";
                    elements.shapeDisplay.style.backgroundColor = "transparent";

                    if (!isPracticeRound && dataCollector) {
                        dataCollector.addDataPoint('stimulus_hidden', {
                            trialNumber: totalTrials,
                            responseReceived: false
                        });
                    }

                    if (isTestRunning) {
                        const nextDelay = Math.random() * 1000 + 500;
                        setTimeout(showNextStimulus, nextDelay);
                    }
                }, 1000);
            }, Math.random() * 500 + 500);
        };

        const handleKeyPress = (e) => {
            if (e.code === 'Space' && isTestRunning) {
                e.preventDefault();
                const reactionTime = Date.now() - stimulusStartTime;

                if (!isPracticeRound && dataCollector) {
                    const responseType = elements.shapeDisplay.classList.contains('orange-square') ? 'correct_response' :
                        elements.shapeDisplay.classList.contains('blue-square') ? 'wrong_response' : 'early_response';

                    dataCollector.addDataPoint('response', {
                        responseType: responseType,
                        reactionTime: reactionTime,
                        trialNumber: totalTrials,
                        timeLeft: timeLeft
                    });
                }

                if (elements.shapeDisplay.classList.contains('orange-square')) {
                    correctResponses++;
                    score++;
                    reactionTimes.push(reactionTime);
                    currentRoundReactionTimes.push(reactionTime);
                    if (isPracticeRound) {
                        elements.message.textContent = `Correct! (${reactionTime}ms)`;
                        elements.message.style.color = "#27ae60";
                    }
                } else if (elements.shapeDisplay.classList.contains('blue-square')) {
                    wrongResponses++;
                    if (isPracticeRound) {
                        elements.message.textContent = "Wrong! Shouldn't press for blue";
                        elements.message.style.color = "#e74c3c";
                    }
                } else {
                    wrongResponses++;
                    if (isPracticeRound) {
                        elements.message.textContent = "Too early! Wait for the square";
                        elements.message.style.color = "#e74c3c";
                    }
                }

                elements.shapeDisplay.textContent = "+";
                elements.shapeDisplay.style.backgroundColor = "transparent";
                elements.shapeDisplay.className = "shape-display";

                if (!isPracticeRound) {
                    setTimeout(() => {
                        elements.message.textContent = "";
                    }, 300);
                }
            }
        };

        const startPracticeRound = () => {
            elements.goNoGoWelcome.style.display = 'none';
            elements.goNoGoTest.style.display = 'block';
            
            isPracticeRound = true;
            score = 0;
            correctResponses = 0;
            wrongResponses = 0;
            totalTrials = 0;
            timeLeft = 10; // Shorter practice round
            isTestRunning = true;

            elements.message.textContent = "Practice Round - Get ready!";
            elements.currentRound.textContent = "Practice";

            startTimer();
            showNextStimulus();
        };

        const startMainTest = (round) => {
            isPracticeRound = false;
            score = 0;
            correctResponses = 0;
            wrongResponses = 0;
            totalTrials = 0;
            timeLeft = testDuration;
            isTestRunning = true;
            currentRound = round;

            dataCollector = new GameDataCollector(`go_no_go_round_${round}`);

            elements.currentRound.textContent = `${currentRound}/${totalRounds}`;
            elements.message.textContent = `Round ${currentRound} - Be ready!`;

            startTimer();
            showNextStimulus();
        };

        const endRound = () => {
            isTestRunning = false;
            clearInterval(timerInterval);
            clearTimeout(stimulusTimeout);
            clearTimeout(fixationTimeout);

            const avgReactionTime = currentRoundReactionTimes.length > 0
                ? Math.round(currentRoundReactionTimes.reduce((a, b) => a + b, 0) / currentRoundReactionTimes.length)
                : 0;

            const roundData = {
                round: currentRound,
                total: totalTrials,
                correct: correctResponses,
                wrong: wrongResponses,
                avgReactionTime: avgReactionTime
            };

            roundResults.push(roundData);

            if (dataCollector) {
                dataCollector.saveData({
                    roundSummary: roundData,
                    reactionTimes: currentRoundReactionTimes,
                    accuracy: (correctResponses / totalTrials * 100).toFixed(2)
                });
            }

            currentRoundReactionTimes = [];

            if (isPracticeRound) {
                setTimeout(() => {
                    startMainTest(1);
                }, 2000);
            } else if (currentRound < totalRounds) {
                currentRound++;
                setTimeout(() => {
                    startMainTest(currentRound);
                }, 2000);
            } else {
                showFinalResults();
            }
        };

        const showFinalResults = () => {
            elements.resultsBody.innerHTML = '';

            let totalCorrect = 0;
            let totalWrong = 0;
            let totalMoves = 0;
            let totalReactionTime = 0;
            let roundsWithReactionTimes = 0;

            roundResults.forEach(result => {
                totalCorrect += result.correct;
                totalWrong += result.wrong;
                totalMoves += result.total;

                if (result.avgReactionTime > 0) {
                    totalReactionTime += result.avgReactionTime;
                    roundsWithReactionTimes++;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${result.round}</td>
                    <td>${result.total}</td>
                    <td>${result.correct}</td>
                    <td>${result.wrong}</td>
                    <td>${result.avgReactionTime > 0 ? result.avgReactionTime : '-'}</td>
                `;
                elements.resultsBody.appendChild(row);
            });

            const overallAvgReactionTime = roundsWithReactionTimes > 0
                ? Math.round(totalReactionTime / roundsWithReactionTimes)
                : 0;

            const totalsRow = document.createElement('tr');
            totalsRow.innerHTML = `
                <td><strong>Total</strong></td>
                <td><strong>${totalMoves}</strong></td>
                <td><strong>${totalCorrect}</strong></td>
                <td><strong>${totalWrong}</strong></td>
                <td><strong>${overallAvgReactionTime > 0 ? overallAvgReactionTime : '-'}</strong></td>
            `;
            elements.resultsBody.appendChild(totalsRow);

            // Clean up event listener
            document.removeEventListener('keydown', handleKeyPress);

            // Complete the test and move to next
            this.completeTest('goNoGoScreen', {
                rounds: roundResults,
                totalCorrect: totalCorrect,
                totalWrong: totalWrong,
                avgReactionTime: overallAvgReactionTime
            });
        };

        // Set up event listeners
        elements.goNoGoButton.addEventListener('click', startPracticeRound);
        document.addEventListener('keydown', handleKeyPress);
    }

    initializePVT() {
        let startTime;
        let reactionTimes = [];
        let falseStarts = 0;
        let testDuration = 30;
        let timeLeft = testDuration;
        let timerInterval;
        let isTestRunning = false;
        let isStimulusOn = false;
        let currentRound = 1;
        const totalRounds = 2;
        let roundResults = [];
        let stimulusTimeout;
        let fixationTimeout;
        let isPracticeRound = false;
        let dataCollector = null;

        const elements = {
            pvtWelcome: document.getElementById('pvtWelcome'),
            pvtTest: document.getElementById('pvtTest'),
            pvtResults: document.getElementById('pvtResults'),
            pvtStartButton: document.getElementById('pvtStartButton'),
            stimulusDisplay: document.getElementById('stimulusDisplay'),
            currentRound: document.getElementById('pvtCurrentRound'),
            timeLeft: document.getElementById('pvtTimeLeft'),
            message: document.getElementById('pvtMessage'),
            resultsBody: document.getElementById('pvtResultsBody'),
            finalResults: document.getElementById('pvtFinalResults')
        };

        const showNextStimulus = (showFeedback) => {
            clearTimeout(stimulusTimeout);
            clearTimeout(fixationTimeout);

            elements.stimulusDisplay.textContent = "+";
            elements.stimulusDisplay.style.color = "#000";
            isStimulusOn = false;

            if (!isPracticeRound && dataCollector) {
                dataCollector.addDataPoint('fixation_start', {
                    timeLeft: timeLeft
                });
            }

            fixationTimeout = setTimeout(() => {
                elements.stimulusDisplay.textContent = "0";
                elements.stimulusDisplay.style.color = "#e53935";
                startTime = Date.now();
                isStimulusOn = true;

                if (!isPracticeRound && dataCollector) {
                    dataCollector.addDataPoint('stimulus_shown', {
                        timeLeft: timeLeft
                    });
                }

                const counterInterval = setInterval(() => {
                    if (isStimulusOn) {
                        const elapsed = Date.now() - startTime;
                        elements.stimulusDisplay.textContent = elapsed;
                    } else {
                        clearInterval(counterInterval);
                    }
                }, 10);

                stimulusTimeout = setTimeout(() => {
                    elements.stimulusDisplay.textContent = "+";
                    elements.stimulusDisplay.style.color = "#000";
                    isStimulusOn = false;
                    clearInterval(counterInterval);

                    if (!isPracticeRound && dataCollector) {
                        dataCollector.addDataPoint('stimulus_timeout', {
                            timeLeft: timeLeft
                        });
                    }

                    if (isTestRunning) {
                        const nextDelay = Math.random() * 8000 + 2000;
                        setTimeout(() => showNextStimulus(showFeedback), nextDelay);
                    }
                }, 1000);
            }, Math.random() * 2000 + 1000);
        };

        const handleKeyPress = (e) => {
            if (e.code === 'Space' && isTestRunning) {
                e.preventDefault();
                const currentTime = Date.now();

                if (isStimulusOn) {
                    const reactionTime = currentTime - startTime;

                    if (!isPracticeRound && dataCollector) {
                        dataCollector.addDataPoint('response', {
                            reactionTime: reactionTime,
                            timeLeft: timeLeft,
                            type: reactionTime < 100 ? 'false_start' : 'valid_response'
                        });
                    }

                    if (reactionTime < 100) {
                        falseStarts++;
                        if (isPracticeRound) {
                            elements.message.textContent = "False start! (<100ms)";
                            elements.message.style.color = "#e74c3c";
                        }
                    } else {
                        reactionTimes.push(reactionTime);
                        if (isPracticeRound) {
                            elements.message.textContent = `Reaction time: ${reactionTime}ms`;
                            elements.message.style.color = "#27ae60";
                        }
                    }

                    elements.stimulusDisplay.textContent = "+";
                    elements.stimulusDisplay.style.color = "#000";
                    isStimulusOn = false;

                    clearTimeout(stimulusTimeout);
                    const nextDelay = Math.random() * 8000 + 2000;
                    setTimeout(() => showNextStimulus(isPracticeRound), nextDelay);
                } else {
                    falseStarts++;
                    if (!isPracticeRound && dataCollector) {
                        dataCollector.addDataPoint('false_start', {
                            timeLeft: timeLeft,
                            type: 'no_stimulus'
                        });
                    }
                    if (isPracticeRound) {
                        elements.message.textContent = "False start! No stimulus present";
                        elements.message.style.color = "#e74c3c";
                    }
                }
            }
        };

        const startTimer = () => {
            clearInterval(timerInterval);
            elements.timeLeft.textContent = timeLeft;

            timerInterval = setInterval(() => {
                timeLeft--;
                elements.timeLeft.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    clearTimeout(stimulusTimeout);
                    clearTimeout(fixationTimeout);
                    endRound();
                }
            }, 1000);
        };

        const startPracticeRound = () => {
            elements.pvtWelcome.style.display = 'none';
            elements.pvtTest.style.display = 'block';
            elements.pvtResults.style.display = 'none';

            isPracticeRound = true;
            reactionTimes = [];
            falseStarts = 0;
            timeLeft = 10; // Short practice round
            isTestRunning = true;

            startTimer();
            showNextStimulus(true);
        };

        const startTestRound = (round) => {
            isPracticeRound = false;
            reactionTimes = [];
            falseStarts = 0;
            timeLeft = testDuration;
            isTestRunning = true;
            currentRound = round;

            dataCollector = new GameDataCollector(`pvt_round_${round}`);

            elements.currentRound.textContent = `${currentRound}/${totalRounds}`;
            elements.message.textContent = '';

            startTimer();
            showNextStimulus(false);
        };

        const endRound = () => {
            isTestRunning = false;

            const avgReactionTime = reactionTimes.length > 0 ?
                (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0;

            if (isPracticeRound) {
                setTimeout(() => {
                    startTestRound(1);
                }, 2000);
            } else {
                const roundData = {
                    round: currentRound,
                    avgReactionTime: avgReactionTime.toFixed(2),
                    validAttempts: reactionTimes.length,
                    falseStarts: falseStarts
                };

                roundResults.push(roundData);

                if (dataCollector) {
                    dataCollector.saveData({
                        roundSummary: roundData,
                        allReactionTimes: reactionTimes,
                        testDuration: testDuration,
                        successRate: ((reactionTimes.length / (reactionTimes.length + falseStarts)) * 100).toFixed(2)
                    });
                }

                if (currentRound < totalRounds) {
                    currentRound++;
                    setTimeout(() => {
                        startTestRound(currentRound);
                    }, 2000);
                } else {
                    showFinalResults();
                }
            }
        };

        const showFinalResults = () => {
            elements.pvtTest.style.display = 'none';
            elements.pvtResults.style.display = 'block';

            let totalValidAttempts = 0;
            let totalFalseStarts = 0;
            let totalAvgReactionTime = 0;
            let roundsWithValidAttempts = 0;

            roundResults.forEach(result => {
                totalValidAttempts += result.validAttempts;
                totalFalseStarts += result.falseStarts;

                if (result.validAttempts > 0) {
                    totalAvgReactionTime += parseFloat(result.avgReactionTime);
                    roundsWithValidAttempts++;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${result.round}</td>
                    <td>${result.validAttempts > 0 ? result.avgReactionTime + ' ms' : 'N/A'}</td>
                    <td>${result.validAttempts}</td>
                    <td>${result.falseStarts}</td>
                `;
                elements.resultsBody.appendChild(row);
            });

            const overallAvgReactionTime = roundsWithValidAttempts > 0 ?
                (totalAvgReactionTime / roundsWithValidAttempts).toFixed(2) : 0;

            elements.finalResults.innerHTML = `
                <p><strong>Final Results:</strong></p>
                <p>Number of false starts = ${totalFalseStarts}</p>
                <p>Average response time = ${overallAvgReactionTime} ms over ${totalValidAttempts} attempts.</p>
            `;

            // Clean up event listener
            document.removeEventListener('keydown', handleKeyPress);

            // Complete test and move to next
            this.completeTest('pvtScreen', {
                rounds: roundResults,
                totalFalseStarts: totalFalseStarts,
                overallAvgReactionTime: overallAvgReactionTime,
                totalValidAttempts: totalValidAttempts
            });
        };

        // Initialize event listeners
        elements.pvtStartButton.addEventListener('click', startPracticeRound);
        document.addEventListener('keydown', handleKeyPress);
    }

    initializeTrailMaking() {
        let numbers = [];
        let currentNumber = 1;
        let startTime;
        let timerInterval;
        let isTestRunning = false;
        let currentRound = 1;
        let round1Time = 0;
        let round2Time = 0;
        let correctMoves = 0;
        let wrongMoves = 0;
        let totalMoves = 0;
        let round1Results = {};
        let dataCollector = null;

        const elements = {
            tmWelcome: document.getElementById('tmWelcome'),
            tmRound1Instructions: document.getElementById('tmRound1Instructions'),
            tmRound1Practice: document.getElementById('tmRound1Practice'),
            tmRound1Test: document.getElementById('tmRound1Test'),
            tmRound2Instructions: document.getElementById('tmRound2Instructions'),
            tmRound2Practice: document.getElementById('tmRound2Practice'),
            tmRound2Test: document.getElementById('tmRound2Test'),
            tmResults: document.getElementById('tmResults'),
            tmStartButton: document.getElementById('tmStartButton'),
            tmRound1StartButton: document.getElementById('tmRound1StartButton'),
            tmRound1PracticeComplete: document.getElementById('tmRound1PracticeComplete'),
            tmRound2StartButton: document.getElementById('tmRound2StartButton'),
            tmRound2PracticeComplete: document.getElementById('tmRound2PracticeComplete'),
            practiceTrailContainer: document.getElementById('practiceTrailContainer'),
            round2PracticeTrailContainer: document.getElementById('round2PracticeTrailContainer'),
            trailContainer: document.getElementById('trailContainer'),
            round2TrailContainer: document.getElementById('round2TrailContainer'),
            tmTime: document.getElementById('tmTime'),
            tmRound2Time: document.getElementById('tmRound2Time'),
            tmFinalResults: document.getElementById('tmFinalResults'),
            tmPracticeFeedback: document.getElementById('tmPracticeFeedback'),
            tmRound2PracticeFeedback: document.getElementById('tmRound2PracticeFeedback')
        };

        const generateNumbers = (round) => {
            numbers = [];
            if (round === 1) {
                // Round 1: Numbers 1-25
                for (let i = 1; i <= 25; i++) {
                    numbers.push({ value: i, type: 'number' });
                }
            } else {
                // Round 2: Alternating numbers and letters (1-A-2-B... up to 13)
                for (let i = 1; i <= 13; i++) {
                    numbers.push({ value: i, type: 'number' });
                    if (i <= 12) {
                        numbers.push({ value: String.fromCharCode(64 + i), type: 'letter' });
                    }
                }
            }

            // Shuffle but keep the first item (1) in place for the start
            const first = numbers.shift();
            numbers.sort(() => Math.random() - 0.5);
            numbers.unshift(first);
        };

        const displayNumbers = (container, isPractice = false) => {
            container.innerHTML = '';
            numbers.forEach((item) => {
                const numberDiv = document.createElement('div');
                numberDiv.textContent = item.value;
                numberDiv.addEventListener('click', () => handleNumberClick(item, container, isPractice));
                container.appendChild(numberDiv);
            });
        };

        const handleNumberClick = (item, container, isPractice) => {
            if (!isPractice && !isTestRunning) return;

            const expectedType = currentRound === 1 ? 'number' :
                (currentNumber % 2 === 1 ? 'number' : 'letter');

            const expectedValue = currentRound === 1 ? currentNumber :
                (expectedType === 'number' ? Math.ceil(currentNumber / 2) :
                    String.fromCharCode(64 + Math.floor(currentNumber / 2)));

            const numberDivs = container.querySelectorAll('div');
            const index = numbers.findIndex(n => n.value === item.value && n.type === item.type);

            const isCorrect = item.type === expectedType && item.value === expectedValue;

            // Record the move data if not in practice
            if (!isPractice && dataCollector) {
                const moveData = {
                    moveNumber: totalMoves + 1,
                    selectedValue: item.value,
                    selectedType: item.type,
                    expectedValue: expectedValue,
                    expectedType: expectedType,
                    isCorrect: isCorrect,
                    timeSinceStart: Math.floor((Date.now() - startTime) / 1000),
                    position: {
                        x: numberDivs[index].offsetLeft,
                        y: numberDivs[index].offsetTop
                    }
                };
                dataCollector.addDataPoint('move', moveData);
            }

            if (isCorrect) {
                numberDivs[index].classList.add('clicked');
                if (isPractice) {
                    const feedbackElement = currentRound === 1 ? 
                        elements.tmPracticeFeedback : 
                        elements.tmRound2PracticeFeedback;
                    feedbackElement.textContent = "Correct! Continue the sequence.";
                    feedbackElement.className = "correct-feedback";
                } else {
                    correctMoves++;
                }
                currentNumber++;

                const totalItems = currentRound === 1 ? 25 : 25;

                if (currentNumber > totalItems) {
                    if (!isPractice) {
                        endTest();
                    } else {
                        const feedbackElement = currentRound === 1 ? 
                            elements.tmPracticeFeedback : 
                            elements.tmRound2PracticeFeedback;
                        feedbackElement.textContent = "Practice complete! You've reached the end.";
                        currentNumber = 1;
                        generateNumbers(currentRound);
                        displayNumbers(container, isPractice);
                    }
                }
            } else if (isPractice) {
                numberDivs[index].classList.add('wrong');
                const feedbackElement = currentRound === 1 ? 
                    elements.tmPracticeFeedback : 
                    elements.tmRound2PracticeFeedback;
                feedbackElement.textContent = "Wrong! Try again.";
                feedbackElement.className = "wrong-feedback";
            }

            if (!isPractice) {
                totalMoves++;
            }
        };

        const startTimer = (timeElement) => {
            clearInterval(timerInterval);
            timeElement.textContent = '0';

            timerInterval = setInterval(() => {
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                timeElement.textContent = elapsedTime;
            }, 1000);
        };

        const endTest = () => {
            clearInterval(timerInterval);
            isTestRunning = false;
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);

            if (currentRound === 1) {
                round1Time = elapsedTime;
                round1Results = {
                    time: elapsedTime,
                    totalMoves: totalMoves,
                    correctMoves: correctMoves,
                    wrongMoves: totalMoves - correctMoves
                };

                if (dataCollector) {
                    dataCollector.saveData({
                        roundSummary: round1Results,
                        accuracy: ((correctMoves / totalMoves) * 100).toFixed(2),
                        averageTimePerMove: (elapsedTime / correctMoves).toFixed(2)
                    });
                }

                // Show Round 2 instructions
                elements.tmRound1Test.style.display = 'none';
                elements.tmRound2Instructions.style.display = 'block';
            } else {
                round2Time = elapsedTime;
                const round2Results = {
                    time: elapsedTime,
                    totalMoves: totalMoves,
                    correctMoves: correctMoves,
                    wrongMoves: totalMoves - correctMoves
                };

                if (dataCollector) {
                    dataCollector.saveData({
                        roundSummary: round2Results,
                        accuracy: ((correctMoves / totalMoves) * 100).toFixed(2),
                        averageTimePerMove: (elapsedTime / correctMoves).toFixed(2),
                        totalTestTime: round1Time + elapsedTime
                    });
                }

                // Show final results
                showFinalResults(round1Results, round2Results);
            }
        };

        const startRound1Practice = () => {
            elements.tmRound1Instructions.style.display = 'none';
            elements.tmRound1Practice.style.display = 'block';
            currentRound = 1;
            currentNumber = 1;
            generateNumbers(1);
            displayNumbers(elements.practiceTrailContainer, true);
            elements.tmPracticeFeedback.textContent = '';
        };

        const startRound1Test = () => {
            elements.tmRound1Practice.style.display = 'none';
            elements.tmRound1Test.style.display = 'block';
            currentNumber = 1;
            correctMoves = 0;
            wrongMoves = 0;
            totalMoves = 0;
            isTestRunning = true;

            dataCollector = new GameDataCollector('trail_making_round_1');
            generateNumbers(1);
            displayNumbers(elements.trailContainer);
            startTime = Date.now();
            startTimer(elements.tmTime);
        };

        const startRound2Practice = () => {
            elements.tmRound2Instructions.style.display = 'none';
            elements.tmRound2Practice.style.display = 'block';
            currentRound = 2;
            currentNumber = 1;
            generateNumbers(2);
            displayNumbers(elements.round2PracticeTrailContainer, true);
            elements.tmRound2PracticeFeedback.textContent = '';
        };

        const startRound2Test = () => {
            elements.tmRound2Practice.style.display = 'none';
            elements.tmRound2Test.style.display = 'block';
            currentNumber = 1;
            correctMoves = 0;
            wrongMoves = 0;
            totalMoves = 0;
            isTestRunning = true;

            dataCollector = new GameDataCollector('trail_making_round_2');
            generateNumbers(2);
            displayNumbers(elements.round2TrailContainer);
            startTime = Date.now();
            startTimer(elements.tmRound2Time);
        };

        const showFinalResults = (round1Results, round2Results) => {
            elements.tmRound2Test.style.display = 'none';
            elements.tmResults.style.display = 'block';

            elements.tmFinalResults.innerHTML = `
                <h2>Round 1 Results</h2>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Time</td>
                            <td>${round1Results.time} seconds</td>
                        </tr>
                        <tr>
                            <td>Total Moves</td>
                            <td>${round1Results.totalMoves}</td>
                        </tr>
                        <tr>
                            <td>Correct Moves</td>
                            <td>${round1Results.correctMoves}</td>
                        </tr>
                        <tr>
                            <td>Wrong Moves</td>
                            <td>${round1Results.wrongMoves}</td>
                        </tr>
                    </tbody>
                </table>
                
                <h2>Round 2 Results</h2>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Time</td>
                            <td>${round2Results.time} seconds</td>
                        </tr>
                        <tr>
                            <td>Total Moves</td>
                            <td>${round2Results.totalMoves}</td>
                        </tr>
                        <tr>
                            <td>Correct Moves</td>
                            <td>${round2Results.correctMoves}</td>
                        </tr>
                        <tr>
                            <td>Wrong Moves</td>
                            <td>${round2Results.wrongMoves}</td>
                        </tr>
                    </tbody>
                </table>
                
                <h2>Combined Results</h2>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Time</td>
                            <td>${round1Results.time + round2Results.time} seconds</td>
                        </tr>
                        <tr>
                            <td>Total Correct Moves</td>
                            <td>${round1Results.correctMoves + round2Results.correctMoves}</td>
                        </tr>
                        <tr>
                            <td>Total Wrong Moves</td>
                            <td>${round1Results.wrongMoves + round2Results.wrongMoves}</td>
                        </tr>
                    </tbody>
                </table>
            `;

            // Complete test and move to next
            this.completeTest('trailMakingScreen', {
                round1: round1Results,
                round2: round2Results,
                totalTime: round1Results.time + round2Results.time,
                totalCorrect: round1Results.correctMoves + round2Results.correctMoves,
                totalWrong: round1Results.wrongMoves + round2Results.wrongMoves
            });
        };

        // Initialize event listeners
        elements.tmStartButton.addEventListener('click', () => {
            elements.tmWelcome.style.display = 'none';
            elements.tmRound1Instructions.style.display = 'block';
        });
        elements.tmRound1StartButton.addEventListener('click', startRound1Practice);
        elements.tmRound1PracticeComplete.addEventListener('click', startRound1Test);
        elements.tmRound2StartButton.addEventListener('click', startRound2Practice);
        elements.tmRound2PracticeComplete.addEventListener('click', startRound2Test);
    }
}

// Initialize the app when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});