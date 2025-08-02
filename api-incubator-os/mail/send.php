<?php
require 'config/headers.php';
require 'vendor/autoload.php';
$data = json_decode(file_get_contents("php://input"));

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$mail = new PHPMailer(true);

// Config data
$username = 'no-reply@rbttacesd.co.za';
$password = 'nL,n1P]]uzAX';
$host = 'mail.rbttacesd.co.za';
$port = 465;

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

    //Recipients
    $mail->setFrom($username, $data->sender_name);
    $mail->addAddress($data->recipient_email, $data->recipient_name); // Add a recipient
    $mail->addBCC('accounts@tybo.co.za'); // Add BCC
    // $mail->addBCC('Gcinokwakhengcobo@gmail.com'); // Add BCC
    // Content
    $mail->isHTML(true); // Set email format to HTML
    $mail->Subject = $data->subject;
    $mail->Body = format_email($data);

    $mail->send();
    echo json_encode(array("message" => "Email sent successfully"));

} catch (Exception $e) {
    echo json_encode(array("message" => "Error: " . $mail->ErrorInfo));

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
    $formatted_message .= '<p>Dear ' . $recipient_name . ',</p>';
    $formatted_message .= '<p>' . $message . '</p>';
    $formatted_message .= '<p>Regards,<br>' . $sender_name . '</p>';
    $formatted_message .= '</div>';
    $formatted_message .= '</div>';
    $formatted_message .= '</body></html>';

    return $formatted_message;
}

?>