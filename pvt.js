let startTime;
let reactionTimes = [];
let falseStarts = 0;
let testDuration = 30;
let timeLeft = testDuration;
let timerInterval;
let isTestRunning = false;
let isStimulusOn = false;
let currentRound = 1;
const totalRounds = 2; // Changed from 3 to 2
let roundResults = [];
let stimulusTimeout;
let fixationTimeout;
let isPracticeRound = false;
let dataCollector = null;

document.getElementById('startButton').addEventListener('click', startPracticeRound);
document.addEventListener('keydown', handleKeyPress);

function startPracticeRound() {
    isPracticeRound = true;
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('practiceScreen').style.display = 'block';

    // Initialize practice round
    reactionTimes = [];
    falseStarts = 0;
    timeLeft = testDuration;
    isTestRunning = true;

    startTimer('practiceTimeLeft');
    showNextStimulus(true);
}

function startTestRound(round) {
    isPracticeRound = false;
    document.getElementById('practiceScreen').style.display = 'none';
    document.getElementById('testScreen').style.display = 'block';

    reactionTimes = [];
    falseStarts = 0;
    timeLeft = testDuration;
    isTestRunning = true;
    currentRound = round;

    // Initialize data collector for this round
    dataCollector = new GameDataCollector(`pvt_round_${round}`);

    document.getElementById('currentRound').textContent = `${currentRound}/${totalRounds}`;
    document.getElementById('message').textContent = '';

    startTimer('timeLeft');
    showNextStimulus(false);
}

function showNextStimulus(showFeedback) {
    clearTimeout(stimulusTimeout);
    clearTimeout(fixationTimeout);

    const stimulusDisplay = isPracticeRound ?
        document.getElementById('practiceStimulus') :
        document.getElementById('stimulusDisplay');

    stimulusDisplay.textContent = "+";
    stimulusDisplay.style.color = "#000";
    isStimulusOn = false;

    if (!isPracticeRound && dataCollector) {
        dataCollector.addDataPoint('fixation_start', {
            timeLeft: timeLeft
        });
    }

    fixationTimeout = setTimeout(() => {
        stimulusDisplay.textContent = "0";
        stimulusDisplay.style.color = "#e53935";
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
                stimulusDisplay.textContent = elapsed;
            } else {
                clearInterval(counterInterval);
            }
        }, 10);

        stimulusTimeout = setTimeout(() => {
            stimulusDisplay.textContent = "+";
            stimulusDisplay.style.color = "#000";
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
}

function handleKeyPress(e) {
    if (e.code === 'Space' && isTestRunning) {
        e.preventDefault();
        const stimulusDisplay = isPracticeRound ?
            document.getElementById('practiceStimulus') :
            document.getElementById('stimulusDisplay');
        const messageElement = isPracticeRound ?
            document.getElementById('practiceMessage') :
            document.getElementById('message');
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
                    messageElement.textContent = "False start! (<100ms)";
                    messageElement.style.color = "#e74c3c";
                }
            } else {
                reactionTimes.push(reactionTime);
                if (isPracticeRound) {
                    messageElement.textContent = `Reaction time: ${reactionTime}ms`;
                    messageElement.style.color = "#27ae60";
                }
            }

            stimulusDisplay.textContent = "+";
            stimulusDisplay.style.color = "#000";
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
                messageElement.textContent = "False start! No stimulus present";
                messageElement.style.color = "#e74c3c";
            }
        }
    }
}

function startTimer(timeElementId) {
    clearInterval(timerInterval);
    document.getElementById(timeElementId).textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById(timeElementId).textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            clearTimeout(stimulusTimeout);
            clearTimeout(fixationTimeout);
            endRound();
        }
    }, 1000);
}

function endRound() {
    isTestRunning = false;

    const avgReactionTime = reactionTimes.length > 0 ?
        (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0;

    if (isPracticeRound) {
        // After practice round, start real test
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

        // Save round data to JSON
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
}

function showFinalResults() {
    document.getElementById('testScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';

    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

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
        resultsBody.appendChild(row);
    });

    const overallAvgReactionTime = roundsWithValidAttempts > 0 ?
        (totalAvgReactionTime / roundsWithValidAttempts).toFixed(2) : 0;

    document.getElementById('finalResults').innerHTML = `
        <p><strong>Final Results:</strong></p>
        <p>Number of false starts = ${totalFalseStarts}</p>
        <p>Average response time = ${overallAvgReactionTime} ms over ${totalValidAttempts} attempts.</p>
    `;

    // Save results to localStorage
    const users = JSON.parse(localStorage.getItem('users'));
    if (users && users.length > 0) {
        users[users.length - 1].results.pvt = {
            rounds: roundResults,
            totalFalseStarts: totalFalseStarts,
            overallAvgReactionTime: overallAvgReactionTime,
            totalValidAttempts: totalValidAttempts
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    document.getElementById('goToAnotherTest').addEventListener('click', () => {
        const tests = ['finger_tapping.html', 'go_no_go.html'/*, 'conners_cpt.html'*/, 'pvt.html', 'trail_making.html'];
        let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
        completedTests.push('pvt.html');
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