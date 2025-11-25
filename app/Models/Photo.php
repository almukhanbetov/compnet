<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Photo extends Model
{
//    public $timestamps = false;
    use HasFactory;
    protected $fillable = ['listing_id', 'url'];

    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }
}
