<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTarget.php';
include_once '../../models/GpsTargetMetric.php';
include_once '../../models/GpsTargetSource.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../services/TargetMeasurementService.php';
include_once '../../config/headers.php';
/**
 * Link an existing target to a financial measure, atomically (Sprint 007 Phase 6).
 *
 * POST { gps_target_id, metric_code, target_value, direction?, baseline_period_type,
 *        baseline_period_ref, target_period_type, target_period_ref,
 *        maintain_tolerance_value?, maintain_tolerance_unit?, note? }
 *
 * Upserts gps_target_metrics (period_total, via attach) and records a single manual provenance
 * row if none exists. Transactional; company access enforced on the target. Never touches metric_records.
 */
try {
    $db = (new Database())->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    if (!is_array($input)) $input = [];

    $authUser = auth_require_user($db);
    $targetId = (int)($input['gps_target_id'] ?? 0);
    if (!$targetId) throw new InvalidArgumentException('gps_target_id required');
    $targetRow = auth_require_target_access($db, $authUser, $targetId);
    $companyId = (int)$targetRow['company_id'];

    $code = trim((string)($input['metric_code'] ?? ''));
    if ($code === '') throw new InvalidArgumentException('metric_code required');
    if (!isset($input['target_value']) || $input['target_value'] === '') throw new InvalidArgumentException('target_value (goal) is required');

    $svc = new TargetMeasurementService($db);
    $mt = $svc->metricTypeByCode($code);
    if (!$mt) throw new InvalidArgumentException("Unknown measure '$code'");

    $direction = strtolower(trim((string)($input['direction'] ?? 'increase')));
    $baseType = (string)($input['baseline_period_type'] ?? '');
    $baseRef  = (string)($input['baseline_period_ref'] ?? '');
    $tgtType  = (string)($input['target_period_type'] ?? '');
    $tgtRef   = (string)($input['target_period_ref'] ?? '');
    foreach ([['baseline', $baseType, $baseRef], ['target', $tgtType, $tgtRef]] as [$name, $pt, $pr]) {
        $preview = $svc->measurePeriodForMetric($companyId, $pt, $pr, (int)$mt['id']);
        if (($preview['status'] ?? '') === 'invalid_period') {
            throw new InvalidArgumentException(ucfirst($name) . ' period is invalid: ' . ($preview['reason'] ?? 'unknown'));
        }
    }

    $db->beginTransaction();
    try {
        $metricPayload = [
            'gps_target_id' => $targetId,
            'metric_type_id' => (int)$mt['id'],
            'target_value' => $input['target_value'],
            'direction' => $direction,
            'calculation_method' => 'period_total',
            'baseline_period_type' => $baseType,
            'baseline_period_ref' => $baseRef,
            'target_period_type' => $tgtType,
            'target_period_ref' => $tgtRef,
        ];
        if ($direction === 'maintain') {
            $metricPayload['maintain_tolerance_value'] = $input['maintain_tolerance_value'] ?? null;
            $metricPayload['maintain_tolerance_unit'] = $input['maintain_tolerance_unit'] ?? null;
        }
        $metric = (new GpsTargetMetric($db))->attach($metricPayload);

        // Provenance: only add one manual source per target (avoid duplicates).
        $sourceModel = new GpsTargetSource($db);
        $existing = $db->prepare("SELECT id FROM gps_target_sources WHERE gps_target_id = ? AND source_type = 'manual' LIMIT 1");
        $existing->execute([$targetId]);
        $source = null;
        if (!$existing->fetchColumn()) {
            $note = trim((string)($input['note'] ?? ''));
            if ($note === '') $note = 'Financial measure ' . $mt['code'] . ' · target period ' . $tgtRef;
            $source = $sourceModel->link([
                'gps_target_id' => $targetId,
                'source_type' => 'manual',
                'notes' => $note,
            ]);
        }

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    echo json_encode([
        'target' => (new GpsTarget($db))->getById($targetId),
        'metric' => $metric,
        'source' => $source,
    ]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
