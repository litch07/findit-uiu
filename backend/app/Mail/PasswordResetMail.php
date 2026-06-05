<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $resetUrl;

    public function __construct(
        public readonly User $user,
        public readonly string $token,
    ) {
        $this->resetUrl = 'http://127.0.0.1:5500/frontend/pages/reset-password.html'
            . '?token=' . urlencode($token)
            . '&email=' . urlencode($user->email);
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Reset Your FindIt UIU Password');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset');
    }

    public function attachments(): array
    {
        return [];
    }
}
