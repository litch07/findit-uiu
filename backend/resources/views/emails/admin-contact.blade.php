<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Contact Admin Message</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #1B2A4A; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Message for Admin</h2>
        
        <p><strong>From:</strong> {{ $contactData['name'] }} ({{ $contactData['email'] }})</p>
        <p><strong>Subject:</strong> {{ $contactData['subject'] }}</p>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #D4590A; border-radius: 4px;">
            <p style="white-space: pre-wrap; margin: 0;">{{ $contactData['message'] }}</p>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777;">
            This email was sent from the FindIt UIU Contact Admin form. You can reply directly to this email to respond to the user.
        </p>
    </div>
</body>
</html>
