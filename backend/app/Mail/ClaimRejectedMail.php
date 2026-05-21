<?php

namespace App\Mail;

use App\Models\Item;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClaimRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $claimer,
        public readonly Item $item,
        public readonly string $reason,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your FindIt claim was rejected');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.claim-rejected');
    }

    public function attachments(): array
    {
        return [];
    }
}
