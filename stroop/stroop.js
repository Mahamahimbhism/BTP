// Stroop Test Implementation
const COLORS = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
const COLOR_MAP = {
    'RED': '#e74c3c',
    'YELLOW': '#f39c12',
    'GREEN': '#27ae60',
    'BLUE': '#3498db'
};
const KEY_MAP = {
    'KeyR': 'RED',
    'KeyY': 'YELLOW',
    'KeyG': 'GREEN',
    'KeyB': 'BLUE'
};

const ITEMS_PER_BLOCK = 12; // 12 items as shown in the image
const PRACTICE_TRIALS = 5;
const REST_DURATION = 10; // seconds between blocks

const BLOCKS = [
    {
        name: 'Block 1: Word Reading',
        shortName: 'Word Reading',
        type: 'word',
        instruction: 'Read the word aloud and press the corresponding key',
        description: 'Color words in black ink'
    },
    {
        name: 'Block 2: Color Naming',
        shortName: 'Color Naming',
        type: 'color',
        instruction: 'Name the color of the squares and press the corresponding key',
        description: 'Colored squares'
    },
    {
        name: 'Block 3: Interference',
        shortName: 'Interference',
        type: 'interference',
        instruction: 'Name the INK COLOR (not the word) and press the corresponding key',
        description: 'Color words in mismatched ink'
    }
];

let currentBlock = 0;
let currentTrial = 0;
let isPractice = false;
let isTestActive = false;
let canRespond = false;

let stimulusSequence = [];
let blockStartTime = 0;
let trialStartTime = 0;
let blockResults = [];
let currentBlockData = {
    completionTime: 0,
    errors: 0,
    trialTimes: []
};

let dataCollector = null;
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
    document.getElementById('practiceBlockName').textContent = BLOCKS[0].shortName;
    document.getElementById('practiceInstruction').textContent = BLOCKS[0].instruction;

    generateSequence(PRACTICE_TRIALS, BLOCKS[0].type);
    
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

    // Initialize data collector
    dataCollector = new GameDataCollector(`stroop_${BLOCKS[blockIndex].type}`);

    document.getElementById('restScreen').style.display = 'none';
    document.getElementById('testScreen').style.display = 'block';
    document.getElementById('currentBlockName').textContent = BLOCKS[blockIndex].shortName;
    document.getElementById('blockInstruction').textContent = BLOCKS[blockIndex].instruction;
    document.getElementById('currentBlock').textContent = blockIndex + 1;
    document.getElementById('currentTrial').textContent = '0';
    document.getElementById('blockTimer').textContent = '0.0';

    generateSequence(ITEMS_PER_BLOCK, BLOCKS[blockIndex].type);

    setTimeout(() => {
        isTestActive = true;
        blockStartTime = Date.now();
        updateTimer();
        showNextStimulus();
    }, 1000);
}

