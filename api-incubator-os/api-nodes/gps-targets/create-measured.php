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
 * Create a target from a financial measure, atomically (Sprint 007 Phase 6).
 *
 * POST { company_id, metric_code, target_value, direction?, category?, title?, description?,
 *        priority?, due_date?, owner_label?, baseline_period_type, baseline_period_ref,
 *        target_period_type, target_period_ref, maintain_tolerance_value?, maintain_tolerance_unit?, note? }
 *
 * Creates gps_targets + gps_target_metrics (period_total) + gps_target_sources (source_type='manual')
 * in one transaction. The measure is resolved by code; periods are validated via the measurement
 * service. Read-only for financial data — never touches metric_records.
 */
try {
    $db = (new Database())->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    if (!is_array($input)) $input = [];

    $authUser = auth_require_user($db);
    $companyId = (int)($input['company_id'] ?? 0);
    if (!$companyId) throw new InvalidArgumentException('company_id required');
    auth_require_company_access($authUser, $companyId);

    $code = trim((string)($input['metric_code'] ?? ''));
    if ($code === '') throw new InvalidArgumentException('metric_code required');
    if (!isset($input['target_value']) || $input['target_value'] === '') throw new InvalidArgumentException('target_value (goal) is required');

    $svc = new TargetMeasurementService($db);
    $mt = $svc->metricTypeByCode($code);
    if (!$mt) throw new InvalidArgumentException("Unknown measure '$code'");

    $direction = strtolower(trim((string)($input['direction'] ?? 'increase')));

    // Validate both periods up front (invalid_period => 400, no target created).
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
        $target = (new GpsTarget($db))->add([
            'company_id' => $companyId,
            'category' => $input['category'] ?? 'finance',
            'title' => $input['title'] ?? '',
            'description' => $input['description'] ?? ('Revenue target: ' . $mt['name']),
            'priority' => $input['priority'] ?? 'medium',
            'status' => $input['status'] ?? 'not_started',
            'due_date' => $input['due_date'] ?? null,
            'owner_label' => $input['owner_label'] ?? null,
            'progress_mode' => 'metric',
        ]);
        $targetId = (int)$target['id'];

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

        $note = trim((string)($input['note'] ?? ''));
        if ($note === '') $note = 'Financial measure ' . $mt['code'] . ' · target period ' . $tgtRef;
        $source = (new GpsTargetSource($db))->link([
            'gps_target_id' => $targetId,
            'source_type' => 'manual',
            'notes' => $note,
        ]);

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
