<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token');
header('Content-Type: application/json');

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;



$autoloadPath = __DIR__ . '/autoload.php';
$phpMailerClassPath = __DIR__ . '/phpmailer/phpmailer/src/PHPMailer.php';
$phpMailerSmtpPath = __DIR__ . '/phpmailer/phpmailer/src/SMTP.php';
$phpMailerExceptionPath = __DIR__ . '/phpmailer/phpmailer/src/Exception.php';

if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
} elseif (
    file_exists($phpMailerClassPath)
    && file_exists($phpMailerSmtpPath)
    && file_exists($phpMailerExceptionPath)
) {
    require_once $phpMailerExceptionPath;
    require_once $phpMailerSmtpPath;
    require_once $phpMailerClassPath;
} else {
    http_response_code(500);
    echo json_encode(array("message" => "Mail dependencies are not installed"));
    exit;
}

$data = json_decode(file_get_contents("php://input"));

$mail = new PHPMailer(true);

// Config data
$username = 'app@rbttacesd.co.za';
$password = 'EL(jM##Tep7)p;13';
$host = 'mail.rbttacesd.co.za';
$port = 465;
// Override username if sender_email is provided
// if (isset($data->sender_email) && !empty($data->sender_email)) {
//     $username = $data->sender_email;
// }

try {
    //Server settings
    $mail->SMTPDebug = 0; // Enable verbose debug output (change to 2 for more detailed debug info)
    $mail->isSMTP(); // Set mailer to use SMTP
    $mail->Host = $host; // Specify main and backup SMTP servers
    $mail->SMTPAuth = true; // Enable SMTP authentication
    $mail->Username = $username; // SMTP username
    $mail->Password = $password; // SMTP password
    $mail->SMTPSecure = 'ssl'; // Enable TLS encryption, `ssl` also accepted
    $mail->Port = $port; // TCP port to connect to
    $mail->ContentType = 'text/html';
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );

    //Recipients
    $mail->setFrom($username, $data->sender_name);
    
    // Handle multiple recipients separated by comma or semicolon
    $recipients = parse_email_addresses($data->recipient_email);
    $recipient_name = $data->recipient_name;
    
    foreach ($recipients as $index => $email) {
        // Use the recipient name only for the first address, empty for others
        $name = ($index === 0) ? $recipient_name : '';
        $mail->addAddress($email, $name);
    }

    // Set Reply-To address - use provided reply_to or default to sender_email
    $replyToEmail = isset($data->reply_to) && !empty($data->reply_to)
        ? $data->reply_to
        : $data->sender_email;
    $replyToName = isset($data->reply_to_name) && !empty($data->reply_to_name)
        ? $data->reply_to_name
        : $data->sender_name;
    $mail->addReplyTo($replyToEmail, $replyToName);

    $bcc = 'mrnnmthembu@gmail.com';
    if ($data->recipient_email !== $bcc)
        $mail->addBCC($bcc);

    // Content
    $mail->isHTML(true); // Set email format to HTML
    $mail->Subject = $data->subject;
    $mail->Body = format_email($data);

    $mail->send();
    echo json_encode(array("message" => "Email sent successfully"));

} catch (Exception $e) {
    echo json_encode(array("message" => "Error: " . $mail->ErrorInfo));

}

function parse_email_addresses($email_string)
{
    // Split by comma or semicolon
    $emails = preg_split('/[;,]/', $email_string);
    
    // Trim whitespace and filter out empty values
    $emails = array_map('trim', $emails);
    $emails = array_filter($emails, function($email) {
        return !empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL);
    });
    
    // Return array of valid emails, or original string if no valid emails found
    return !empty($emails) ? array_values($emails) : [$email_string];
}

function format_email($data)
{
    // Sanitize user input
    $recipient_name = htmlspecialchars($data->recipient_name);
    $sender_name = htmlspecialchars($data->sender_name);
    $message = htmlspecialchars($data->message);
    $message = $data->message;

    // Email styles
    $styles = "
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f7f7f7;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #fff;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }

            .content {
                padding: 20px;
            }
        </style>
    ";

    $formatted_message = '<html><head>' . $styles . '</head><body>';
    $formatted_message .= '<div class="container">';
    $formatted_message .= '<div class="content">';
    // $formatted_message .= '<p>Dear ' . $recipient_name . ',</p>';
    $formatted_message .= '<p>' . $message . '</p>';
    // $formatted_message .= '<p>Regards,<br>' . $sender_name . '</p>';
    $formatted_message .= '</div>';
    $formatted_message .= '</div>';
    $formatted_message .= '</body></html>';

    return $formatted_message;
}

?>
