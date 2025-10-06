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
const totalRounds = 2; // Changed from 3 to 2
let roundResults = [];
let stimulusTimeout;
let fixationTimeout;
let stimulusStartTime = 0;
let reactionTimes = [];
let currentRoundReactionTimes = [];
let dataCollector = null;

document.getElementById('goNoGoButton').addEventListener('click', startInitialTest);
document.addEventListener('keydown', handleKeyPress);

function startInitialTest() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('testContainer').style.display = 'block';
    document.getElementById('goNoGoButton').textContent = "Preparing...";
    document.getElementById('goNoGoButton').disabled = true;

    setTimeout(() => {
        startPracticeRound();
    }, 1000);
}

function startPracticeRound() {
    isPracticeRound = true;
    score = 0;
    correctResponses = 0;
    wrongResponses = 0;
    totalTrials = 0;
    timeLeft = 10; // Shorter practice round
    isTestRunning = true;

    document.getElementById('message').textContent = "Practice Round - Get ready!";
    document.getElementById('currentRound').textContent = "Practice";

    startTimer();
    showNextStimulus();
}

function startMainTest(round) {
    isPracticeRound = false;
    score = 0;
    correctResponses = 0;
    wrongResponses = 0;
    totalTrials = 0;
    timeLeft = testDuration;
    isTestRunning = true;
    currentRound = round;

    // Initialize data collector for each round
    dataCollector = new GameDataCollector(`go_no_go_round_${round}`);

    document.getElementById('currentRound').textContent = `${currentRound}/${totalRounds}`;
    document.getElementById('message').textContent = `Round ${currentRound} - Be ready!`;

    startTimer();
    showNextStimulus();
}

function showNextStimulus() {
    clearTimeout(stimulusTimeout);
    clearTimeout(fixationTimeout);

    const shapeDisplay = document.getElementById('shapeDisplay');
    shapeDisplay.textContent = "+";
    shapeDisplay.style.backgroundColor = "transparent";

    // Show fixation cross for 500ms-1000ms before stimulus
    fixationTimeout = setTimeout(() => {
        const randomShape = shapes[Math.random() < 0.7 ? 0 : 1]; // 70% orange, 30% blue
        shapeDisplay.textContent = "";
        shapeDisplay.style.backgroundColor = randomShape === 'orange' ? '#ff9800' : '#2196f3';
        shapeDisplay.className = `shape-display ${randomShape}-square`;

        // Record when the stimulus appears
        stimulusStartTime = Date.now();
        totalTrials++;

        // Record stimulus presentation if not in practice round
        if (!isPracticeRound && dataCollector) {
            dataCollector.addDataPoint('stimulus_shown', {
                stimulusType: randomShape,
                trialNumber: totalTrials
            });
        }

        // Hide stimulus after 1 second
        stimulusTimeout = setTimeout(() => {
            shapeDisplay.textContent = "+";
            shapeDisplay.style.backgroundColor = "transparent";

            if (!isPracticeRound && dataCollector) {
                dataCollector.addDataPoint('stimulus_hidden', {
                    trialNumber: totalTrials,
                    responseReceived: false
                });
            }

            if (isTestRunning) {
                // Schedule next stimulus
                const nextDelay = Math.random() * 1000 + 500; // 500-1500ms between stimuli
                setTimeout(showNextStimulus, nextDelay);
            }
        }, 1000);
    }, Math.random() * 500 + 500); // 500-1000ms fixation
}