function generateSequence(numItems, blockType) {
    stimulusSequence = [];
    
    for (let i = 0; i < numItems; i++) {
        const word = COLORS[i % COLORS.length]; // Cycle through colors
        let color, correctResponse;

        if (blockType === 'word') {
            // Block 1: Words in black
            color = 'black';
            correctResponse = word;
        } else if (blockType === 'color') {
            // Block 2: Colored squares
            color = COLORS[i % COLORS.length];
            correctResponse = color;
        } else {
            // Block 3: Interference - mismatched colors
            // Make sure color doesn't match word
            const availableColors = COLORS.filter(c => c !== word);
            color = availableColors[Math.floor(Math.random() * availableColors.length)];
            correctResponse = color; // Respond to ink color, not word
        }

        stimulusSequence.push({
            word: word,
            color: color,
            correctResponse: correctResponse,
            blockType: blockType
        });
    }

    // Shuffle the sequence for variety
    shuffleArray(stimulusSequence);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showNextStimulus() {
    if (!isTestActive) return;

    const maxTrials = isPractice ? PRACTICE_TRIALS : ITEMS_PER_BLOCK;
    
    if (currentTrial >= maxTrials) {
        endBlock();
        return;
    }

    const stimulus = stimulusSequence[currentTrial];
    const stimulusElement = isPractice ? 
        document.getElementById('practiceStimulus') : 
        document.getElementById('stimulusDisplay');
    
    // Show fixation cross briefly
    stimulusElement.textContent = '+';
    stimulusElement.style.color = '#2c3e50';
    stimulusElement.className = 'stimulus-display';
    canRespond = false;

    // Clear previous feedback
    if (isPractice) {
        document.getElementById('practiceFeedback').textContent = '';
    }

    // Record trial start
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('trial_start', {
            trialNumber: currentTrial + 1,
            word: stimulus.word,
            color: stimulus.color,
            correctResponse: stimulus.correctResponse,
            blockType: stimulus.blockType
        });
    }

    // Show stimulus after brief delay
    setTimeout(() => {
        if (stimulus.blockType === 'color') {
            // Show colored squares
            stimulusElement.textContent = '■ ■ ■';
            stimulusElement.style.color = COLOR_MAP[stimulus.color];
            stimulusElement.className = 'stimulus-display color-block';
        } else {
            // Show word
            stimulusElement.textContent = stimulus.word;
            stimulusElement.style.color = stimulus.color === 'black' ? 'black' : COLOR_MAP[stimulus.color];
            stimulusElement.className = 'stimulus-display word-block';
        }

        trialStartTime = Date.now();
        canRespond = true;

        if (!isPractice && dataCollector) {
            dataCollector.addDataPoint('stimulus_shown', {
                trialNumber: currentTrial + 1
            });
        }
    }, 500);
}

function handleKeyPress(e) {
    if (!isTestActive || !canRespond) return;

    const pressedKey = e.code;
    if (!KEY_MAP[pressedKey]) return;

    e.preventDefault();
    canRespond = false;

    const response = KEY_MAP[pressedKey];
    const reactionTime = Date.now() - trialStartTime;
    const stimulus = stimulusSequence[currentTrial];
    const isCorrect = response === stimulus.correctResponse;

    // Visual feedback on key press
    highlightKey(pressedKey);

    // Record response
    if (!isPractice && dataCollector) {
        dataCollector.addDataPoint('response', {
            trialNumber: currentTrial + 1,
            response: response,
            correctResponse: stimulus.correctResponse,
            isCorrect: isCorrect,
            reactionTime: reactionTime
        });
    }

    // Update block data
    currentBlockData.trialTimes.push(reactionTime);
    if (!isCorrect) {
        currentBlockData.errors++;
    }

    // Show feedback in practice mode
    if (isPractice) {
        const feedbackElement = document.getElementById('practiceFeedback');
        if (isCorrect) {
            feedbackElement.textContent = `Correct! (${reactionTime}ms)`;
            feedbackElement.className = 'feedback-message feedback-correct';
        } else {
            feedbackElement.textContent = `Incorrect. Expected: ${stimulus.correctResponse}`;
            feedbackElement.className = 'feedback-message feedback-incorrect';
        }
    }

    // Move to next trial
    currentTrial++;
    if (isPractice) {
        document.getElementById('practiceTrialNum').textContent = currentTrial;
    } else {
        document.getElementById('currentTrial').textContent = currentTrial;
    }

    // Show next stimulus after brief delay
    setTimeout(showNextStimulus, 1000);
}

function highlightKey(keyCode) {
    const keyButtons = document.querySelectorAll('.key-button');
    const keyIndex = Object.keys(KEY_MAP).indexOf(keyCode);
    
    if (keyIndex >= 0 && keyButtons[keyIndex]) {
        keyButtons[keyIndex].classList.add('active');
        setTimeout(() => {
            keyButtons[keyIndex].classList.remove('active');
        }, 200);
    }
}

