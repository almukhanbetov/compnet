<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }
    protected function prepareForValidation(): void
    {
        $phone = $this->input('phone');
        $phone = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($phone, '8')) {
            $phone = '7' . substr($phone, 1);
        }

        if (!str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }

        Log::info('Номер телефона после нормализации', [
            'original' => $this->input('phone'),
            'normalized' => $phone,
            'ip' => $this->ip(),
        ]);

        $this->merge(['phone' => $phone]);
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'regex:/^\+7\d{10}$/'],
            'password' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required' => 'Поле телефон обязательно для заполнения.',
            'phone.regex' => 'Введите номер в правильном формате, например +77077801011.',
            'password.required' => 'Введите пароль.',
            'password.string' => 'Пароль должен быть строкой.',
        ];
    }
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        if (! Auth::attempt($this->only('phone', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'phone' => trans('auth.failed'),
            ]);
        }
        RateLimiter::clear($this->throttleKey());
    }
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'phone' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('phone')).'|'.$this->ip());
    }
}
