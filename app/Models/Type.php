<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Type extends Model
{
    public $timestamps = false;
    protected $fillable = ['name'];

    public function listings()
    {
        return $this->hasMany(Listing::class);
    }

    public function buyRequests()
    {
        return $this->hasMany(BuyRequest::class);
    }
}
