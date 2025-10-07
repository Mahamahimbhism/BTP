document.addEventListener('DOMContentLoaded', async function() {
    // Stop video recording if it was started
    if (sessionStorage.getItem('recordingStarted') === 'true') {
        const videoRecorder = new VideoRecorder();
        if (videoRecorder) {
            await videoRecorder.stopRecording(`cognitive_test_session_${new Date().toISOString().split('T')[0]}`);
            videoRecorder.stopCamera();
            sessionStorage.removeItem('recordingStarted');
        }
    }

    // Generate final JSON file when reaching completion page
    if (window.GameDataCollector) {
        GameDataCollector.generateSessionJSON();
    }

    // View Results Button
    const viewResultsBtn = document.getElementById('viewResults');
    const resultsContainer = document.getElementById('resultsContainer');
    
    viewResultsBtn.addEventListener('click', function() {
        // Get current user data
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        if (currentUser) {
            // Toggle results display
            if (resultsContainer.style.display === 'none' || !resultsContainer.style.display) {
                // Populate results table
                const tbody = document.querySelector('.results-table tbody');
                tbody.innerHTML = `
                    <tr>
                        <td>Finger Tapping</td>
                        <td>${currentUser.results.fingerTapping || 'Not completed'}</td>
                    </tr>
                    <tr>
                        <td>Go/No-Go</td>
                        <td>${currentUser.results.goNoGo || 'Not completed'}</td>
                    </tr>
                    <tr>
                        <td>PVT</td>
                        <td>${currentUser.results.pvt || 'Not completed'}</td>
                    </tr>
                    <tr>
                        <td>Trail Making</td>
                        <td>${currentUser.results.trailMaking || 'Not completed'}</td>
                    </tr>
                `;
                resultsContainer.style.display = 'block';
                viewResultsBtn.textContent = 'Hide Results';
            } else {
                resultsContainer.style.display = 'none';
                viewResultsBtn.textContent = 'View My Results';
            }
        } else {
            alert('No user data found. Please start a new session.');
        }
    });

    // Save results to Google Sheets (replace with your actual Google Script URL)
    function saveToGoogleSheets(userData) {
        /*
        To implement Google Sheets integration:
        1. Create a Google Apps Script web app
        2. Replace the URL below with your published web app URL
        3. Uncomment the code below
        
        const scriptUrl = 'YOUR_GOOGLE_SCRIPT_URL';
        fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(userData)
        }).catch(err => console.log('Error saving to Google Sheets:', err));
        */

        // For now, we'll just log the data
        console.log('Data to be saved to Google Sheets:', userData);
    }

    // Try to save current user's results to Google Sheets
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser) {
        saveToGoogleSheets(currentUser);
    }

    // Download all results (from localStorage)
    document.getElementById('downloadResults').addEventListener('click', function() {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.length === 0) {
            alert('No results found.');
            return;
        }

        const XLSX = window.XLSX;
        const data = users.map(user => [
            user.name || '',
            user.email || '',
            user.age || '',
            user.results.fingerTapping || '',
            user.results.goNoGo || '',
            user.results.pvt || '',
            user.results.trailMaking || ''
        ]);

        const ws = XLSX.utils.aoa_to_sheet([
            ['Name', 'Email', 'Age', 'Finger Tapping', 'Go/No-Go', 'PVT', 'Trail Making'],
            ...data
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Results');
        XLSX.writeFile(wb, 'Cognitive_Test_Results.xlsx');
    });
});