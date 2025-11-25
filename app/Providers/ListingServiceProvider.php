<?php

namespace App\Providers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use App\Services\ListingService;


class ListingServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(ListingService::class, fn()=> new ListingService());
    }

    /**
     * Bootstrap services.
     */
    public function boot(ListingService $listingService): void
    {
//        Log::info('ListingServiceProvider booted');

        View::composer(['welcome','listings.*','profile.*'], function ($view) use ($listingService){
            Log::info('view name: '.$view->name());
//             $view->with($listingService->dictionaries());
            View::share($listingService->dictionaries());
        });
    }
}
