// Posner Cueing Task Implementation
const CUE_TYPES = {
    VALID: 'valid',
    INVALID: 'invalid',
    NEUTRAL: 'neutral'
};

const SIDES = {
    LEFT: 'left',
    RIGHT: 'right'
};

// Timing parameters (based on standard Posner task)
const STANDBY_MIN = 500; // ms
const STANDBY_MAX = 1000; // ms
const CUE_DURATION = 100; // ms
const CUE_TARGET_INTERVAL = 100; // ms (SOA - Stimulus Onset Asynchrony)
const TARGET_DURATION = 150; // ms max response time (or until response)
const MAX_RESPONSE_TIME = 1500; // ms
const ITI_DURATION = 1000; // Inter-trial interval

// Trial distribution
const TRIALS_PER_BLOCK = 40;
const PRACTICE_TRIALS = 12;
const TOTAL_BLOCKS = 3;
const VALID_PROBABILITY = 0.8; // 80% valid trials
const INVALID_PROBABILITY = 0.1; // 10% invalid trials
const NEUTRAL_PROBABILITY = 0.1; // 10% neutral trials

let currentBlock = 1;
let currentTrial = 0;
let isPractice = false;
let isTestActive = false;
let canRespond = false;
let hasResponded = false;

let stimulusSequence = [];
let trialStartTime = 0;

// Data tracking
let trialData = {
    valid: { correct: 0, errors: 0, reactionTimes: [] },
    invalid: { correct: 0, errors: 0, reactionTimes: [] },
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
        valid: { correct: 0, errors: 0, reactionTimes: [] },
        invalid: { correct: 0, errors: 0, reactionTimes: [] },
        neutral: { correct: 0, errors: 0, reactionTimes: [] }
    };

    // Initialize data collector
    dataCollector = new GameDataCollector('posner_cueing');

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
    
    for (let i = 0; i < numTrials; i++) {
        const rand = Math.random();
        let cueType;
        
        if (rand < VALID_PROBABILITY) {
            cueType = CUE_TYPES.VALID;
        } else if (rand < VALID_PROBABILITY + INVALID_PROBABILITY) {
            cueType = CUE_TYPES.INVALID;
        } else {
            cueType = CUE_TYPES.NEUTRAL;
        }
        
        const targetSide = Math.random() < 0.5 ? SIDES.LEFT : SIDES.RIGHT;
        
        stimulusSequence.push(createTrial(cueType, targetSide));
    }
}

function createTrial(cueType, targetSide) {
    let cueSide;
    
    if (cueType === CUE_TYPES.VALID) {
        // Cue on same side as target
        cueSide = targetSide;
    } else if (cueType === CUE_TYPES.INVALID) {
        // Cue on opposite side from target
        cueSide = targetSide === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
    } else {
        // Neutral: cue on both sides
        cueSide = 'both';
    }
    
    return {
        cueType: cueType,
        cueSide: cueSide,
        targetSide: targetSide,
        correctResponse: targetSide === SIDES.LEFT ? 'ArrowLeft' : 'ArrowRight'
    };
}

