@extends('layouts.dashboard')

@section('content')
    <div class="container-fluid">
        <h2 class="mb-4 fw-semibold">Добро пожаловать в админ-панель 👋</h2>

        <div class="row g-4">
            <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center bg-primary text-white p-3 rounded-4">
                    <h5>Пользователи</h5>
                    <h2>{{ \App\Models\User::count() }}</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center bg-success text-white p-3 rounded-4">
                    <h5>Объявления</h5>
                    <h2>{{ \App\Models\Listing::count() }}</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center bg-warning text-dark p-3 rounded-4">
                    <h5>Заявки</h5>
                    <h2>{{ \App\Models\BuyRequest::count() }}</h2>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center bg-danger text-white p-3 rounded-4">
                    <h5>Совпадения</h5>
                    <h2>{{ \App\Models\MatchModel::count() }}</h2>
                </div>
            </div>
        </div>
    </div>
@endsection
