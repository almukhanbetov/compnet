<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MatchModel extends Model
{
//    public $timestamps = false;
    use HasFactory;
    protected $fillable = ['listing_id', 'request_id', 'status'];

    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    public function request()
    {
        return $this->belongsTo(BuyRequest::class, 'request_id');
    }

    public function deposits()
    {
        return $this->hasMany(Deposit::class, 'match_id');
    }
}
