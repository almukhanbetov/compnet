<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;
    public function getAuthIdentifierName()
    {
        return 'phone';
    }
    protected $fillable = [
        'phone',
        'password',
        'name',
        'verified',
        'role_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    public function listings()
    {
        return $this->hasMany(Listing::class);
    }
    public function buyRequests()
    {
        return $this->hasMany(BuyRequest::class);
    }
    public function deposits()
    {
        return $this->hasMany(Deposit::class);
    }
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }
}
