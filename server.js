const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory state
let statusState = {
    belt3: {
        logs: ["Server initialized."]
    },
    belt5: {
        ready: false,
        lastUpdated: new Date().toISOString(),
        logs: ["Server initialized."]
    }
};

// Belt 3 Matchmaking Database
let matches = {}; // username -> { partner, role, jobId, placeId, status: 'waiting' | 'matched', timestamp }
let matchQueue = []; // array of usernames waiting as hosts

// Helper function to add logs
function addLog(belt, message) {
    const timestamp = new Date().toLocaleTimeString();
    statusState[belt].logs.unshift(`[${timestamp}] ${message}`);
    if (statusState[belt].logs.length > 30) {
        statusState[belt].logs.pop();
    }
}

// ================= BELT 3 MATCHMAKING ENDPOINTS =================

// Request matchmaking
app.post('/api/belt3/match', (req, res) => {
    const { username, jobId, placeId } = req.body;
    if (!username || !jobId || !placeId) {
        return res.status(400).json({ error: "Missing required parameters: username, jobId, placeId" });
    }

    // 1. If already matched with someone, return matched state immediately
    if (matches[username] && matches[username].status === 'matched') {
        const match = matches[username];
        return res.json({
            status: 'matched',
            role: match.role,
            partner: match.partner,
            jobId: match.jobId,
            placeId: match.placeId
        });
    }

    // Clean up queue from duplicate or dead entries of the same username
    matchQueue = matchQueue.filter(u => u !== username);

    // 2. Search queue for an available host partner (who is not this user)
    let partner = null;
    while (matchQueue.length > 0) {
        const potentialPartner = matchQueue.shift();
        if (potentialPartner !== username && matches[potentialPartner] && matches[potentialPartner].status === 'waiting') {
            partner = potentialPartner;
            break;
        }
    }

    if (partner) {
        // Matched! The partner in the queue becomes the HOST. This user becomes the JOINER.
        const hostMatch = matches[partner];
        
        matches[username] = {
            partner: partner,
            role: 'joiner',
            jobId: hostMatch.jobId,
            placeId: hostMatch.placeId,
            status: 'matched',
            timestamp: Date.now()
        };

        hostMatch.status = 'matched';
        hostMatch.partner = username;
        hostMatch.timestamp = Date.now();

        addLog('belt3', `[P2P] Matched Host [${partner}] with Joiner [${username}] in server ${hostMatch.jobId}`);

        res.json({
            status: 'matched',
            role: 'joiner',
            partner: partner,
            jobId: hostMatch.jobId,
            placeId: hostMatch.placeId
        });
    } else {
        // No waiting partner found. Put this user in the queue as a HOST.
        matches[username] = {
            partner: null,
            role: 'host',
            jobId: jobId,
            placeId: placeId,
            status: 'waiting',
            timestamp: Date.now()
        };
        matchQueue.push(username);
        addLog('belt3', `[P2P] Host [${username}] waiting in matchmaking queue (server: ${jobId})`);

        res.json({
            status: 'waiting',
            role: 'host',
            message: 'Waiting for partner in matchmaking queue...'
        });
    }
});

// Poll status for a specific user (or check if trade partner available)
app.get('/api/belt3/status', (req, res) => {
    const { username } = req.query;

    // If no username provided, just check if matchmaking has capacity
    // Returns ready:true when there's at least 1 host OR this is the first acc
    if (!username) {
        return res.json({
            ready: true, // Always ready to enter matchmaking
            queueSize: matchQueue.length,
            matchedPairs: Math.floor(Object.keys(matches).length / 2)
        });
    }

    const match = matches[username];
    if (match) {
        return res.json({
            ready: true,
            status: match.status,
            role: match.role,
            partner: match.partner,
            jobId: match.jobId,
            placeId: match.placeId
        });
    }
    res.json({ ready: true, status: 'idle' });
});

// Complete trade / remove from matchmaking
app.post('/api/belt3/complete', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: "Missing required parameter: username" });
    }

    const match = matches[username];
    if (match) {
        const partner = match.partner;
        delete matches[username];
        if (partner) {
            delete matches[partner];
        }
        matchQueue = matchQueue.filter(u => u !== username && u !== partner);
        addLog('belt3', `[P2P] Match cleared for [${username}] and [${partner || 'none'}]. Completed.`);
        return res.json({ success: true });
    }
    res.json({ success: false, error: "User not found in active matches" });
});

// ================= BELT 5 P2P MATCHMAKING ENDPOINTS =================
let matchesBelt5 = {}; // username -> { partner, role, jobId, placeId, status: 'waiting' | 'matched', timestamp }
let matchQueueBelt5 = []; // array of usernames waiting as hosts