function handleKeyPress(e) {
    if (e.code === 'Space' && isTestRunning) {
        e.preventDefault();
        const shapeDisplay = document.getElementById('shapeDisplay');
        const reactionTime = Date.now() - stimulusStartTime;

        if (!isPracticeRound && dataCollector) {
            const responseType = shapeDisplay.classList.contains('orange-square') ? 'correct_response' :
                shapeDisplay.classList.contains('blue-square') ? 'wrong_response' : 'early_response';

            dataCollector.addDataPoint('response', {
                responseType: responseType,
                reactionTime: reactionTime,
                trialNumber: totalTrials,
                timeLeft: timeLeft
            });
        }

        if (shapeDisplay.classList.contains('orange-square')) {
            correctResponses++;
            score++;
            // Only record reaction time for correct responses to orange squares
            reactionTimes.push(reactionTime);
            currentRoundReactionTimes.push(reactionTime);
            if (isPracticeRound) {
                document.getElementById('message').textContent = `Correct! (${reactionTime}ms)`;
                document.getElementById('message').style.color = "#27ae60";
            }
        } else if (shapeDisplay.classList.contains('blue-square')) {
            wrongResponses++;
            if (isPracticeRound) {
                document.getElementById('message').textContent = "Wrong! Shouldn't press for blue";
                document.getElementById('message').style.color = "#e74c3c";
            }
        } else {
            // Pressed during fixation
            wrongResponses++;
            if (isPracticeRound) {
                document.getElementById('message').textContent = "Too early! Wait for the square";
                document.getElementById('message').style.color = "#e74c3c";
            }
        }

        // Update display immediately
        shapeDisplay.textContent = "+";
        shapeDisplay.style.backgroundColor = "transparent";
        shapeDisplay.className = "shape-display";

        // In main test, clear any message after a short delay
        if (!isPracticeRound) {
            setTimeout(() => {
                document.getElementById('message').textContent = "";
            }, 300);
        }
    }
}

function startTimer() {
    clearInterval(timerInterval);
    document.getElementById('timeLeft').textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            clearTimeout(stimulusTimeout);
            clearTimeout(fixationTimeout);

            if (isPracticeRound) {
                document.getElementById('message').textContent = "Practice round complete! Main test starts now.";
                setTimeout(() => {
                    startMainTest(1);
                }, 2000);
            } else {
                endRound();
            }
        }
    }, 1000);
}

function endRound() {
    isTestRunning = false;
    clearInterval(timerInterval);
    clearTimeout(stimulusTimeout);
    clearTimeout(fixationTimeout);

    // Calculate average reaction time for this round
    const avgReactionTime = currentRoundReactionTimes.length > 0
        ? Math.round(currentRoundReactionTimes.reduce((a, b) => a + b, 0) / currentRoundReactionTimes.length)
        : 0;

    // Save round results
    const roundData = {
        round: currentRound,
        total: totalTrials,
        correct: correctResponses,
        wrong: wrongResponses,
        avgReactionTime: avgReactionTime
    };

    roundResults.push(roundData);

    // Save round data to JSON if not in practice
    if (dataCollector) {
        dataCollector.saveData({
            roundSummary: roundData,
            reactionTimes: currentRoundReactionTimes,
            accuracy: (correctResponses / totalTrials * 100).toFixed(2)
        });
    }

    // Reset for next round
    currentRoundReactionTimes = [];

    if (currentRound < totalRounds) {
        // Start next round
        currentRound++;
        setTimeout(() => {
            startMainTest(currentRound);
        }, 2000);
    } else {
        // All rounds completed
        showFinalResults();
    }
}

function showFinalResults() {
    document.getElementById('testScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';

    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

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
        resultsBody.appendChild(row);
    });

    // Calculate overall average reaction time
    const overallAvgReactionTime = roundsWithReactionTimes > 0
        ? Math.round(totalReactionTime / roundsWithReactionTimes)
        : 0;

    // Add totals row
    const totalsRow = document.createElement('tr');
    totalsRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${totalMoves}</strong></td>
        <td><strong>${totalCorrect}</strong></td>
        <td><strong>${totalWrong}</strong></td>
        <td><strong>${overallAvgReactionTime > 0 ? overallAvgReactionTime : '-'}</strong></td>
    `;
    resultsBody.appendChild(totalsRow);

    // Save results to localStorage (update to include reaction times)
    const users = JSON.parse(localStorage.getItem('users'));
    if (users && users.length > 0) {
        users[users.length - 1].results.goNoGo = {
            rounds: roundResults,
            totalCorrect: totalCorrect,
            totalWrong: totalWrong,
            avgReactionTime: overallAvgReactionTime
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Rest of the function remains the same...
    document.getElementById('goToAnotherTest').addEventListener('click', () => {
        const tests = ['finger_tapping.html', 'go_no_go.html'/*, 'conners_cpt.html'*/, 'pvt.html', 'trail_making.html'];
        let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
        completedTests.push('go_no_go.html');
        sessionStorage.setItem('completedTests', JSON.stringify(completedTests));

        const availableTests = tests.filter(test => !completedTests.includes(test));
        if (availableTests.length > 0) {
            const randomTest = availableTests[Math.floor(Math.random() * availableTests.length)];
            location.href = randomTest;
        } else {
            sessionStorage.removeItem('completedTests');
            location.href = 'completion.html';
        }
    });
}