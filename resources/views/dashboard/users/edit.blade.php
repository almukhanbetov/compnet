@extends('layouts.app')
@section('content')
    <div class="container mt-5">
        <h2>Изменение роли пользователя</h2>
        <form method="POST" action="{{ route('admin.users.update', $user->id) }}">
            @csrf
            @method('PUT')
            <div class="mb-3">
                <label for="name" class="form-label">Имя:</label>
                <input type="text" id="name" class="form-control" value="{{ $user->name }}" disabled>
            </div>

            <div class="mb-3">
                <label for="email" class="form-label">Email:</label>
                <input type="text" id="email" class="form-control" value="{{ $user->email }}" disabled>
            </div>
            <div class="mb-3">
                <label for="role_id" class="form-label">Роль:</label>
                <select name="role_id" id="role_id" class="form-select">
                    @foreach($roles as $role)
                        <option value="{{ $role->id }}" {{ $user->role_id == $role->id ? 'selected' : '' }}>
                            {{ $role->display_name }}
                        </option>
                    @endforeach
                </select>
                @error('role_id')
                <div class="text-danger mt-2">{{ $message }}</div>
                @enderror
            </div>

            <button type="submit" class="btn btn-success">Сохранить</button>
            <a href="{{ route('admin.users.index') }}" class="btn btn-secondary">Назад</a>
        </form>
    </div>
@endsection
