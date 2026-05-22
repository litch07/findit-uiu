<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $table = 'conversations';

    protected $fillable = [
        'item_id',
        'participant_one',
        'participant_two',
        'last_activity',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'last_activity' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function participantOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant_one');
    }

    public function participantTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant_two');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
