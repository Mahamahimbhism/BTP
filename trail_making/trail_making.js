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

// DOM Elements
const elements = {
    welcomeScreen: document.getElementById('welcomeScreen'),
    round1InstructionScreen: document.getElementById('round1InstructionScreen'),
    round1PracticeScreen: document.getElementById('round1PracticeScreen'),
    round1TestScreen: document.getElementById('round1TestScreen'),
    round1CompleteScreen: document.getElementById('round1CompleteScreen'),
    round2InstructionScreen: document.getElementById('round2InstructionScreen'),
    round2PracticeScreen: document.getElementById('round2PracticeScreen'),
    round2TestScreen: document.getElementById('round2TestScreen'),
    finalResultsScreen: document.getElementById('finalResultsScreen'),
    startButton: document.getElementById('startButton'),
    round1StartButton: document.getElementById('round1StartButton'),
    round1PracticeCompleteButton: document.getElementById('round1PracticeCompleteButton'),
    proceedToRound2Button: document.getElementById('proceedToRound2Button'),
    round2StartButton: document.getElementById('round2StartButton'),
    round2PracticeCompleteButton: document.getElementById('round2PracticeCompleteButton'),
    goToAnotherTest: document.getElementById('goToAnotherTest'),
    trailContainer: document.getElementById('trailContainer'),
    practiceTrailContainer: document.getElementById('practiceTrailContainer'),
    round2PracticeTrailContainer: document.getElementById('round2PracticeTrailContainer'),
    round2TrailContainer: document.getElementById('round2TrailContainer'),
    timeDisplay: document.getElementById('time'),
    round2TimeDisplay: document.getElementById('round2Time'),
    round1Result: document.getElementById('round1Result'),
    finalResults: document.getElementById('finalResults'),
    practiceFeedback: document.getElementById('practiceFeedback'),
    round2PracticeFeedback: document.getElementById('round2PracticeFeedback')
};

// Event Listeners
elements.startButton.addEventListener('click', () => {
    elements.welcomeScreen.style.display = 'none';
    elements.round1InstructionScreen.style.display = 'block';
});

elements.round1StartButton.addEventListener('click', startRound1Practice);
elements.round1PracticeCompleteButton.addEventListener('click', startRound1Test);
elements.proceedToRound2Button.addEventListener('click', showRound2Instructions);
elements.round2StartButton.addEventListener('click', startRound2Practice);
elements.round2PracticeCompleteButton.addEventListener('click', startRound2Test);
elements.goToAnotherTest.addEventListener('click', goToAnotherTest);

function generateNumbers(round) {
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
            if (i <= 12) { // Only need up to L (12th letter)
                numbers.push({ value: String.fromCharCode(64 + i), type: 'letter' });
            }
        }
    }

    // Shuffle but keep the first item (1) in place for the start
    const first = numbers.shift();
    numbers.sort(() => Math.random() - 0.5);
    numbers.unshift(first);
}

function displayNumbers(container, isPractice = false) {
    container.innerHTML = "";
    numbers.forEach((item) => {
        const numberDiv = document.createElement('div');
        numberDiv.textContent = item.value;
        numberDiv.addEventListener('click', () => handleNumberClick(item, container, isPractice));
        container.appendChild(numberDiv);
    });
}

function handleNumberClick(item, container, isPractice) {
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
        // Correct move
        numberDivs[index].classList.add('clicked');
        if (isPractice) {
            if (currentRound === 1) {
                elements.practiceFeedback.textContent = "Correct! Click the next number.";
                elements.practiceFeedback.className = "correct-feedback";
            } else {
                elements.round2PracticeFeedback.textContent = "Correct! Continue the sequence.";
                elements.round2PracticeFeedback.className = "correct-feedback";
            }
        } else {
            correctMoves++;
        }
        currentNumber++;

        const totalItems = currentRound === 1 ? 25 : 25; // 13 numbers + 12 letters

        if (currentNumber > totalItems) {
            if (!isPractice) {
                endTest();
            } else {
                if (currentRound === 1) {
                    elements.practiceFeedback.textContent = "Practice complete! You've reached the end.";
                } else {
                    elements.round2PracticeFeedback.textContent = "Practice complete! You've reached the end.";
                }
                currentNumber = 1;
                generateNumbers(currentRound);
                displayNumbers(container, isPractice);
            }
        }
    } else if (isPractice) {
        // Wrong move (only in practice)
        numberDivs[index].classList.add('wrong');
        if (currentRound === 1) {
            elements.practiceFeedback.textContent = "Wrong! Try again.";
            elements.practiceFeedback.className = "wrong-feedback";
        } else {
            elements.round2PracticeFeedback.textContent = "Wrong! Try again.";
            elements.round2PracticeFeedback.className = "wrong-feedback";
        }
    }

    if (!isPractice) {
        totalMoves++;
    }
}

