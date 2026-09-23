<?php
declare(strict_types=1);

/**
 * AES-256-GCM token encryption (Sprint 010 Phase 1).
 *
 * Guardrails implemented here:
 *   * AES-256-GCM with a fresh, cryptographically random 12-byte nonce for EVERY
 *     encryption — identical plaintexts therefore produce different ciphertexts.
 *   * Ciphertext, nonce, authentication tag and key version are returned as
 *     SEPARATE fields (see `EncryptedPayload`), never concatenated.
 *   * The caller supplies Authenticated Additional Data (AAD) binding the secret
 *     to its owner — tenant + user + provider + a purpose label. Decryption with
 *     different AAD fails, so a ciphertext cannot be replayed into another
 *     user's row.
 *   * Fails closed: wrong key, tampered ciphertext, unknown key version, or
 *     malformed input all throw `GoogleDecryptionException`. Corrupted plaintext
 *     is never returned.
 *   * The key is a separate 32-byte secret from the Google client secret
 *     (enforced by `google_config_error()`).
 */
final class TokenCipher
{
    private const CIPHER = 'aes-256-gcm';
    private const NONCE_BYTES = 12;
    private const TAG_BYTES = 16;

    /**
     * @param string $key Raw 32-byte AES-256 key.
     * @param int    $keyVersion Stored alongside each ciphertext for rotation.
     */
    public function __construct(
        private readonly string $key,
        private readonly int $keyVersion = 1,
    ) {
        if (strlen($this->key) !== 32) {
            // Never reveal the key; a wrong length is a configuration error.
            throw new GoogleConfigurationException('TokenCipher requires a 32-byte key.');
        }
    }

    /**
     * Build a cipher from the committed config (raw key bytes + key version).
     */
    public static function fromConfig(): self
    {
        return new self(google_encryption_key_bytes(), (int) (google_config()['key_version'] ?? 1));
    }

    /**
     * Encrypt `$plaintext`, binding it to `$aad`.
     *
     * @throws GoogleConfigurationException when the key is unavailable.
     */
    public function encrypt(string $plaintext, string $aad): EncryptedPayload
    {
        $nonce = random_bytes(self::NONCE_BYTES);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            $aad,
            self::TAG_BYTES,
        );

        if ($ciphertext === false || strlen($tag) !== self::TAG_BYTES) {
            // Do not include the OpenSSL error string: it is not a secret, but it
            // is noise; the failure mode is what matters.
            throw new GoogleDecryptionException('Token encryption failed.');
        }

        return new EncryptedPayload(
            ciphertext: base64_encode($ciphertext),
            nonce: base64_encode($nonce),
            tag: base64_encode($tag),
            keyVersion: $this->keyVersion,
        );
    }

    /**
     * Decrypt a payload. Fails closed on any deviation.
     *
     * @throws GoogleDecryptionException
     */
    public function decrypt(EncryptedPayload $payload, string $aad): string
    {
        if (!$payload->isComplete()) {
            throw new GoogleDecryptionException('Encrypted payload is incomplete.');
        }

        if ($payload->keyVersion() !== $this->keyVersion) {
            // A record encrypted under a different key version cannot be read by
            // this key. Refuse rather than guess.
            throw new GoogleDecryptionException('Encrypted payload was written with an unknown key version.');
        }

        $ciphertext = base64_decode($payload->ciphertext, true);
        $nonce = base64_decode($payload->nonce, true);
        $tag = base64_decode($payload->tag, true);

        if ($ciphertext === false || $nonce === false || $tag === false) {
            throw new GoogleDecryptionException('Encrypted payload is malformed.');
        }
        if (strlen($nonce) !== self::NONCE_BYTES || strlen($tag) !== self::TAG_BYTES) {
            throw new GoogleDecryptionException('Encrypted payload has an invalid nonce or tag length.');
        }

        $plaintext = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            $aad,
        );

        if ($plaintext === false) {
            // Wrong key, tampered ciphertext or mismatched AAD. The GCM tag check
            // failed; never return partial data.
            throw new GoogleDecryptionException('Token decryption failed (authentication check).');
        }

        return $plaintext;
    }

    /**
     * AAD contract: binds a secret to its owner and purpose so a ciphertext
     * cannot be moved between users/tenants/providers or reused for a different
     * secret type.
     */
    public static function aad(int $tenantId, int $userId, string $provider, string $purpose): string
    {
        return implode('|', [
            'v1',
            'tenant:' . $tenantId,
            'user:' . $userId,
            'provider:' . strtolower($provider),
            'purpose:' . strtolower($purpose),
        ]);
    }
}
