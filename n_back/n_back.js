// N-Back Task Implementation
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'N', 'P', 'Q', 'R', 'S', 'T', 'X', 'Y', 'Z'];
const TRIALS_PER_BLOCK = 30;
const PRACTICE_TRIALS = 10;
const STIMULUS_DURATION = 500; // ms
const ITI_DURATION = 2000; // ms (Inter-trial interval)
const REST_DURATION = 30; // seconds
const BLOCKS = [
    { name: '0-Back', n: 0, instruction: 'Press SPACEBAR when you see the letter X' },
    { name: '2-Back', n: 2, instruction: 'Press SPACEBAR when the letter matches 2 positions back' },
    { name: '3-Back', n: 3, instruction: 'Press SPACEBAR when the letter matches 3 positions back' }
];

let currentBlock = 0;
let currentTrial = 0;
let isPractice = false;
let isTestActive = false;
let canRespond = false;
let hasResponded = false;

let stimulusSequence = [];
let stimulusStartTime = 0;
let blockResults = [];
let currentBlockData = {
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,
    reactionTimes: []
};

let dataCollector = null;
let currentTimeout = null;
let restInterval = null;

// Event Listeners
document.getElementById('startButton').addEventListener('click', startPractice);
document.addEventListener('keydown', handleKeyPress);

function startPractice() {
    isPractice = true;
    currentTrial = 0;
    currentBlock = 0;
    resetBlockData();

    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('practiceScreen').style.display = 'block';
    document.getElementById('practiceLevel').textContent = BLOCKS[0].name;

    generateSequence(PRACTICE_TRIALS, 0);
    
    setTimeout(() => {
        isTestActive = true;
        showNextStimulus();
    }, 1000);
}

function startMainTest(blockIndex) {
    isPractice = false;
    currentBlock = blockIndex;
    currentTrial = 0;
    resetBlockData();

    // Initialize data collector for this block
    dataCollector = new GameDataCollector(`n_back_${BLOCKS[blockIndex].name.toLowerCase().replace('-', '_')}`);

    document.getElementById('restScreen').style.display = 'none';
    document.getElementById('testScreen').style.display = 'block';
    document.getElementById('currentLevel').textContent = BLOCKS[blockIndex].name;
    document.getElementById('blockInstruction').textContent = BLOCKS[blockIndex].instruction;
    document.getElementById('currentBlock').textContent = blockIndex + 1;
    document.getElementById('currentTrial').textContent = '0';

    generateSequence(TRIALS_PER_BLOCK, BLOCKS[blockIndex].n);

    setTimeout(() => {
        isTestActive = true;
        showNextStimulus();
    }, 1000);
}

function generateSequence(numTrials, nBack) {
    stimulusSequence = [];
    const targetProbability = 0.3; // 30% targets
    
    // Generate initial non-target letters for positions < nBack
    for (let i = 0; i < Math.max(nBack, 1); i++) {
        const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        stimulusSequence.push({
            letter: letter,
            isTarget: nBack === 0 && letter === 'X'
        });
    }

    // Generate remaining sequence
    for (let i = Math.max(nBack, 1); i < numTrials; i++) {
        const shouldBeTarget = Math.random() < targetProbability;
        let letter;
        let isTarget = false;

        if (shouldBeTarget && nBack > 0) {
            // Make it a target by matching n-back position
            letter = stimulusSequence[i - nBack].letter;
            isTarget = true;
        } else if (nBack === 0) {
            // For 0-back, X is the target
            if (shouldBeTarget) {
                letter = 'X';
                isTarget = true;
            } else {
                // Non-target: any letter except X
                const nonXLetters = LETTERS.filter(l => l !== 'X');
                letter = nonXLetters[Math.floor(Math.random() * nonXLetters.length)];
                isTarget = false;
            }
        } else {
            // Non-target: ensure it doesn't match n-back position
            do {
                letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
            } while (letter === stimulusSequence[i - nBack].letter);
            isTarget = false;
        }

        stimulusSequence.push({ letter, isTarget });
    }
}

