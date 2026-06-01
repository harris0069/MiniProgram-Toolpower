<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$flags = [
    'link_parse' => false,
    'link_parse_message' => '功能优化中，敬请期待',
];

echo json_encode(['success' => true, 'flags' => $flags]);
