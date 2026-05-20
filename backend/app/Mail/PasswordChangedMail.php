<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly string $device,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'FindIt UIU password changed');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-changed');
    }

    public function attachments(): array
    {
        return [];
    }
}
