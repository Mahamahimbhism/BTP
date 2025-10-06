// Data collection and storage utility
class GameDataCollector {
    constructor(gameName) {
        this.gameName = gameName;
        this.data = [];
        this.startTime = new Date();

        // Initialize or get session data
        this.sessionData = JSON.parse(sessionStorage.getItem('gameSessionData')) || {
            sessionStart: new Date().toISOString(),
            games: {}
        };
    }

    // Add a data point with current timestamp
    addDataPoint(action, details) {
        const dataPoint = {
            timestamp: new Date().toISOString(),
            action: action,
            details: details
        };
        this.data.push(dataPoint);
    }

    // Get the game number based on stored games
    getGameNumber() {
        const gameKeys = Object.keys(localStorage)
            .filter(key => key.startsWith(`game_${this.gameName}_`))
            .map(key => parseInt(key.split('_')[2]));

        return gameKeys.length > 0 ? Math.max(...gameKeys) + 1 : 1;
    }

    // Save the collected data to session storage
    saveData(additionalData = {}) {
        const finalData = {
            gameName: this.gameName,
            startTime: this.startTime.toISOString(),
            endTime: new Date().toISOString(),
            gameData: this.data,
            ...additionalData
        };

        // Add to session data
        this.sessionData.games[this.gameName] = finalData;
        sessionStorage.setItem('gameSessionData', JSON.stringify(this.sessionData));
    }

    // Static method to generate final session JSON
    static generateSessionJSON() {
        const sessionData = JSON.parse(sessionStorage.getItem('gameSessionData'));
        if (!sessionData) return;

        const finalData = {
            sessionStart: sessionData.sessionStart,
            sessionEnd: new Date().toISOString(),
            userInfo: JSON.parse(sessionStorage.getItem('currentUser')),
            games: sessionData.games
        };

        // Create and download JSON file
        const filename = `cognitive_test_session_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Clear session data after download
        sessionStorage.removeItem('gameSessionData');
    }

    // Helper function to download JSON file
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Export for use in other files
window.GameDataCollector = GameDataCollector;