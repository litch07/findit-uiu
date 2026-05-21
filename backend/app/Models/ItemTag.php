<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemTag extends Model
{
    protected $table = 'item_tags';

    public $timestamps = false;

    protected $fillable = [
        'item_id',
        'tag',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
