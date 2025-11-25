<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class City extends Model
{
    public $timestamps = false;
    protected $fillable = ['name'];

    public function region()
    {
        return $this->belongsTo(Region::class);
    }
    public function districts()
    {
        return $this->hasMany(District::class);
    }
    public function listings()
    {
        return $this->hasMany(Listing::class);
    }
    public function buyRequests()
    {
        return $this->hasMany(BuyRequest::class);
    }
}
