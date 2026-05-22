<?php

namespace App\Mail;

use App\Models\Claim;
use App\Models\Item;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClaimAcceptedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $claimer,
        public readonly User $itemOwner,
        public readonly Item $item,
        public readonly Claim $claim,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your FindIt claim was accepted');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.claim-accepted');
    }

    public function attachments(): array
    {
        return [];
    }
}
