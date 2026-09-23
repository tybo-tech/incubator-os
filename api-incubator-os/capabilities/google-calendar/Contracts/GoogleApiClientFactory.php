<?php
declare(strict_types=1);

/**
 * Chooses the Google API client implementation (Sprint 010 Phase 1).
 *
 * `GOOGLE_FAKE=1` returns the deterministic offline fake — set only in local
 * tests. Any other value (or absence) returns the real cURL transport.
 *
 * This is the single place that decides transport, so no endpoint or service
 * hard-codes an implementation.
 */
final class GoogleApiClientFactory
{
    public static function create(): GoogleApiClient
    {
        if (getenv('GOOGLE_FAKE') === '1') {
            return new FakeGoogleApiClient();
        }

        return CurlGoogleApiClient::fromConfig();
    }
}