function showNextTrial() {
    if (!isTestActive) return;

    const maxTrials = isPractice ? PRACTICE_TRIALS : (TRIALS_PER_BLOCK * TOTAL_BLOCKS);
    
    if (currentTrial >= maxTrials) {
        endTest();
        return;
    }

    const trial = stimulusSequence[currentTrial];
    
    // Get elements based on practice/test mode
    const leftBox = isPractice ? document.getElementById('practiceLeftBox') : document.getElementById('leftBox');
    const rightBox = isPractice ? document.getElementById('practiceRightBox') : document.getElementById('rightBox');
    const leftCue = isPractice ? document.getElementById('practiceLeftCue') : document.getElementById('leftCue');
    const rightCue = isPractice ? document.getElementById('practiceRightCue') : document.getElementById('rightCue');
    const leftTarget = isPractice ? document.getElementById('practiceLeftTarget') : document.getElementById('leftTarget');
    const rightTarget = isPractice ? document.getElementById('practiceRightTarget') : document.getElementById('rightTarget');
    
    // Clear previous feedback
    if (isPractice) {
        document.getElementById('practiceFeedback').textContent = '';
    }

    // Reset displays
    leftCue.classList.remove('show');
    rightCue.classList.remove('show');
    leftTarget.classList.remove('show');
    rightTarget.classList.remove('show');
    leftBox.classList.remove('cued');
    rightBox.classList.remove('cued');
    
    hasResponded = false;
    canRespond = false;

    // Record trial start
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('trial_start', {
            trialNumber: currentTrial + 1,
            block: currentBlock,
            cueType: trial.cueType,
            cueSide: trial.cueSide,
            targetSide: trial.targetSide
        });
    }

    // Standby period with fixation
    const standbyDuration = STANDBY_MIN + Math.random() * (STANDBY_MAX - STANDBY_MIN);
    
    currentTimeout = setTimeout(() => {
        // Show cue
        if (trial.cueSide === 'both') {
            leftCue.classList.add('show');
            rightCue.classList.add('show');
            leftBox.classList.add('cued');
            rightBox.classList.add('cued');
        } else if (trial.cueSide === SIDES.LEFT) {
            leftCue.classList.add('show');
            leftBox.classList.add('cued');
        } else {
            rightCue.classList.add('show');
            rightBox.classList.add('cued');
        }

        if (!isPractice && dataCollector) {
            dataCollector.addDataPoint('cue_shown', {
                trialNumber: currentTrial + 1,
                cueSide: trial.cueSide
            });
        }

        // Hide cue after duration
        currentTimeout = setTimeout(() => {
            leftCue.classList.remove('show');
            rightCue.classList.remove('show');
            leftBox.classList.remove('cued');
            rightBox.classList.remove('cued');

            // Show target after interval
            currentTimeout = setTimeout(() => {
                if (trial.targetSide === SIDES.LEFT) {
                    leftTarget.classList.add('show');
                } else {
                    rightTarget.classList.add('show');
                }

                trialStartTime = Date.now();
                canRespond = true;

                if (!isPractice && dataCollector) {
                    dataCollector.addDataPoint('target_shown', {
                        trialNumber: currentTrial + 1,
                        targetSide: trial.targetSide
                    });
                }

                // Auto-advance if no response
                currentTimeout = setTimeout(() => {
                    if (!hasResponded) {
                        processResponse(null, 0, trial);
                        advanceToNextTrial();
                    }
                }, MAX_RESPONSE_TIME);
            }, CUE_TARGET_INTERVAL);
        }, CUE_DURATION);
    }, standbyDuration);
}

function handleKeyPress(e) {
    if (!isTestActive || !canRespond || hasResponded) return;

    const key = e.code;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

    e.preventDefault();
    hasResponded = true;
    canRespond = false;

    const reactionTime = Date.now() - trialStartTime;
    const trial = stimulusSequence[currentTrial];
    
    processResponse(key, reactionTime, trial);
    
    clearTimeout(currentTimeout);
    advanceToNextTrial();
}

function processResponse(response, reactionTime, trial) {
    const isCorrect = response === trial.correctResponse;
    const cueType = trial.cueType;

    // Update data
    if (response !== null) {
        if (isCorrect) {
            trialData[cueType].correct++;
            trialData[cueType].reactionTimes.push(reactionTime);
        } else {
            trialData[cueType].errors++;
        }
    } else {
        // No response counts as error
        trialData[cueType].errors++;
    }

    // Record response
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('response', {
            trialNumber: currentTrial + 1,
            block: currentBlock,
            cueType: cueType,
            response: response,
            correctResponse: trial.correctResponse,
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
            const cueInfo = cueType === CUE_TYPES.VALID ? 'Valid cue' : 
                           cueType === CUE_TYPES.INVALID ? 'Invalid cue' : 'Neutral cue';
            feedbackElement.textContent = `Correct! (${reactionTime}ms) - ${cueInfo}`;
            feedbackElement.className = 'feedback-message feedback-correct';
        } else {
            const correctSide = trial.targetSide === SIDES.LEFT ? 'Left' : 'Right';
            feedbackElement.textContent = `Incorrect. Target was on the ${correctSide}.`;
            feedbackElement.className = 'feedback-message feedback-incorrect';
        }
    }
}

