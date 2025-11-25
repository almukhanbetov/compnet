<nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-4 py-3">
    <a class="navbar-brand fw-bold text-success" href="#" style="color:#176c61 !important;">TOO "CPA"</a>
    <div class="ms-auto d-flex align-items-center">
        <span class="text-secondary me-3">{{ Auth::user()->name }}</span>
        <form method="POST" action="{{ route('logout') }}">
            @csrf
            <button type="submit" class="btn btn-success rounded-pill px-4 py-2" style="background:#176c61; border:none;">
                Выйти
            </button>
        </form>
    </div>
</nav>
