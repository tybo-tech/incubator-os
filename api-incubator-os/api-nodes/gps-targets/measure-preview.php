<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../services/TargetMeasurementService.php';
include_once '../../config/headers.php';
/**
 * Financial-screen prefill (Sprint 007 Phase 6).
 * GET ?company_id=&metric_code=&period_type=&period_ref=
 * Returns the measured period for a revenue measure (company-scoped) so the UI can
 * prefill a baseline/target and warn on incomplete/no-account data. Read-only — reuses the
 * locked revenue calculation; never reads or writes metric_records.
 */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $companyId = (int)($_GET['company_id'] ?? 0);
    if (!$companyId) throw new InvalidArgumentException('company_id required');
    auth_require_company_access($authUser, $companyId);

    $code = trim((string)($_GET['metric_code'] ?? ''));
    if ($code === '') throw new InvalidArgumentException('metric_code required');

    $svc = new TargetMeasurementService($db);
    $mt = $svc->metricTypeByCode($code);
    if (!$mt) { http_response_code(404); echo json_encode(['error' => "Unknown measure '$code'"]); exit; }

    $period = $svc->measurePeriodForMetric(
        $companyId,
        (string)($_GET['period_type'] ?? ''),
        (string)($_GET['period_ref'] ?? ''),
        (int)$mt['id']
    );

    echo json_encode([
        'measure' => ['code' => $mt['code'], 'name' => $mt['name'], 'unit' => $mt['unit'], 'metric_type_id' => (int)$mt['id']],
        'period' => $period,
        'calculation_version' => TargetMeasurementService::CALCULATION_VERSION,
    ]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
