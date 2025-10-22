// Eriksen Flanker Task Implementation
const TRIAL_TYPES = {
    CONGRUENT: 'congruent',
    INCONGRUENT: 'incongruent',
    NEUTRAL: 'neutral'
};

const DIRECTIONS = {
    LEFT: 'left',
    RIGHT: 'right'
};

const ARROW_CHARS = {
    left: '←',
    right: '→',
    neutral: '□'
};

const TRIALS_PER_BLOCK = 40;
const PRACTICE_TRIALS = 10;
const TOTAL_BLOCKS = 3;
const FIXATION_DURATION = 500; // ms
const STIMULUS_DURATION = 1500; // ms max response time
const ITI_DURATION = 1000; // Inter-trial interval

let currentBlock = 1;
let currentTrial = 0;
let isPractice = false;
let isTestActive = false;
let canRespond = false;
let hasResponded = false;

let stimulusSequence = [];
let stimulusStartTime = 0;

// Data tracking
let trialData = {
    congruent: { correct: 0, errors: 0, reactionTimes: [] },
    incongruent: { correct: 0, errors: 0, reactionTimes: [] },
    neutral: { correct: 0, errors: 0, reactionTimes: [] }
};

let dataCollector = null;
let currentTimeout = null;

// Event Listeners
document.getElementById('startButton').addEventListener('click', startPractice);
document.addEventListener('keydown', handleKeyPress);

function startPractice() {
    isPractice = true;
    currentTrial = 0;
    isTestActive = true;

    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('practiceScreen').style.display = 'block';

    generateSequence(PRACTICE_TRIALS);
    
    setTimeout(() => {
        showNextTrial();
    }, 1000);
}

function startMainTest() {
    isPractice = false;
    currentBlock = 1;
    currentTrial = 0;
    isTestActive = true;

    // Reset data
    trialData = {
        congruent: { correct: 0, errors: 0, reactionTimes: [] },
        incongruent: { correct: 0, errors: 0, reactionTimes: [] },
        neutral: { correct: 0, errors: 0, reactionTimes: [] }
    };

    // Initialize data collector
    dataCollector = new GameDataCollector('flanker_task');

    document.getElementById('practiceScreen').style.display = 'none';
    document.getElementById('testScreen').style.display = 'block';
    document.getElementById('currentBlock').textContent = '1';
    document.getElementById('currentTrial').textContent = '0';

    generateSequence(TRIALS_PER_BLOCK * TOTAL_BLOCKS);

    setTimeout(() => {
        showNextTrial();
    }, 1000);
}

function generateSequence(numTrials) {
    stimulusSequence = [];
    
    // Generate balanced trials
    const trialsPerType = Math.floor(numTrials / 3);
    const types = [
        ...Array(trialsPerType).fill(TRIAL_TYPES.CONGRUENT),
        ...Array(trialsPerType).fill(TRIAL_TYPES.INCONGRUENT),
        ...Array(trialsPerType).fill(TRIAL_TYPES.NEUTRAL)
    ];
    
    // Add remaining trials
    while (types.length < numTrials) {
        types.push(TRIAL_TYPES.CONGRUENT);
    }
    
    // Shuffle and create trials
    shuffleArray(types);
    
    types.forEach(type => {
        const targetDirection = Math.random() < 0.5 ? DIRECTIONS.LEFT : DIRECTIONS.RIGHT;
        stimulusSequence.push(createStimulus(type, targetDirection));
    });
}

