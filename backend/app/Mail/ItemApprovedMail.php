<?php

namespace App\Mail;

use App\Models\Item;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ItemApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $owner,
        public readonly Item $item,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your FindIt report was approved');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.item-approved');
    }

    public function attachments(): array
    {
        return [];
    }
}