function advanceToNextTrial() {
    // Hide targets
    const leftTarget = isPractice ? document.getElementById('practiceLeftTarget') : document.getElementById('leftTarget');
    const rightTarget = isPractice ? document.getElementById('practiceRightTarget') : document.getElementById('rightTarget');
    const leftBox = isPractice ? document.getElementById('practiceLeftBox') : document.getElementById('leftBox');
    const rightBox = isPractice ? document.getElementById('practiceRightBox') : document.getElementById('rightBox');
    
    leftTarget.classList.remove('show');
    rightTarget.classList.remove('show');
    leftBox.classList.remove('cued');
    rightBox.classList.remove('cued');

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

    // Calculate results for each cue type
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
            <td><strong>${type.charAt(0).toUpperCase() + type.slice(1)} Cue</strong></td>
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

    // Calculate Cueing Effects
    const validRT = trialData.valid.reactionTimes.length > 0 ?
        trialData.valid.reactionTimes.reduce((a, b) => a + b, 0) / trialData.valid.reactionTimes.length : 0;
    const invalidRT = trialData.invalid.reactionTimes.length > 0 ?
        trialData.invalid.reactionTimes.reduce((a, b) => a + b, 0) / trialData.invalid.reactionTimes.length : 0;
    const neutralRT = trialData.neutral.reactionTimes.length > 0 ?
        trialData.neutral.reactionTimes.reduce((a, b) => a + b, 0) / trialData.neutral.reactionTimes.length : 0;
    
    const cuingBenefit = neutralRT - validRT; // How much faster valid vs neutral
    const cuingCost = invalidRT - neutralRT; // How much slower invalid vs neutral
    const totalCuingEffect = invalidRT - validRT; // Total difference

    document.getElementById('cuingEffect').innerHTML = `
        <h3>Cueing Effect Analysis</h3>
        <p><strong>Valid Cue Trials:</strong> ${Math.round(validRT)}ms</p>
        <p><strong>Neutral Cue Trials (Baseline):</strong> ${Math.round(neutralRT)}ms</p>
        <p><strong>Invalid Cue Trials:</strong> ${Math.round(invalidRT)}ms</p>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #dee2e6;">
        <p class="benefit"><strong>Cueing Benefit (Neutral - Valid):</strong> ${Math.round(cuingBenefit)}ms</p>
        <p class="cost"><strong>Cueing Cost (Invalid - Neutral):</strong> +${Math.round(cuingCost)}ms</p>
        <p><strong>Total Cueing Effect (Invalid - Valid):</strong> ${Math.round(totalCuingEffect)}ms</p>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #dee2e6;">
        <p style="font-size: 0.95em; line-height: 1.6;">The cueing benefit shows faster responses when attention is pre-oriented to the correct location. The cueing cost shows the time penalty for reorienting attention from an incorrect location.</p>
    `;

    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.length > 0) {
        users[users.length - 1].results.posner = {
            trialData: {
                valid: {
                    ...trialData.valid,
                    avgRT: Math.round(validRT)
                },
                invalid: {
                    ...trialData.invalid,
                    avgRT: Math.round(invalidRT)
                },
                neutral: {
                    ...trialData.neutral,
                    avgRT: Math.round(neutralRT)
                }
            },
            cuingBenefit: Math.round(cuingBenefit),
            cuingCost: Math.round(cuingCost),
            totalCuingEffect: Math.round(totalCuingEffect),
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
                cuingBenefit: Math.round(cuingBenefit),
                cuingCost: Math.round(cuingCost),
                totalCuingEffect: Math.round(totalCuingEffect)
            },
            cueTypeData: trialData
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
            'flanker/flanker.html',
            'posner/posner.html'
        ];
        let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
        completedTests.push('posner/posner.html');
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