function startRound1Practice() {
    elements.round1InstructionScreen.style.display = 'none';
    elements.round1PracticeScreen.style.display = 'block';
    currentRound = 1;
    currentNumber = 1;
    generateNumbers(1);
    displayNumbers(elements.practiceTrailContainer, true);
    elements.practiceFeedback.textContent = "";
}

function startRound1Test() {
    elements.round1PracticeScreen.style.display = 'none';
    elements.round1TestScreen.style.display = 'block';
    currentNumber = 1;
    correctMoves = 0;
    wrongMoves = 0;
    totalMoves = 0;
    isTestRunning = true;

    // Initialize data collector for round 1
    dataCollector = new GameDataCollector('trail_making_round_1');

    generateNumbers(1);
    displayNumbers(elements.trailContainer);
    startTime = Date.now();
    startTimer(elements.timeDisplay);
}

function startRound2Practice() {
    elements.round2InstructionScreen.style.display = 'none';
    elements.round2PracticeScreen.style.display = 'block';
    currentRound = 2;
    currentNumber = 1;
    generateNumbers(2);
    displayNumbers(elements.round2PracticeTrailContainer, true);
    elements.round2PracticeFeedback.textContent = "";
}

function startRound2Test() {
    elements.round2PracticeScreen.style.display = 'none';
    elements.round2TestScreen.style.display = 'block';
    currentNumber = 1;
    correctMoves = 0;
    wrongMoves = 0;
    totalMoves = 0;
    isTestRunning = true;

    // Initialize data collector for round 2
    dataCollector = new GameDataCollector('trail_making_round_2');

    generateNumbers(2);
    displayNumbers(elements.round2TrailContainer);
    startTime = Date.now();
    startTimer(elements.round2TimeDisplay);
}

function startTimer(timeElement) {
    clearInterval(timerInterval);
    timeElement.textContent = 0;

    timerInterval = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        timeElement.textContent = elapsedTime;
    }, 1000);
}

function endTest() {
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

        // Save round 1 data
        if (dataCollector) {
            dataCollector.saveData({
                roundSummary: round1Results,
                accuracy: ((correctMoves / totalMoves) * 100).toFixed(2),
                averageTimePerMove: (elapsedTime / correctMoves).toFixed(2)
            });
        }

        showRound1Results();
    } else {
        round2Time = elapsedTime;
        const round2Results = {
            time: elapsedTime,
            totalMoves: totalMoves,
            correctMoves: correctMoves,
            wrongMoves: totalMoves - correctMoves
        };

        // Save round 2 data
        if (dataCollector) {
            dataCollector.saveData({
                roundSummary: round2Results,
                accuracy: ((correctMoves / totalMoves) * 100).toFixed(2),
                averageTimePerMove: (elapsedTime / correctMoves).toFixed(2),
                totalTestTime: round1Time + elapsedTime
            });
        }

        showFinalResults();
    }
}

function showRound1Results() {
    elements.round1TestScreen.style.display = 'none';
    elements.round1CompleteScreen.style.display = 'block';

    elements.round1Result.innerHTML = `
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
    `;
}

function showRound2Instructions() {
    elements.round1CompleteScreen.style.display = 'none';
    elements.round2InstructionScreen.style.display = 'block';
}

function showFinalResults() {
    elements.round2TestScreen.style.display = 'none';
    elements.finalResultsScreen.style.display = 'block';

    const round2Results = {
        time: round2Time,
        totalMoves: totalMoves,
        correctMoves: correctMoves,
        wrongMoves: totalMoves - correctMoves
    };

    elements.finalResults.innerHTML = `
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

    // Save results to localStorage
    const users = JSON.parse(localStorage.getItem('users'));
    if (users && users.length > 0) {
        users[users.length - 1].results.trailMaking = {
            round1: round1Results,
            round2: round2Results,
            totalTime: round1Results.time + round2Results.time,
            totalCorrect: round1Results.correctMoves + round2Results.correctMoves,
            totalWrong: round1Results.wrongMoves + round2Results.wrongMoves
        };
        localStorage.setItem('users', JSON.stringify(users));
    }
}

function goToAnotherTest() {
    const tests = ['finger_tapping.html', 'go_no_go.html'/*, 'conners_cpt.html'*/, 'pvt.html', 'trail_making.html'];
    let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
    completedTests.push('trail_making.html');
    sessionStorage.setItem('completedTests', JSON.stringify(completedTests));

    const availableTests = tests.filter(test => !completedTests.includes(test));
    if (availableTests.length > 0) {
        const randomTest = availableTests[Math.floor(Math.random() * availableTests.length)];
        location.href = randomTest;
    } else {
        sessionStorage.removeItem('completedTests');
        location.href = 'completion.html';
    }
}