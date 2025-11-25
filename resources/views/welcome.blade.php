@extends("layouts.guest")
@section("content")
        <section id="hero" class="hero section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="text-center mb-5" data-aos="fade-up" data-aos-delay="150">
                    <p class="text-uppercase fw-semibold text-success mb-2" style="letter-spacing: 1.5px;">
                        Впервые в мире биржа недвижимости
                    </p>

                    <h1 class="fw-bold display-5 text-dark mb-3" style="font-family: 'Poppins', sans-serif;">
                        UIBIRZHASI.KZ
                    </h1>

                    <p class="lead text-muted" style="max-width: 600px; margin: 0 auto;">
                         <span class="text-success fw-semibold">Мы гарантируем, что продадим вашу недвижимость</span>.
                    </p>
                </div>


                <div class="row align-items-center g-5">
                    {{-- Левая часть — форма --}}
                    <div class="col-lg-5" data-aos="fade-right" data-aos-delay="200">
                        <div class="p-4 rounded-4 shadow-lg bg-white" style="backdrop-filter: blur(8px);">
                            <h2 class="text-center mb-4 fw-bold text-success">Добавить объявление</h2>

                            {{-- Сообщения --}}
                            @if ($errors->any())
                                <div class="alert alert-danger small py-2 px-3">
                                    <strong>Ошибка:</strong> проверьте поля ниже.
                                </div>
                            @endif
                            @if (session('success'))
                                <div class="alert alert-success small py-2 px-3">{{ session('success') }}</div>
                            @endif

                            {{-- Форма --}}
                            <form action="{{ route('listings.store') }}" method="POST" enctype="multipart/form-data" class="mt-3">
                                @csrf
                                <div class="row g-3">
                                    {{-- Тип --}}
                                    <div class="col-md-6">
                                        <label class="form-label small text-muted mb-1">Тип недвижимости</label>
                                        <select name="type_id" class="form-select form-select-sm rounded-3" required>
                                            <option value="">Выберите тип</option>
                                            @foreach($types as $t)
                                                <option value="{{ $t->id }}" @selected(old('type_id')==$t->id)>
                                                    {{ $t->name }}
                                                </option>
                                            @endforeach
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small text-muted mb-1">Область</label>
                                        <select name="city_id" class="form-select form-select-sm rounded-3" required>
                                            <option value="">Выберите область</option>
                                            @foreach($regions as $region)
                                                <option value="{{ $region->id }}" @selected(old('region_id')==$region->id)>
                                                    {{ $region->name }}
                                                </option>
                                            @endforeach
                                        </select>
                                    </div>
                                    {{-- Город --}}
                                    <div class="col-md-6">
                                        <label class="form-label small text-muted mb-1">Город</label>
                                        <select name="city_id" class="form-select form-select-sm rounded-3" required>
                                            <option value="">Выберите город</option>
                                            @foreach($cities as $c)
                                                <option value="{{ $c->id }}" @selected(old('city_id')==$c->id)>
                                                    {{ $c->name }}
                                                </option>
                                            @endforeach
                                        </select>
                                    </div>

                                    {{-- Район --}}
                                    <div class="col-md-6">
                                        <label class="form-label small text-muted mb-1">Район</label>
                                        <select name="district_id" class="form-select form-select-sm rounded-3" required>
                                            <option value="">Выберите район</option>
                                            @foreach($districts as $d)
                                                <option value="{{ $d->id }}" @selected(old('district_id')==$d->id)>
                                                    {{ $d->name }}
                                                </option>
                                            @endforeach
                                        </select>
                                    </div>

                                    {{-- Площадь и Комнат --}}
                                    <div class="col-md-3">
                                        <label class="form-label small text-muted mb-1">Площадь (м²)</label>
                                        <input type="number" step="0.1" name="area" class="form-control form-control-sm rounded-3" value="{{ old('area') }}" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label small text-muted mb-1">Комнат</label>
                                        <input type="number" name="rooms" class="form-control form-control-sm rounded-3" value="{{ old('rooms') }}" required>
                                    </div>

                                    {{-- Цена --}}
                                    <div class="col-6">
                                        <label class="form-label small text-muted mb-1">Цена в тенге</label>
                                        <input type="number" name="price_base" class="form-control form-control-sm rounded-3" value="{{ old('price_base') }}" placeholder="Например: 45000000" required>
                                    </div>

                                    {{-- Описание --}}
                                    <div class="col-12">
                                        <label class="form-label small text-muted mb-1">Описание</label>
                                        <textarea class="form-control form-control-sm rounded-3" rows="3" name="description" placeholder="Кратко опишите объект..." required>{{ old('description') }}</textarea>
                                    </div>

                                    {{-- Фото --}}
                                    <div class="col-12">
                                        <label class="form-label small text-muted mb-1">Фотографии объекта</label>
                                        <input type="file" name="photos[]" multiple class="form-control form-control-sm rounded-3" accept="image/*">
                                        <small class="text-muted d-block mt-1">Можно выбрать несколько (до 4 МБ каждое)</small>
                                    </div>

                                    {{-- Кнопка --}}
                                    <div class="col-12 mt-3">
                                        <button type="submit" class="btn btn-success w-100 py-2 rounded-4 shadow-sm">
                                            <i class="bi bi-check-circle me-1"></i> Сохранить объявление
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {{-- Правая часть — красивая картинка --}}
                    <div class="col-lg-7" data-aos="fade-left" data-aos-delay="300">
                        <div class="position-relative">
                            <img src="{{ asset('assets/img/real-estate/property-exterior-3.webp') }}" class="img-fluid rounded-4 shadow-lg" alt="Property">

                            <div class="position-absolute top-0 end-0 bg-success text-white px-3 py-2 rounded-end-4 rounded-bottom-0 fw-semibold" style="border-top-right-radius: 1rem;">
                                855 000 000 • РЕКОМЕНДУЕМЫЕ
                            </div>

                            <div class="position-absolute bottom-0 start-0 bg-white p-3 rounded-4 shadow-sm m-3" style="max-width: 250px;">
                                <div class="d-flex align-items-center">
                                    <img src="{{ asset('assets/img/real-estate/agent-4.webp') }}" class="rounded-circle me-2" width="40" height="40" alt="Agent">
                                    <div>
                                        <h6 class="mb-0 fw-bold text-dark">Аимбетов Жусуп</h6>
                                        <small class="text-muted">ТОО "CPA"</small>
                                    </div>
                                </div>
                                <div class="mt-2 text-warning small">
                                    <i class="bi bi-star-fill"></i>
                                    <i class="bi bi-star-fill"></i>
                                    <i class="bi bi-star-fill"></i>
                                    <i class="bi bi-star-fill"></i>
                                    <i class="bi bi-star-half"></i>
                                    <span class="text-muted ms-1">4.9 (127)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        {{-- 🔍 Панель фильтра сверху --}}
        <section class="filter-bar bg-light py-3 mb-4 shadow-sm rounded" data-aos="fade-down" data-aos-delay="100">
            <div class="container">
                <form id="filterForm" method="GET" action="{{ route('listings.index') }}" class="row g-3 align-items-end">

                    {{-- Тип недвижимости --}}
                    <div class="col-md-2">
                        <label class="form-label fw-semibold">Тип</label>
                        <select class="form-select" name="type_id">
                            <option value="">Все типы</option>
                            @foreach($types as $type)
                                <option value="{{ $type->id }}" {{ request('type_id') == $type->id ? 'selected' : '' }}>
                                    {{ $type->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    {{-- Город --}}
                    <div class="col-md-2">
                        <label class="form-label fw-semibold">Город</label>
                        <select class="form-select" name="city_id" id="citySelect">
                            <option value="">Все города</option>
                            @foreach($cities as $city)
                                <option value="{{ $city->id }}" {{ request('city_id') == $city->id ? 'selected' : '' }}>
                                    {{ $city->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    {{-- Район (обновляется динамически через JS) --}}
                    <div class="col-md-2">
                        <label class="form-label fw-semibold">Район</label>
                        <select class="form-select" name="district_id" id="districtSelect">
                            <option value="">Все районы</option>
                            @if(isset($districts))
                                @foreach($districts as $district)
                                    <option value="{{ $district->id }}" {{ request('district_id') == $district->id ? 'selected' : '' }}>
                                        {{ $district->name }}
                                    </option>
                                @endforeach
                            @endif
                        </select>
                    </div>

                    {{-- Количество комнат --}}
                    <div class="col-md-1">
                        <label class="form-label fw-semibold">Комнат</label>
                        <input type="number" class="form-control" name="rooms" value="{{ request('rooms') }}" min="1" placeholder="≥ 1">
                    </div>

                    {{-- Площадь --}}
                    <div class="col-md-2">
                        <label class="form-label fw-semibold">Площадь (м²)</label>
                        <div class="input-group">
                            <input type="number" name="area_min" class="form-control" placeholder="от" value="{{ request('area_min') }}">
                            <input type="number" name="area_max" class="form-control" placeholder="до" value="{{ request('area_max') }}">
                        </div>
                    </div>

                    {{-- Цена --}}
                    <div class="col-md-2">
                        <label class="form-label fw-semibold">Цена (₸)</label>
                        <div class="input-group">
                            <input type="number" name="price_min" class="form-control" placeholder="от" value="{{ request('price_min') }}">
                            <input type="number" name="price_max" class="form-control" placeholder="до" value="{{ request('price_max') }}">
                        </div>
                    </div>

                </form>
            </div>
        </section>


        <section id="properties" class="properties section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="row">
                    <div class="col-lg-12">

                        <div class="properties-header mb-4">
                            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div class="view-toggle d-flex gap-2">
                                    <button class="btn btn-outline-secondary btn-sm view-btn active" data-view="grid">
                                        <i class="bi bi-grid-3x3-gap"></i> Таблица
                                    </button>
                                    <button class="btn btn-outline-secondary btn-sm view-btn" data-view="list">
                                        <i class="bi bi-list"></i> Список
                                    </button>
                            </div>
                            <div class="sort-dropdown">
                                <select class="form-select form-select-sm">
                                    <option>Сортировка: Новый</option>
                                    <option>Цена: Базовая</option>
                                    <option>Цена: Текущая</option>
                                    <option></option>
                                </select>
                            </div>
                        </div>
                    </div>
                        <div id="listing-container">
                            @include("components.listings-grid", ["listings"=>$listings])
                        </div>
                    </div>
                </div>
            </div>
        </section>
@endsection
