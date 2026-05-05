<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// File-based storage (no database needed)
$dataFile = __DIR__ . '/../data/dlp_data.json';
$usersFile = __DIR__ . '/../data/dlp_users.json';

// Ensure data directory exists
if (!is_dir(__DIR__ . '/../data')) {
    mkdir(__DIR__ . '/../data', 0755, true);
}

// Initialize files if they don't exist
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([]));
}
if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode([]));
}

// Get action from request
$action = $_GET['action'] ?? '';

switch($action) {
    case 'get_logs':
        // Return all logs
        $logs = json_decode(file_get_contents($dataFile), true) ?: [];
        
        // Apply limit if specified
        if (isset($_GET['limit'])) {
            $limit = intval($_GET['limit']);
            $logs = array_slice($logs, 0, $limit);
        }
        
        echo json_encode(['success' => true, 'data' => $logs]);
        break;
        
    case 'get_users':
        // Return all users
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        echo json_encode(['success' => true, 'data' => $users]);
        break;
        
    case 'get_stats':
        // Get today's statistics
        $logs = json_decode(file_get_contents($dataFile), true) ?: [];
        $today = date('Y-m-d');
        
        $todayLogs = array_filter($logs, function($log) use ($today) {
            $logDate = date('Y-m-d', strtotime($log['timestamp'] ?? 'now'));
            return $logDate === $today;
        });
        
        $blockedToday = 0;
        $allowedToday = 0;
        $pciToday = 0;
        
        foreach ($todayLogs as $log) {
            if (($log['status'] ?? '') === 'blocked') $blockedToday++;
            else $allowedToday++;
            if (($log['hasSensitiveData'] ?? false)) $pciToday++;
        }
        
        $uniqueUsers = [];
        foreach ($todayLogs as $log) {
            $uniqueUsers[$log['username'] ?? 'unknown'] = true;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'blocked_today' => $blockedToday,
                'allowed_today' => $allowedToday,
                'active_users' => count($uniqueUsers),
                'pci_violations' => $pciToday
            ]
        ]);
        break;
        
    case 'report_upload':
        // Receive upload report from extension
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
            exit;
        }
        
        // Get client IP
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        
        // Create log entry
        $logEntry = [
            'id' => uniqid(),
            'username' => $input['username'] ?? 'unknown',
            'ip' => $ip,
            'filename' => $input['filename'] ?? 'unknown',
            'size' => floatval($input['size'] ?? 0),
            'domain' => $input['domain'] ?? 'unknown',
            'status' => $input['status'] ?? 'allowed',
            'reason' => $input['reason'] ?? '-',
            'risk_score' => intval($input['risk_score'] ?? 50),
            'hasSensitiveData' => boolval($input['has_sensitive_data'] ?? false),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        // Save to logs file
        $logs = json_decode(file_get_contents($dataFile), true) ?: [];
        array_unshift($logs, $logEntry); // Add to beginning
        $logs = array_slice($logs, 0, 1000); // Keep last 1000 entries
        file_put_contents($dataFile, json_encode($logs, JSON_PRETTY_PRINT));
        
        // Update user data
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        $username = $logEntry['username'];
        
        if (!isset($users[$username])) {
            $users[$username] = [
                'username' => $username,
                'email' => $input['email'] ?? "{$username}@company.com",
                'ip' => $ip,
                'risk_score' => 0,
                'block_count' => 0,
                'pci_violations' => 0,
                'last_seen' => $logEntry['timestamp'],
                'extension_installed' => true
            ];
        }
        
        // Update user stats
        if ($logEntry['status'] === 'blocked') $users[$username]['block_count']++;
        if ($logEntry['hasSensitiveData']) $users[$username]['pci_violations']++;
        $users[$username]['last_seen'] = $logEntry['timestamp'];
        $users[$username]['ip'] = $ip;
        
        // Calculate new risk score
        $users[$username]['risk_score'] = min(100, 
            ($users[$username]['block_count'] * 5) + 
            ($users[$username]['pci_violations'] * 15)
        );
        
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        
        echo json_encode(['success' => true, 'message' => 'Upload reported successfully']);
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action: ' . $action]);
}
?>
