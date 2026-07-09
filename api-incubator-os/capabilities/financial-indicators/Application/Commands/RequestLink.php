<?php
declare(strict_types=1);

final class RequestLink
{
    public function __construct(
        private FinancialIndicatorLinkRepository $linkRepo,
        private TransactionManager $tx,
    ) {}

    public function execute(RequestLinkRequest $input): CommandResult
    {
        return $this->tx->execute(function () use ($input) {
            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));

            $this->linkRepo->createRequest(
                $input->companyId,
                $input->financialYear,
                $input->month,
                $token,
                $expiresAt
            );

            $publicUrl = APP_URL . '/financial/' . $token;

            return new CommandResult(
                success: true,
                message: 'Submission link generated',
                data: [
                    'token' => $token,
                    'expiresAt' => $expiresAt,
                    'publicUrl' => $publicUrl,
                ],
            );
        });
    }
}