app.post('/api/belt5/match', (req, res) => {
    const { username, jobId, placeId } = req.body;
    if (!username || !jobId || !placeId) {
        return res.status(400).json({ error: "Missing required parameters: username, jobId, placeId" });
    }

    if (matchesBelt5[username] && matchesBelt5[username].status === 'matched') {
        const match = matchesBelt5[username];
        return res.json({
            status: 'matched',
            role: match.role,
            partner: match.partner,
            jobId: match.jobId,
            placeId: match.placeId
        });
    }

    matchQueueBelt5 = matchQueueBelt5.filter(u => u !== username);

    let partner = null;
    while (matchQueueBelt5.length > 0) {
        const potentialPartner = matchQueueBelt5.shift();
        if (potentialPartner !== username && matchesBelt5[potentialPartner] && matchesBelt5[potentialPartner].status === 'waiting') {
            partner = potentialPartner;
            break;
        }
    }

    if (partner) {
        const hostMatch = matchesBelt5[partner];
        
        matchesBelt5[username] = {
            partner: partner,
            role: 'joiner',
            jobId: hostMatch.jobId,
            placeId: hostMatch.placeId,
            status: 'matched',
            timestamp: Date.now()
        };

        hostMatch.status = 'matched';
        hostMatch.partner = username;
        hostMatch.timestamp = Date.now();

        addLog('belt5', `[P2P] Matched Host [${partner}] with Joiner [${username}] for Belt 5 in server ${hostMatch.jobId}`);

        res.json({
            status: 'matched',
            role: 'joiner',
            partner: partner,
            jobId: hostMatch.jobId,
            placeId: hostMatch.placeId
        });
    } else {
        matchesBelt5[username] = {
            partner: null,
            role: 'host',
            jobId: jobId,
            placeId: placeId,
            status: 'waiting',
            timestamp: Date.now()
        };
        matchQueueBelt5.push(username);
        addLog('belt5', `[P2P] Host [${username}] waiting in Belt 5 queue (server: ${jobId})`);

        res.json({
            status: 'waiting',
            role: 'host',
            message: 'Waiting for partner in Belt 5 matchmaking queue...'
        });
    }
});

app.get('/api/belt5/matchStatus', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.json({
            ready: true,
            queueSize: matchQueueBelt5.length,
            matchedPairs: Math.floor(Object.keys(matchesBelt5).length / 2)
        });
    }

    const match = matchesBelt5[username];
    if (match) {
        return res.json({
            ready: true,
            status: match.status,
            role: match.role,
            partner: match.partner,
            jobId: match.jobId,
            placeId: match.placeId
        });
    }
    res.json({ ready: true, status: 'idle' });
});

app.post('/api/belt5/complete', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: "Missing required parameter: username" });
    }

    const match = matchesBelt5[username];
    if (match) {
        const partner = match.partner;
        delete matchesBelt5[username];
        if (partner) {
            delete matchesBelt5[partner];
        }
        matchQueueBelt5 = matchQueueBelt5.filter(u => u !== username && u !== partner);
        addLog('belt5', `[P2P] Belt 5 complete for [${username}] and [${partner || 'none'}].`);
        return res.json({ success: true });
    }
    res.json({ success: false, error: "User not found in active matches" });
});

// Fetch full state for dashboard
app.get('/api/dashboard/state', (req, res) => {
    res.json({
        logs: statusState,
        queue: matchQueue,
        matches: matches,
        queueBelt5: matchQueueBelt5,
        matchesBelt5: matchesBelt5
    });
});

