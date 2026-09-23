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
        // Honour both the GOOGLE_FAKE environment variable and the gitignored
        // local config flag (`use_fake`), so the offline fake can be enabled
        // without mutating the container environment. It can only ever SELECT the
        // fake; it can never cause a real call.
        if (google_use_fake()) {
            return new FakeGoogleApiClient();
        }

        return CurlGoogleApiClient::fromConfig();
    }
}