function createStimulus(type, targetDirection) {
    let flankerChar;
    
    if (type === TRIAL_TYPES.CONGRUENT) {
        flankerChar = ARROW_CHARS[targetDirection];
    } else if (type === TRIAL_TYPES.INCONGRUENT) {
        const oppositeDirection = targetDirection === DIRECTIONS.LEFT ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
        flankerChar = ARROW_CHARS[oppositeDirection];
    } else {
        flankerChar = ARROW_CHARS.neutral;
    }
    
    const targetChar = ARROW_CHARS[targetDirection];
    const display = `${flankerChar} ${flankerChar} ${targetChar} ${flankerChar} ${flankerChar}`;
    
    return {
        type: type,
        targetDirection: targetDirection,
        display: display,
        correctResponse: targetDirection === DIRECTIONS.LEFT ? 'ArrowLeft' : 'ArrowRight'
    };
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showNextTrial() {
    if (!isTestActive) return;

    const maxTrials = isPractice ? PRACTICE_TRIALS : (TRIALS_PER_BLOCK * TOTAL_BLOCKS);
    
    if (currentTrial >= maxTrials) {
        endTest();
        return;
    }

    const stimulus = stimulusSequence[currentTrial];
    const fixationElement = isPractice ? 
        document.getElementById('practiceFixation') : 
        document.getElementById('fixation');
    const stimulusElement = isPractice ? 
        document.getElementById('practiceStimulus') : 
        document.getElementById('stimulusDisplay');
    
    // Clear previous feedback
    if (isPractice) {
        document.getElementById('practiceFeedback').textContent = '';
    }

    // Show fixation
    fixationElement.style.display = 'block';
    stimulusElement.textContent = '';
    stimulusElement.classList.remove('show');
    hasResponded = false;
    canRespond = false;

    // Record trial start
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('trial_start', {
            trialNumber: currentTrial + 1,
            block: currentBlock,
            trialType: stimulus.type,
            targetDirection: stimulus.targetDirection
        });
    }

    // Hide fixation and show stimulus
    currentTimeout = setTimeout(() => {
        fixationElement.style.display = 'none';
        stimulusElement.textContent = stimulus.display;
        stimulusElement.classList.add('show');
        stimulusStartTime = Date.now();
        canRespond = true;

        if (!isPractice && dataCollector) {
            dataCollector.addDataPoint('stimulus_shown', {
                trialNumber: currentTrial + 1,
                display: stimulus.display
            });
        }

        // Auto-advance if no response
        currentTimeout = setTimeout(() => {
            if (!hasResponded) {
                processResponse(null, 0, stimulus);
                advanceToNextTrial();
            }
        }, STIMULUS_DURATION);
    }, FIXATION_DURATION);
}

function handleKeyPress(e) {
    if (!isTestActive || !canRespond || hasResponded) return;

    const key = e.code;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

    e.preventDefault();
    hasResponded = true;
    canRespond = false;

    const reactionTime = Date.now() - stimulusStartTime;
    const stimulus = stimulusSequence[currentTrial];
    
    processResponse(key, reactionTime, stimulus);
    
    clearTimeout(currentTimeout);
    advanceToNextTrial();
}

function processResponse(response, reactionTime, stimulus) {
    const isCorrect = response === stimulus.correctResponse;
    const type = stimulus.type;

    // Update data
    if (response !== null) {
        if (isCorrect) {
            trialData[type].correct++;
            trialData[type].reactionTimes.push(reactionTime);
        } else {
            trialData[type].errors++;
        }
    } else {
        // No response counts as error
        trialData[type].errors++;
    }

    // Record response
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('response', {
            trialNumber: currentTrial + 1,
            block: currentBlock,
            trialType: type,
            response: response,
            correctResponse: stimulus.correctResponse,
            isCorrect: isCorrect,
            reactionTime: reactionTime,
            noResponse: response === null
        });
    }

    // Show feedback in practice mode
    if (isPractice) {
        const feedbackElement = document.getElementById('practiceFeedback');
        if (response === null) {
            feedbackElement.textContent = 'Too slow! Please respond faster.';
            feedbackElement.className = 'feedback-message feedback-incorrect';
        } else if (isCorrect) {
            feedbackElement.textContent = `Correct! (${reactionTime}ms)`;
            feedbackElement.className = 'feedback-message feedback-correct';
        } else {
            const correctDir = stimulus.targetDirection === DIRECTIONS.LEFT ? 'Left' : 'Right';
            feedbackElement.textContent = `Incorrect. Center arrow pointed ${correctDir}.`;
            feedbackElement.className = 'feedback-message feedback-incorrect';
        }
    }
}

function advanceToNextTrial() {
    currentTrial++;
    
    if (!isPractice) {
        // Update trial counter and progress
        document.getElementById('currentTrial').textContent = currentTrial;
        
        // Update block number
        const newBlock = Math.ceil(currentTrial / TRIALS_PER_BLOCK);
        if (newBlock !== currentBlock && newBlock <= TOTAL_BLOCKS) {
            currentBlock = newBlock;
            document.getElementById('currentBlock').textContent = currentBlock;
        }
        
        // Update progress bar
        const progress = (currentTrial / (TRIALS_PER_BLOCK * TOTAL_BLOCKS)) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
    } else {
        document.getElementById('practiceTrialNum').textContent = currentTrial;
    }

    // Show next trial after ITI
    currentTimeout = setTimeout(() => {
        if (isPractice && currentTrial >= PRACTICE_TRIALS) {
            endPractice();
        } else {
            showNextTrial();
        }
    }, ITI_DURATION);
}

function endPractice() {
    isTestActive = false;
    document.getElementById('practiceFeedback').textContent = 'Practice complete! Starting main test...';
    document.getElementById('practiceFeedback').className = 'feedback-message feedback-correct';
    
    setTimeout(() => {
        startMainTest();
    }, 2000);
}

