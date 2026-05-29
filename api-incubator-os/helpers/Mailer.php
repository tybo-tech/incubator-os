<?php
/**
 * Sends a transactional email via the mail relay (https://mail.rbttacesd.co.za/send.php).
 *
 * @param  string $recipientName
 * @param  string $recipientEmail
 * @param  string $subject
 * @param  string $bodyHtml   Inner HTML body — will be wrapped in the branded shell.
 * @return bool   true on HTTP 2xx, false otherwise
 */
function sendMailRelay(
    string $recipientName,
    string $recipientEmail,
    string $subject,
    string $bodyHtml
): bool {
    $html    = emailShell($subject, $bodyHtml);
    $payload = json_encode([
        'sender_name'     => 'incubator-os',
        'sender_email'    => 'no-reply@rbttacesd.co.za',
        'recipient_name'  => $recipientName,
        'recipient_email' => $recipientEmail,
        'subject'         => $subject,
        'message'         => $html,
    ]);

      if ($payload === false) {
        error_log('Mailer: Failed to encode JSON payload.');
        return false;
      }

      $url = 'https://mail.rbttacesd.co.za/send.php';

      // Preferred transport: cURL (more reliable diagnostics and TLS behavior)
      if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
          CURLOPT_POST           => true,
          CURLOPT_POSTFIELDS     => $payload,
          CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
          CURLOPT_RETURNTRANSFER => true,
          CURLOPT_CONNECTTIMEOUT => 10,
          CURLOPT_TIMEOUT        => 20,
          CURLOPT_SSL_VERIFYPEER => true,
          CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $code     = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($response === false) {
          $curlError = curl_error($ch);
          curl_close($ch);
          error_log('Mailer: cURL transport failed - ' . $curlError);
          return false;
        }

        curl_close($ch);

        $ok = $code >= 200 && $code < 300;
        if (!$ok) {
          error_log('Mailer: Relay returned HTTP ' . $code . '. Response: ' . $response);
        }
        return $ok;
      }

      // Fallback transport for environments where cURL extension is unavailable.
      $context = stream_context_create([
        'http' => [
          'method'  => 'POST',
          'header'  => "Content-Type: application/json\r\n",
          'content' => $payload,
          'timeout' => 20,
        ],
      ]);

      $response = @file_get_contents($url, false, $context);
      $statusLine = $http_response_header[0] ?? '';
      $code = 0;
      if (preg_match('/\s(\d{3})\s/', $statusLine, $m)) {
        $code = (int)$m[1];
      }

      if ($response === false) {
        error_log('Mailer: stream transport failed. Status line: ' . $statusLine);
        return false;
      }

      $ok = $code >= 200 && $code < 300;
      if (!$ok) {
        error_log('Mailer: Relay returned HTTP ' . $code . ' (stream). Response: ' . $response);
      }

      return $ok;
}

/**
 * Branded HTML email shell — mirrors the Angular EmailService::shell() layout.
 */
function emailShell(string $title, string $body): string
{
    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:12px;overflow:hidden;
                  box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:600px;">
      <tr>
        <td style="background:#7c3aed;padding:24px 36px;text-align:center;">
          <p style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
            incubator-os
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 36px 28px;">
          <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 20px;">{$title}</h2>
          {$body}
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 36px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            This is an automated message from incubator-os. Please do not reply directly to this email.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
}
