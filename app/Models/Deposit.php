<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Deposit extends Model
{
    use HasFactory;
//    public $timestamps = false;
    protected $fillable = ['match_id', 'user_id', 'amount', 'status'];
    public function match()
    {
        return $this->belongsTo(MatchModel::class, 'match_id');
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
