@extends("layouts.guest")
@section("content")
<section id="center" class="center_o">
 <div class="container">
 </div>
</section>
<section id="login">
 <div class="container">
  <div class="row">
      <form method="POST" action="{{ route('login') }}">
          @csrf
          <div class="col-md-6 mx-auto">
              <div class="login_1">
                  <h3 class="col_1">Вой<span class="col_4">ти</span></h3>
                  @if ($errors->any())
                      <div class="alert alert-danger mt-3">
                          <ul class="mb-0">
                              @foreach ($errors->all() as $error)
                                  <li>{{ $error }}</li>
                              @endforeach
                          </ul>
                      </div>
                  @endif
                  <h6 style="margin-top:40px;">Телефон</h6>
                  <input type="text" id="phone" class="form-control" name="phone" placeholder="+7 (___) ___-__-__" required>

                  <h6 style="margin-top:30px;">Пароль</h6>
                  <input type="password" name="password" class="form-control" placeholder="Ваш пароль" required>

                  <div class="d-flex justify-content-between mt-4">
                      <div class="form-check">
                          <input class="form-check-input" type="checkbox" value="1" id="remember" name="remember">
                          <label class="form-check-label" for="remember">Запомните меня</label>
                      </div>
                      <a href="#" class="col_1">Забыли пароль?</a>
                  </div>

                  <h6 class="mt-4 mb-0">
                      <button class="btn btn-success" type="submit">
                          Отправить <i style="margin-left:5px;" class="fa fa-sign-in"></i>
                      </button>
                  </h6>

                  <p class="mt-4 mb-0">
                      Если Вы не зарегистрированы?
                      <a class="col_1" href="{{ route('register') }}">Регистрация</a>
                  </p>
              </div>
          </div>
      </form>
  </div>
 </div>
</section>




@endsection
