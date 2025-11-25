<?php
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\DashboardController;
Route::get('/', fn() => view('welcome'))->name('welcome');
Route::get('/about', fn() => view('about'))->name('about');
Route::get('/login', fn() => view('login'))->name('login');
Route::get('/listings', [ListingController::class, 'index'])->name('listings.index');
Route::get('/listings/create', [ListingController::class, 'create'])->name('listings.create');
Route::get('/listings/show/{id}', [ListingController::class, 'show'])->name('listings.show');
Route::get('/listings/ajax', [ListingController::class, 'ajaxSearch'])->name('listings.ajax');
Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin'])->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::get('/users/{id}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
});
Route::middleware('auth')->group(function () {
    Route::post('/listings',        [ListingController::class, 'store'])->name('listings.store');
    Route::get('/profile/index', [ProfileController::class, 'index'])->name('profile.index');
    Route::get('/profile/create', [ProfileController::class, 'create'])->name('profile.create');
    Route::post('/profile/store', [ProfileController::class, 'store'])->name('profile.store');
    Route::get('/profile/{listing}', [ProfileController::class, 'show'])->name('profile.show');
    Route::get('/profile/{listing}/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/profile/{listing}', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile/{listing}', [ProfileController::class, 'destroy'])->name('profile.destroy');
//    Route::get('/profile/{id}/edit', [ProfileController::class, 'edit'])->name('profile.edit');
//    Route::put('/profile/{id}', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile/listings/photos/{photo}', [ProfileController::class, 'deletePhoto'])->name('profile.listings.photos.delete');

//    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
//    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
//    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
