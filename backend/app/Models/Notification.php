<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'is_read',
        'related_item_id',
        'related_conversation_id',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function relatedItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'related_item_id');
    }

    public function relatedConversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'related_conversation_id');
    }
}
