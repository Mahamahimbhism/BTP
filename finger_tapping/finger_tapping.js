let tapCount = 0;
let testDuration = 30;
let timeLeft = testDuration;
let timerInterval;
let isTestRunning = false;
let isPracticeRound = false;
let practiceDuration = 5;
let dataCollector = null;
let videoRecorder = null;

// Initialize video recorder if it was started in test_list
document.addEventListener('DOMContentLoaded', async function () {
    if (sessionStorage.getItem('recordingStarted') === 'true') {
        videoRecorder = new VideoRecorder();
        await videoRecorder.setupCamera();
    }
});

document.getElementById('tapButton').addEventListener('click', startInitialTest);
document.addEventListener('keydown', handleKeyPress);

function startInitialTest() {
    document.getElementById('tapButton').textContent = "Preparing...";
    document.getElementById('tapButton').disabled = true;

    setTimeout(() => {
        startPracticeRound();
    }, 1000);
}

function startPracticeRound() {
    isPracticeRound = true;
    tapCount = 0;
    timeLeft = practiceDuration;
    isTestRunning = true;

    document.getElementById('tapCount').textContent = tapCount;
    document.getElementById('timeLeft').textContent = timeLeft;
    document.getElementById('practiceMessage').textContent = "Practice Round - Tap the SPACE BAR quickly!";
    document.getElementById('testScreen').style.display = 'block';

    startTimer();
}

function startMainTest() {
    isPracticeRound = false;
    tapCount = 0;
    timeLeft = testDuration;
    isTestRunning = true;

    // Initialize data collector for the main test
    dataCollector = new GameDataCollector('finger_tapping');

    document.getElementById('tapCount').textContent = tapCount;
    document.getElementById('timeLeft').textContent = timeLeft;
    document.getElementById('practiceMessage').textContent = "Real Test - Tap as fast as you can!";

    startTimer();
}

function handleKeyPress(e) {
    if (e.code === 'Space' && isTestRunning) {
        e.preventDefault();
        tapCount++;
        document.getElementById('tapCount').textContent = tapCount;

        // Record tap data if not in practice round
        if (!isPracticeRound && dataCollector) {
            dataCollector.addDataPoint('tap', {
                tapNumber: tapCount,
                timeLeft: timeLeft
            });
        }
    }
}

function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (isPracticeRound) {
                setTimeout(startMainTest, 1000);
            } else {
                endTest();
            }
        }
    }, 1000);
}

function endTest() {
    isTestRunning = false;
    document.getElementById('result').textContent = `Test Over! You tapped ${tapCount} times in 30 seconds.`;
    document.getElementById('goToAnotherTest').style.display = 'block';

    // Save final data and create JSON file
    if (dataCollector) {
        const finalStats = {
            totalTaps: tapCount,
            averageTapsPerSecond: (tapCount / testDuration).toFixed(2),
            testDuration: testDuration
        };
        dataCollector.saveData(finalStats);
    }

    // Save result to localStorage for user history
    const users = JSON.parse(localStorage.getItem('users'));
    if (users && users.length > 0) {
        users[users.length - 1].results.fingerTapping = tapCount;
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Redirect to another random test when "Go to Another Test" is clicked
    document.getElementById('goToAnotherTest').addEventListener('click', () => {
        const tests = [
            '../finger_tapping/finger_tapping.html',
            '../go_no_go/go_no_go.html',
            '../pvt/pvt.html',
            '../trail_making/trail_making.html'
        ];
        let completedTests = JSON.parse(sessionStorage.getItem('completedTests')) || [];
        completedTests.push('../finger_tapping/finger_tapping.html');
        sessionStorage.setItem('completedTests', JSON.stringify(completedTests));

        const availableTests = tests.filter(test => !completedTests.includes(test));
        if (availableTests.length > 0) {
            const randomTest = availableTests[Math.floor(Math.random() * availableTests.length)];
            location.href = randomTest;
        } else {
            sessionStorage.removeItem('completedTests');
            location.href = '../completion/completion.html';
        }
    });
}