function showNextStimulus() {
    if (!isTestActive) return;

    const maxTrials = isPractice ? PRACTICE_TRIALS : TRIALS_PER_BLOCK;
    
    if (currentTrial >= maxTrials) {
        endBlock();
        return;
    }

    const stimulus = stimulusSequence[currentTrial];
    const letterElement = isPractice ? 
        document.getElementById('practiceLetter') : 
        document.getElementById('letterDisplay');
    
    // Show fixation cross
    letterElement.textContent = '+';
    letterElement.parentElement.classList.remove('target-flash');
    
    // Clear previous feedback
    if (isPractice) {
        document.getElementById('practiceFeedback').textContent = '';
    }

    hasResponded = false;
    canRespond = false;

    // Record trial start
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('trial_start', {
            trialNumber: currentTrial + 1,
            letter: stimulus.letter,
            isTarget: stimulus.isTarget,
            nBack: BLOCKS[currentBlock].n
        });
    }

    // Show stimulus after brief delay
    currentTimeout = setTimeout(() => {
        letterElement.textContent = stimulus.letter;
        stimulusStartTime = Date.now();
        canRespond = true;

        if (!isPractice && dataCollector) {
            dataCollector.addDataPoint('stimulus_shown', {
                trialNumber: currentTrial + 1,
                letter: stimulus.letter
            });
        }

        // Hide stimulus after duration
        currentTimeout = setTimeout(() => {
            letterElement.textContent = '+';
            canRespond = false;

            // Process no response
            if (!hasResponded) {
                processResponse(false, 0);
            }

            // Update trial counter
            currentTrial++;
            if (isPractice) {
                document.getElementById('practiceTrialNum').textContent = currentTrial;
            } else {
                document.getElementById('currentTrial').textContent = currentTrial;
            }

            // Show next stimulus after ITI
            currentTimeout = setTimeout(showNextStimulus, ITI_DURATION);
        }, STIMULUS_DURATION);
    }, 500); // Brief fixation before stimulus
}

function handleKeyPress(e) {
    if (e.code === 'Space' && isTestActive && canRespond && !hasResponded) {
        e.preventDefault();
        hasResponded = true;
        const reactionTime = Date.now() - stimulusStartTime;
        processResponse(true, reactionTime);
    }
}

function processResponse(responded, reactionTime) {
    const stimulus = stimulusSequence[currentTrial];
    let feedbackText = '';
    let feedbackClass = '';

    if (stimulus.isTarget && responded) {
        // Hit
        currentBlockData.hits++;
        currentBlockData.reactionTimes.push(reactionTime);
        feedbackText = `Correct! (${reactionTime}ms)`;
        feedbackClass = 'feedback-correct';
    } else if (stimulus.isTarget && !responded) {
        // Miss
        currentBlockData.misses++;
        feedbackText = 'Missed target!';
        feedbackClass = 'feedback-incorrect';
    } else if (!stimulus.isTarget && responded) {
        // False Alarm
        currentBlockData.falseAlarms++;
        feedbackText = 'False alarm!';
        feedbackClass = 'feedback-incorrect';
    } else {
        // Correct Rejection
        currentBlockData.correctRejections++;
        // No feedback for correct rejections to reduce cognitive load
    }

    // Record response
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('response', {
            trialNumber: currentTrial + 1,
            responded: responded,
            reactionTime: reactionTime,
            isTarget: stimulus.isTarget,
            resultType: stimulus.isTarget ? (responded ? 'hit' : 'miss') : (responded ? 'false_alarm' : 'correct_rejection')
        });
    }

    // Show feedback in practice mode
    if (isPractice && feedbackText) {
        const feedbackElement = document.getElementById('practiceFeedback');
        feedbackElement.textContent = feedbackText;
        feedbackElement.className = `feedback-message ${feedbackClass}`;
    }
}

function resetBlockData() {
    currentBlockData = {
        hits: 0,
        misses: 0,
        falseAlarms: 0,
        correctRejections: 0,
        reactionTimes: []
    };
}

function endBlock() {
    isTestActive = false;
    clearTimeout(currentTimeout);

    if (isPractice) {
        // After practice, show brief message and start main test
        document.getElementById('practiceFeedback').textContent = 'Practice complete! Starting main test...';
        document.getElementById('practiceFeedback').className = 'feedback-message feedback-correct';
        
        setTimeout(() => {
            document.getElementById('practiceScreen').style.display = 'none';
            startMainTest(0);
        }, 2000);
    } else {
        // Save block results
        const accuracy = ((currentBlockData.hits + currentBlockData.correctRejections) / TRIALS_PER_BLOCK * 100).toFixed(1);
        const avgRT = currentBlockData.reactionTimes.length > 0 ? 
            Math.round(currentBlockData.reactionTimes.reduce((a, b) => a + b, 0) / currentBlockData.reactionTimes.length) : 0;

        const blockResult = {
            blockName: BLOCKS[currentBlock].name,
            nBack: BLOCKS[currentBlock].n,
            ...currentBlockData,
            accuracy: accuracy,
            avgReactionTime: avgRT
        };

        blockResults.push(blockResult);

        // Save block data
        if (dataCollector) {
            dataCollector.saveData({
                blockSummary: blockResult,
                allReactionTimes: currentBlockData.reactionTimes,
                totalTrials: TRIALS_PER_BLOCK
            });
        }

        // Check if more blocks remain
        if (currentBlock < BLOCKS.length - 1) {
            showRestScreen(currentBlock + 1);
        } else {
            showResults();
        }
    }
}