// Dashboard UI
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blox Fruits Dojo Belts - Coordinator Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0a0b10;
            --bg-card: rgba(18, 20, 32, 0.7);
            --bg-header: rgba(13, 15, 26, 0.8);
            --accent-purple: #8b5cf6;
            --accent-purple-glow: rgba(139, 92, 246, 0.4);
            --accent-blue: #3b82f6;
            --accent-blue-glow: rgba(59, 130, 246, 0.4);
            --color-ready: #10b981;
            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
            --border-color: rgba(255, 255, 255, 0.08);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 40%);
        }

        header {
            background-color: var(--bg-header);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-color);
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-title { display: flex; align-items: center; gap: 12px; }
        .logo-icon {
            width: 40px; height: 40px;
            background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 20px var(--accent-purple-glow);
            font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.25rem; color: #fff;
        }

        h1 {
            font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 700;
            background: linear-gradient(to right, #ffffff, #c084fc);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .system-status {
            display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--text-muted);
            background: rgba(255, 255, 255, 0.03); padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border-color);
        }

        .status-dot {
            width: 8px; height: 8px; background-color: var(--color-ready); border-radius: 50%;
            box-shadow: 0 0 8px var(--color-ready); animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        main {
            flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 2rem;
            display: flex; flex-direction: column; gap: 2rem;
        }

        .hero { text-align: center; }
        .hero h2 { font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem; }
        .hero p { color: var(--text-muted); font-size: 1rem; }

        .grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 2rem;
        }

        .card {
            background-color: var(--bg-card); backdrop-filter: blur(16px);
            border-radius: 24px; border: 1px solid var(--border-color);
            padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem;
            position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; }
        .card-belt3::before { background: linear-gradient(90deg, #f97316, #ea580c); }
        .card-belt5::before { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }

        .card-title { font-family: 'Outfit', sans-serif; font-size: 1.35rem; font-weight: 700; color: #fff; }
        .card-desc { color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; }

        .status-container {
            padding: 1rem; background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-color); border-radius: 16px;
        }

        .lobby-status {
            font-size: 0.9rem; margin-bottom: 8px; display: flex; justify-content: space-between;
        }

        .log-section { display: flex; flex-direction: column; gap: 8px; }
        .log-title { font-size: 0.8rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); }
        .log-box {
            background-color: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color);
            border-radius: 14px; padding: 1rem; height: 160px; overflow-y: auto;
            font-family: monospace; font-size: 0.75rem; line-height: 1.5;
            display: flex; flex-direction: column; gap: 6px;
        }

        .log-entry { color: var(--text-muted); }
        .log-entry:first-child { color: #fff; }

        footer { text-align: center; padding: 2rem; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.875rem; }
    </style>
</head>
<body>
    <header>
        <div class="header-title">
            <div class="logo-icon">D</div>
            <h1>Dojo Belts Coordinator</h1>
        </div>
        <div class="system-status">
            <div class="status-dot"></div>
            <span>API Online</span>
        </div>
    </header>

    <main>
        <div class="hero">
            <h2>Dojo Belts P2P Coordinator</h2>
            <p>Tự động ghép cặp (Matchmaking) 100-200 acc chính giao dịch chéo Đai 3.</p>
        </div>

        <div class="grid">
            <!-- Orange Belt (3) Card - Matchmaking Mode -->
            <div class="card card-belt3">
                <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #f97316;">Đai 3 - Cam</span>
                <h3 class="card-title">Orange Belt P2P Matchmaking</h3>
                <p class="card-desc">Tự động ghép đôi các acc chính với nhau. Khi hai acc sẵn sàng, một acc sẽ nhảy vào server của acc kia để trade.</p>
                
                <div class="status-container">
                    <div class="lobby-status">
                        <span>Đang đợi trong hàng chờ (Hosts):</span>
                        <strong id="queue-count">0</strong>
                    </div>
                    <div class="lobby-status">
                        <span>Tổng số acc đã ghép cặp:</span>
                        <strong id="matched-count">0</strong>
                    </div>
                </div>

                <div class="log-section">
                    <span class="log-title">Nhật ký ghép cặp & Giao dịch</span>
                    <div class="log-box" id="belt3-logs">
                        <div class="log-entry">Đang tải nhật ký...</div>
                    </div>
                </div>
            </div>

            <!-- Blue Belt (5) Card -->
            <div class="card card-belt5">
                <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #3b82f6;">Đai 5 - Xanh Dương</span>
                <h3 class="card-title">Blue Belt P2P Matchmaking</h3>
                <p class="card-desc">Tự động ghép đôi các acc để trao đổi/thả và nhặt trái ác quỷ chéo hoàn thành quest Saikeirei nhanh chóng.</p>
                
                <div class="status-container">
                    <div class="lobby-status">
                        <span>Đang đợi trong hàng chờ (Hosts):</span>
                        <strong id="belt5-queue-count">0</strong>
                    </div>
                    <div class="lobby-status">
                        <span>Tổng số acc đã ghép cặp:</span>
                        <strong id="belt5-matched-count">0</strong>
                    </div>
                </div>

                <div class="log-section">
                    <span class="log-title">Logs hoạt động</span>
                    <div class="log-box" id="belt5-logs">
                        <div class="log-entry">Đang tải nhật ký...</div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer>
        <p>&copy; 2026 Antigravity Blox Fruits P2P Matchmaker. All rights reserved.</p>
    </footer>

    <script>
        async function updateDashboard() {
            try {
                const response = await fetch('/api/dashboard/state');
                const data = await response.json();
                
                // Belt 3 (Matchmaking stats)
                document.getElementById('queue-count').innerText = data.queue.length;
                document.getElementById('matched-count').innerText = Object.keys(data.matches).length;
                
                const b3Logs = document.getElementById('belt3-logs');
                b3Logs.innerHTML = data.logs.belt3.logs.map(log => '<div class="log-entry">' + log + '</div>').join('');

                // Belt 5 (Matchmaking stats)
                document.getElementById('belt5-queue-count').innerText = data.queueBelt5 ? data.queueBelt5.length : 0;
                document.getElementById('belt5-matched-count').innerText = data.matchesBelt5 ? Object.keys(data.matchesBelt5).length : 0;
                
                const b5Logs = document.getElementById('belt5-logs');
                b5Logs.innerHTML = data.logs.belt5.logs.map(log => '<div class="log-entry">' + log + '</div>').join('');

            } catch (err) {
                console.error("Lỗi cập nhật dashboard:", err);
            }
        }

        setInterval(updateDashboard, 2000);
        updateDashboard();
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Coordinator server running on port ${PORT}`);
});