function updateTimer() {
    if (!isTestActive || isPractice) return;

    const elapsed = (Date.now() - blockStartTime) / 1000;
    document.getElementById('blockTimer').textContent = elapsed.toFixed(1);

    requestAnimationFrame(updateTimer);
}

function resetBlockData() {
    currentBlockData = {
        completionTime: 0,
        errors: 0,
        trialTimes: []
    };
}

function endBlock() {
    isTestActive = false;

    if (isPractice) {
        // After practice, show message and start main test
        document.getElementById('practiceFeedback').textContent = 'Practice complete! Starting Block 1...';
        document.getElementById('practiceFeedback').className = 'feedback-message feedback-correct';
        
        setTimeout(() => {
            document.getElementById('practiceScreen').style.display = 'none';
            startMainTest(0);
        }, 2000);
    } else {
        // Calculate block statistics
        const completionTime = (Date.now() - blockStartTime) / 1000;
        const avgTimePerItem = currentBlockData.trialTimes.length > 0 ?
            Math.round(currentBlockData.trialTimes.reduce((a, b) => a + b, 0) / currentBlockData.trialTimes.length) : 0;
        const accuracy = ((ITEMS_PER_BLOCK - currentBlockData.errors) / ITEMS_PER_BLOCK * 100).toFixed(1);

        const blockResult = {
            blockName: BLOCKS[currentBlock].shortName,
            blockType: BLOCKS[currentBlock].type,
            completionTime: completionTime.toFixed(2),
            errors: currentBlockData.errors,
            accuracy: accuracy,
            avgTimePerItem: avgTimePerItem,
            allTrialTimes: currentBlockData.trialTimes
        };

        blockResults.push(blockResult);

        // Save block data
        if (dataCollector) {
            dataCollector.saveData({
                blockSummary: blockResult,
                totalTrials: ITEMS_PER_BLOCK
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

    // Populate results table
    blockResults.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${result.blockName}</strong></td>
            <td>${result.completionTime}s</td>
            <td>${result.errors}</td>
            <td>${result.accuracy}%</td>
            <td>${result.avgTimePerItem}ms</td>
        `;
        resultsBody.appendChild(row);
    });

    // Calculate Stroop Effect
    if (blockResults.length === 3) {
        const colorNamingTime = parseFloat(blockResults[1].completionTime);
        const interferenceTime = parseFloat(blockResults[2].completionTime);
        const stroopEffect = ((interferenceTime - colorNamingTime) / colorNamingTime * 100).toFixed(1);
        const interferenceSlowdown = (interferenceTime - colorNamingTime).toFixed(2);

        document.getElementById('stroopEffect').innerHTML = `
            <h3>Stroop Effect Analysis</h3>
            <p><strong>Control Condition (Color Naming):</strong> ${colorNamingTime}s</p>
            <p><strong>Interference Condition (Stroop):</strong> ${interferenceTime}s</p>
            <p><strong>Interference Effect:</strong> +${interferenceSlowdown}s (${stroopEffect}% slower)</p>
            <p>The Stroop effect demonstrates the automatic tendency to read words, which interferes with naming the ink color.</p>
        `;
    }

    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.length > 0) {
        users[users.length - 1].results.stroop = {
            blocks: blockResults,
            stroopEffect: blockResults.length === 3 ? 
                ((parseFloat(blockResults[2].completionTime) - parseFloat(blockResults[1].completionTime)) / parseFloat(blockResults[1].completionTime) * 100).toFixed(1) : 'N/A'
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Navigation
    document.getElementById('goToAnotherTest').addEventListener('click', () => {
        const tests = [
            'finger_tapping/finger_tapping.html',
            'go_no_go/go_no_go.html',
            'pvt/pvt.html',
            'trail_making/trail_making.html',
            'n_back/n_back.html',
            'stroop/stroop.html'
        ];
        let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
        completedTests.push('stroop/stroop.html');
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

