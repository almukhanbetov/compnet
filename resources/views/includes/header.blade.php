<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'CPA') }}</title>
    <meta name="description" content="">
    <meta name="keywords" content="">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link href="{{asset("assets/img/favicon.png")}}" rel="icon">
    <link href="{{asset("assets/img/apple-touch-icon.png")}}" rel="apple-touch-icon">
    <link href="https://fonts.googleapis.com" rel="preconnect">
    <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Raleway:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">

    <link href="{{asset("assets/vendor/bootstrap/css/bootstrap.min.css")}}" rel="stylesheet">
    <link href="{{asset("assets/vendor/bootstrap-icons/bootstrap-icons.css")}}" rel="stylesheet">
    <link href="{{asset("assets/vendor/aos/aos.css")}}" rel="stylesheet">
    <link href="{{asset("assets/vendor/glightbox/css/glightbox.min.css")}}" rel="stylesheet">
    <link href="{{asset("assets/vendor/swiper/swiper-bundle.min.css")}}" rel="stylesheet">
    <link href="{{asset("assets/vendor/drift-zoom/drift-basic.css")}}" rel="stylesheet">
    <link href="{{asset("assets/css/main.css")}}" rel="stylesheet">
</head>
<body class="index-page">
    <header id="header" class="header d-flex align-items-center fixed-top">
    <div class="header-container container-fluid container-xl position-relative d-flex align-items-center justify-content-between">
        <a href="#" class="logo d-flex align-items-center me-auto me-xl-0">
            <h1 class="sitename">ТОО "CPA"</h1>
        </a>
        <nav id="navmenu" class="navmenu">
            <ul>
                <li><a href="{{route("welcome")}}" class="active">Главная</a></li>
                <li><a href="{{route("about")}}">О нас</a></li>
                <li><a href="{{route("welcome")}}">Продажа</a></li>
                <li><a href="{{route("welcome")}}">Покупка</a></li>
                <li><a href="#">Контакты</a></li>
{{--                <li class="dropdown"><a href="#"><span>Dropdown</span> <i class="bi bi-chevron-down toggle-dropdown"></i></a>--}}
{{--                    <ul>--}}
{{--                        <li><a href="#">Dropdown 1</a></li>--}}
{{--                        <li class="dropdown"><a href="#"><span>Deep Dropdown</span> <i class="bi bi-chevron-down toggle-dropdown"></i></a>--}}
{{--                            <ul>--}}
{{--                                <li><a href="#">Deep Dropdown 1</a></li>--}}
{{--                                <li><a href="#">Deep Dropdown 2</a></li>--}}
{{--                                <li><a href="#">Deep Dropdown 3</a></li>--}}
{{--                                <li><a href="#">Deep Dropdown 4</a></li>--}}
{{--                                <li><a href="#">Deep Dropdown 5</a></li>--}}
{{--                            </ul>--}}
{{--                        </li>--}}
{{--                        <li><a href="#">Dropdown 2</a></li>--}}
{{--                        <li><a href="#">Dropdown 3</a></li>--}}
{{--                        <li><a href="#">Dropdown 4</a></li>--}}
{{--                    </ul>--}}
{{--                </li>--}}
                @auth
                <li><a href="{{ route('profile.index') }}">Профайл</a></li>
                @endauth
            </ul>
            <i class="mobile-nav-toggle d-xl-none bi bi-list"></i>
        </nav>
        @if(Route::has('login'))
            @auth
                <form method="POST" action="{{ route('logout') }}" class="d-inline">
                    @csrf
                    <button type="submit" class="btn btn-outline-secondary">Выйти   ({{auth()->user()->name}})</button>
                </form>
            @else
                <div class="auth-buttons">
                    <a class="btn-getstarted" href="{{route("register")}}">Регистрация</a>
                    <a class="btn-getstarted" href="{{route("login")}}">Войти</a>
                </div>
            @endauth
        @endif

    </div>
</header>