function showRestScreen(nextBlockIndex) {
    document.getElementById('testScreen').style.display = 'none';
    document.getElementById('restScreen').style.display = 'block';
    document.getElementById('nextBlockInfo').textContent = BLOCKS[nextBlockIndex].name;

    let timeLeft = REST_DURATION;
    document.getElementById('restTimer').textContent = timeLeft;

    restInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('restTimer').textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(restInterval);
            startMainTest(nextBlockIndex);
        }
    }, 1000);
}

function showResults() {
    document.getElementById('testScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';

    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

    let totalHits = 0;
    let totalMisses = 0;
    let totalFalseAlarms = 0;
    let totalCorrectRejections = 0;
    let allReactionTimes = [];

    // Populate table with block results
    blockResults.forEach(result => {
        totalHits += result.hits;
        totalMisses += result.misses;
        totalFalseAlarms += result.falseAlarms;
        totalCorrectRejections += result.correctRejections;
        allReactionTimes = allReactionTimes.concat(result.reactionTimes);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${result.blockName}</strong></td>
            <td>${result.hits}</td>
            <td>${result.misses}</td>
            <td>${result.falseAlarms}</td>
            <td>${result.correctRejections}</td>
            <td>${result.accuracy}%</td>
            <td>${result.avgReactionTime > 0 ? result.avgReactionTime : '-'}</td>
        `;
        resultsBody.appendChild(row);
    });

    // Calculate overall statistics
    const totalTrials = TRIALS_PER_BLOCK * BLOCKS.length;
    const overallAccuracy = ((totalHits + totalCorrectRejections) / totalTrials * 100).toFixed(1);
    const overallAvgRT = allReactionTimes.length > 0 ?
        Math.round(allReactionTimes.reduce((a, b) => a + b, 0) / allReactionTimes.length) : 0;

    document.getElementById('overallStats').innerHTML = `
        <h3>Overall Performance</h3>
        <p><strong>Total Accuracy:</strong> ${overallAccuracy}%</p>
        <p><strong>Total Hits:</strong> ${totalHits}</p>
        <p><strong>Total Misses:</strong> ${totalMisses}</p>
        <p><strong>Total False Alarms:</strong> ${totalFalseAlarms}</p>
        <p><strong>Total Correct Rejections:</strong> ${totalCorrectRejections}</p>
        <p><strong>Average Reaction Time:</strong> ${overallAvgRT > 0 ? overallAvgRT + ' ms' : 'N/A'}</p>
    `;

    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.length > 0) {
        users[users.length - 1].results.nBack = {
            blocks: blockResults,
            overallAccuracy: overallAccuracy,
            overallAvgRT: overallAvgRT,
            totalHits: totalHits,
            totalMisses: totalMisses,
            totalFalseAlarms: totalFalseAlarms,
            totalCorrectRejections: totalCorrectRejections
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Navigation to next test
    document.getElementById('goToAnotherTest').addEventListener('click', () => {
        const tests = [
            'finger_tapping/finger_tapping.html',
            'go_no_go/go_no_go.html',
            'pvt/pvt.html',
            'trail_making/trail_making.html',
            'n_back/n_back.html'
        ];
        let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
        completedTests.push('n_back/n_back.html');
        sessionStorage.setItem('completedTests', JSON.stringify(completedTests));

        const availableTests = tests.filter(test => !completedTests.includes(test));
        if (availableTests.length > 0) {
            const randomTest = availableTests[Math.floor(Math.random() * availableTests.length)];
            window.location.href = '../' + randomTest;
        } else {
            sessionStorage.removeItem('completedTests');
            window.location.href = '../completion/completion.html';
        }
    });
}

