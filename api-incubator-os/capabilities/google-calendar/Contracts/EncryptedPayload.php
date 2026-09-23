<?php
declare(strict_types=1);

/**
 * An encrypted secret payload (Sprint 010 Phase 1).
 *
 * The ciphertext, nonce, authentication tag and key version are stored as
 * SEPARATE fields (never concatenated into one blob), so each can be inspected,
 * rotated and migrated independently.
 *
 * Contains no behaviour beyond (de)serialisation — encryption lives in
 * `TokenCipher`.
 */
final class EncryptedPayload implements JsonSerializable
{
    public function __construct(
        public readonly string $ciphertext,
        public readonly string $nonce,
        public readonly string $tag,
        public readonly int $keyVersion,
    ) {}

    public function isComplete(): bool
    {
        return $this->ciphertext !== '' && $this->nonce !== '' && $this->tag !== '' && $this->keyVersion >= 1;
    }

    public function keyVersion(): int
    {
        return $this->keyVersion;
    }

    /**
     * @param array<string,mixed> $row
     */
    public static function fromArray(array $row): self
    {
        return new self(
            ciphertext: (string) ($row['ciphertext'] ?? ''),
            nonce: (string) ($row['nonce'] ?? ''),
            tag: (string) ($row['tag'] ?? ''),
            keyVersion: (int) ($row['key_version'] ?? 0),
        );
    }

    /**
     * @return array{ciphertext:string,nonce:string,tag:string,key_version:int}
     */
    public function toArray(): array
    {
        return [
            'ciphertext' => $this->ciphertext,
            'nonce' => $this->nonce,
            'tag' => $this->tag,
            'key_version' => $this->keyVersion,
        ];
    }

    public function jsonSerialize(): mixed
    {
        // Deliberately excludes the ciphertext/tag: this value object may be
        // accidentally serialised into a log or response, so JSON output is a
        // non-sensitive descriptor only.
        return [
            'nonce' => $this->nonce,
            'keyVersion' => $this->keyVersion,
            'hasCiphertext' => $this->ciphertext !== '',
        ];
    }

    public function __debugInfo(): array
    {
        // Prevent secrets surfacing through var_dump()/print_r() during debugging.
        return [
            'ciphertext' => '[redacted]',
            'nonce' => $this->nonce,
            'tag' => '[redacted]',
            'keyVersion' => $this->keyVersion,
        ];
    }
}
