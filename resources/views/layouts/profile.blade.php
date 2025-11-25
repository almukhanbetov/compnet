<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Админка недвижимости</title>
    <link href="{{ asset('profile/css/bootstrap.min.css') }}" rel="stylesheet">
    <link href="{{ asset('profile/css/styles.css') }}" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">

</head>
<body>
<!-- Верхняя панель -->
@include("includes-profile.navbar")
<div class="container-fluid">
    <div class="row">
        <!-- Боковое меню -->
        @include("includes-profile.sidebar")
        <!-- Контент -->
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
            @yield('content')
        </main>
    </div>
</div>

<script  src="{{ asset('profile/js/bootstrap.bundle.min.js') }}"></script>
<script  src="{{ asset('profile/js/main.js')}}"></script>
</body>
</html>