function endTest() {
    isTestActive = false;
    clearTimeout(currentTimeout);
    showResults();
}

function showResults() {
    document.getElementById('testScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';

    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

    let totalCorrect = 0;
    let totalErrors = 0;
    let allReactionTimes = [];

    // Calculate results for each trial type
    Object.keys(trialData).forEach(type => {
        const data = trialData[type];
        const total = data.correct + data.errors;
        const accuracy = total > 0 ? ((data.correct / total) * 100).toFixed(1) : '0.0';
        const avgRT = data.reactionTimes.length > 0 ?
            Math.round(data.reactionTimes.reduce((a, b) => a + b, 0) / data.reactionTimes.length) : 0;

        totalCorrect += data.correct;
        totalErrors += data.errors;
        allReactionTimes = allReactionTimes.concat(data.reactionTimes);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong></td>
            <td>${data.correct}</td>
            <td>${data.errors}</td>
            <td>${accuracy}%</td>
            <td>${avgRT > 0 ? avgRT : '-'}</td>
        `;
        resultsBody.appendChild(row);
    });

    // Add total row
    const totalTrials = totalCorrect + totalErrors;
    const totalAccuracy = totalTrials > 0 ? ((totalCorrect / totalTrials) * 100).toFixed(1) : '0.0';
    const totalAvgRT = allReactionTimes.length > 0 ?
        Math.round(allReactionTimes.reduce((a, b) => a + b, 0) / allReactionTimes.length) : 0;

    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${totalCorrect}</strong></td>
        <td><strong>${totalErrors}</strong></td>
        <td><strong>${totalAccuracy}%</strong></td>
        <td><strong>${totalAvgRT > 0 ? totalAvgRT : '-'}</strong></td>
    `;
    resultsBody.appendChild(totalRow);

    // Calculate Flanker Effect
    const congruentRT = trialData.congruent.reactionTimes.length > 0 ?
        trialData.congruent.reactionTimes.reduce((a, b) => a + b, 0) / trialData.congruent.reactionTimes.length : 0;
    const incongruentRT = trialData.incongruent.reactionTimes.length > 0 ?
        trialData.incongruent.reactionTimes.reduce((a, b) => a + b, 0) / trialData.incongruent.reactionTimes.length : 0;
    
    const flankerEffect = incongruentRT - congruentRT;
    const flankerEffectPercent = congruentRT > 0 ? ((flankerEffect / congruentRT) * 100).toFixed(1) : '0.0';

    document.getElementById('flankerEffect').innerHTML = `
        <h3>Flanker Effect Analysis</h3>
        <p><strong>Congruent Trials (Baseline):</strong> ${Math.round(congruentRT)}ms</p>
        <p><strong>Incongruent Trials:</strong> ${Math.round(incongruentRT)}ms</p>
        <p><strong>Flanker Interference Effect:</strong> +${Math.round(flankerEffect)}ms (${flankerEffectPercent}% slower)</p>
        <p>The flanker effect demonstrates the impact of distracting information on selective attention and response inhibition.</p>
    `;

    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.length > 0) {
        users[users.length - 1].results.flanker = {
            trialData: {
                congruent: {
                    ...trialData.congruent,
                    avgRT: Math.round(congruentRT)
                },
                incongruent: {
                    ...trialData.incongruent,
                    avgRT: Math.round(incongruentRT)
                },
                neutral: {
                    ...trialData.neutral,
                    avgRT: trialData.neutral.reactionTimes.length > 0 ?
                        Math.round(trialData.neutral.reactionTimes.reduce((a, b) => a + b, 0) / trialData.neutral.reactionTimes.length) : 0
                }
            },
            flankerEffect: Math.round(flankerEffect),
            totalAccuracy: totalAccuracy,
            totalAvgRT: totalAvgRT
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Save final data
    if (dataCollector) {
        dataCollector.saveData({
            summary: {
                totalCorrect: totalCorrect,
                totalErrors: totalErrors,
                totalAccuracy: totalAccuracy,
                totalAvgRT: totalAvgRT,
                flankerEffect: Math.round(flankerEffect)
            },
            trialTypeData: trialData
        });
    }

    // Navigation
    document.getElementById('goToAnotherTest').addEventListener('click', () => {
        const tests = [
            'finger_tapping/finger_tapping.html',
            'go_no_go/go_no_go.html',
            'pvt/pvt.html',
            'trail_making/trail_making.html',
            'n_back/n_back.html',
            'stroop/stroop.html',
            'flanker/flanker.html'
        ];
        let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
        completedTests.push('flanker/flanker.html');
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

