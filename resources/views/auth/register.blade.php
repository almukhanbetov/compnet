@extends("layouts.guest")
@section("content")
<section id="center" class="center_o">
 <div class="container">
 </div>
</section>
<section id="register">
    <div class="container">
        <div class="row">
            <form method="POST" action="{{ route('register') }}">
                @csrf
                <div class="col-md-6 mx-auto">
                    <div class="login_1">
                        <h3 class="col_1">Регис<span class="col_4">трация</span></h3>

                        {{-- 🔴 Вывод ошибок --}}
                        @if ($errors->any())
                            <div class="alert alert-danger alert-dismissible fade show mt-3" role="alert">
                                <ul class="mb-0">
                                    @foreach ($errors->all() as $error)
                                        <li>{{ $error }}</li>
                                    @endforeach
                                </ul>
                                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Закрыть"></button>
                            </div>
                        @endif

                        {{-- Имя --}}
                        <h6 style="margin-top:40px;">Имя</h6>
                        <input type="text" class="form-control" name="name" value="{{ old('name') }}" placeholder="Ваше имя" required autofocus autocomplete="name" />
                        <x-input-error :messages="$errors->get('name')" class="mt-2" />

                        {{-- Телефон --}}
                        <h6 style="margin-top:30px;">Телефон</h6>
                        <input type="text" id="phone" class="form-control" name="phone" value="{{ old('phone') }}" placeholder="+7 (___) ___-__-__" required autofocus autocomplete="phone" />
                        <x-input-error :messages="$errors->get('phone')" class="mt-2" />

                        {{-- Пароль --}}
                        <h6 style="margin-top:30px;">Пароль</h6>
                        <input type="password" class="form-control" name="password" placeholder="Введите пароль" required autocomplete="new-password">
                        <x-input-error :messages="$errors->get('password')" class="mt-2" />

                        {{-- Подтверждение пароля --}}
                        <h6 style="margin-top:30px;">Повторите пароль</h6>
                        <input type="password" class="form-control" name="password_confirmation" placeholder="Повторите пароль" required autocomplete="new-password">
                    </div>

                    <div class="d-flex justify-content-between mt-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="remember">
                            <label class="form-check-label" for="remember">Запомнить меня</label>
                        </div>
                    </div>

                    <button class="btn btn-success mt-3" type="submit">
                        Отправить <i style="margin-left:5px;" class="fa fa-sign-in"></i>
                    </button>

                    <p class="mt-4 mb-0">
                        Уже имеется аккаунт?
                        <a class="col_1" href="{{ route('login') }}">Войти</a>
                    </p>
                </div>
            </form>
        </div>
    </div>
</section>
@endsection
