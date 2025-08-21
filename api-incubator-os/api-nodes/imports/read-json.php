<?php
declare(strict_types=1);

function load_json_rows(string $filename): array {
    $path = __DIR__ . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path) || !is_readable($path)) {
        throw new RuntimeException("JSON file not found: {$filename}");
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException("Invalid JSON in {$filename}: " . json_last_error_msg());
    }
    if (!is_array($data)) return [];
    return $data;
}
