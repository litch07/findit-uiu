<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Claim extends Model
{
    protected $table = 'claims';

    protected $fillable = [
        'item_id',
        'claimer_id',
        'relationship_type',
        'proof_text',
        'message',
        'preferred_location',
        'availability',
        'status',
        'admin_note',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function claimer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimer_id');
    }
}
