<?php

namespace App\Services;

use App\Mail\ClaimAcceptedMail;
use App\Mail\ClaimRejectedMail;
use App\Mail\ClaimSubmittedMail;
use App\Mail\ItemApprovedMail;
use App\Mail\PasswordChangedMail;
use App\Mail\PasswordResetMail;
use App\Mail\VerificationMail;
use App\Mail\WelcomeMail;
use App\Models\Claim;
use App\Models\Item;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailService
{
    public function sendVerification(User $user, string $token): bool
    {
        return $this->send($user, new VerificationMail($user, $token));
    }

    public function sendWelcome(User $user): bool
    {
        return $this->send($user, new WelcomeMail($user));
    }

    public function sendClaimSubmitted(User $itemOwner, User $claimer, Item $item, Claim $claim): bool
    {
        return $this->send($itemOwner, new ClaimSubmittedMail($itemOwner, $claimer, $item, $claim));
    }

    public function sendClaimAccepted(User $claimer, User $itemOwner, Item $item, Claim $claim): bool
    {
        return $this->send($claimer, new ClaimAcceptedMail($claimer, $itemOwner, $item, $claim));
    }

    public function sendClaimRejected(User $claimer, Item $item, string $reason): bool
    {
        return $this->send($claimer, new ClaimRejectedMail($claimer, $item, $reason));
    }

    public function sendPasswordChanged(User $user, string $device): bool
    {
        return $this->send($user, new PasswordChangedMail($user, $device));
    }

    public function sendPasswordReset(User $user, string $token): bool
    {
        return $this->send($user, new PasswordResetMail($user, $token));
    }

    public function sendItemApproved(User $owner, Item $item): bool
    {
        return $this->send($owner, new ItemApprovedMail($owner, $item));
    }

    private function send(User $recipient, object $mail): bool
    {
        try {
            Mail::to($recipient->email)->send($mail);

            return true;
        } catch (\Throwable $exception) {
            Log::error('Email delivery failed: '.$exception->getMessage(), [
                'recipient' => $recipient->email,
                'mailable' => $mail::class,
            ]);

            return false;
        }
    }
}
