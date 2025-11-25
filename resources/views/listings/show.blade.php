@extends("layouts.guest")
@section("content")
<div class="page-title">
    <div class="heading">
        <div class="container">
            <div class="row d-flex justify-content-center text-center">
                <div class="col-lg-8">
                    <h1 class="heading-title">{{$listing->type->name}}</h1>
                    <p class="mb-0">
                        {{$listing->description}}
                    </p>
                </div>
            </div>
        </div>
    </div>
    <nav class="breadcrumbs">
        <div class="container">
            <ol>
                <li><a href="#">Главная</a></li>
                <li class="current">Детальный обзор</li>
            </ol>
        </div>
    </nav>
</div>
<section id="property-details" class="property-details section">
    <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="row gy-4">
            <div class="col-lg-8">
                <!-- Property Gallery -->
                {{-- Главное фото --}}
                @if($listing->photos->count())
                    <div class="main-image mb-3 text-center">
                        <img id="main-photo"
                             src="{{ asset($listing->photos->first()->url) }}"
                             class="img-fluid rounded shadow-sm"
                             style="object-fit: cover; width: 100%; max-height: 500px;"
                             alt="Основное фото">
                    </div>

                    {{-- Галерея миниатюр --}}
                    <div class="thumbnail-gallery d-flex flex-wrap gap-2 justify-content-center">
                        @foreach($listing->photos as $photo)
                            <img src="{{ asset($photo->url) }}"
                                 class="img-thumbnail"
                                 style="width: 120px; height: 100px; object-fit: cover; cursor: pointer;"
                                 onclick="document.getElementById('main-photo').src='{{ asset($photo->url) }}'">
                        @endforeach
                    </div>
                @else
                    <img src="{{ asset('assets/img/no-image.png') }}" class="img-fluid rounded shadow-sm" alt="Нет фото">
                @endif

                {{-- Описание --}}
                <div class="property-description" data-aos="fade-up" data-aos-delay="300">
                    <h3>{{$listing->type->name}}</h3>
                    <p>{{$listing->description}}</p>
                </div>
                <div class="property-map" data-aos="fade-up" data-aos-delay="500">
                    <h3>Местонахождение</h3>
                    <div class="map-container">
                        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2965.0824050173574!2d-87.63000000000002!3d41.88844360000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x880e2c3cd0f4cbed%3A0xafe0a6ad09c0c000!2sChicago%2C%20IL%2C%20USA!5e0!3m2!1sen!2sus!4v1234567890123" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
                    </div>
{{--                    <div class="location-details">--}}
{{--                        <h4>Neighborhood Information</h4>--}}
{{--                        <p>Located in the heart of downtown, this property offers easy access to shopping, dining, and entertainment. Public transportation and major highways are just minutes away.</p>--}}
{{--                    </div>--}}
                </div><!-- End Map Section -->

            </div>

            <div class="col-lg-4">

                <!-- Property Overview -->
                <div class="property-overview sticky-top" data-aos="fade-up" data-aos-delay="200">
                    <div class="price-tag">{{$listing->price_base}} ₸</div>
                    <div class="property-status">Для продажи</div>

                    <div class="property-address">
                        <h4>{{$listing->city->name}}</h4>
                        <p>{{$listing->district->name}}</p>
                    </div>

                    <div class="property-stats">
                        <div class="stat-item">
                            <i class="bi bi-house"></i>
                            <div>
                                <span class="value">4</span>
                                <span class="label">Bedrooms</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <i class="bi bi-droplet"></i>
                            <div>
                                <span class="value">3</span>
                                <span class="label">Bathrooms</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <i class="bi bi-rulers"></i>
                            <div>
                                <span class="value">2,450</span>
                                <span class="label">Sq Ft</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <i class="bi bi-tree"></i>
                            <div>
                                <span class="value">0.25</span>
                                <span class="label">Acre Lot</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <i class="bi bi-calendar"></i>
                            <div>
                                <span class="value">2018</span>
                                <span class="label">Year Built</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <i class="bi bi-car-front"></i>
                            <div>
                                <span class="value">2</span>
                                <span class="label">Garage</span>
                            </div>
                        </div>
                    </div>

                    <!-- Agent Info -->
                    <div class="agent-info">
                        <div class="agent-avatar">
                            <img src="{{asset("assets/img/real-estate/agent-3.webp")}}" alt="Sarah Johnson" class="img-fluid">
                        </div>
                        <div class="agent-details">
                            <h4>{{$listing->user->name}}</h4>
{{--                            <p class="agent-title">Licensed Real Estate Agent</p>--}}
                            <p class="agent-phone"><i class="bi bi-telephone"></i>{{$listing->user->phone}}</p>
                            <p class="agent-email"><i class="bi bi-envelope"></i>{{$listing->user->email}}</p>
                        </div>
                    </div><!-- End Agent Info -->

                    <!-- Contact Form -->
                    <div class="contact-form">
                        <h4>Schedule a Tour</h4>
                        <form action="../../../../Users/user/Desktop/JUSUP%20TEMP/TheProperty/forms/contact.php" method="post" class="php-email-form">
                            <div class="row">
                                <div class="col-12 form-group">
                                    <input type="text" name="name" class="form-control" placeholder="Your Name" required="">
                                </div>
                                <div class="col-12 form-group">
                                    <input type="email" name="email" class="form-control" placeholder="Your Email" required="">
                                </div>
                                <div class="col-12 form-group">
                                    <input type="tel" name="phone" class="form-control" placeholder="Your Phone">
                                </div>

                                <div class="col-12 form-group">
                                    <input type="text" name="subject" class="form-control" placeholder="Schedule a Tour for date: " value="Schedule a Tour for date: ">
                                </div>

                                <div class="col-12 form-group">
                                    <textarea class="form-control" name="message" rows="4" placeholder="Your Message"></textarea>
                                </div>
                                <div class="col-12 text-center">
                                    <div class="loading">Loading</div>
                                    <div class="error-message"></div>
                                    <div class="sent-message">Your message has been sent. Thank you!</div>
                                    <button type="submit" class="btn btn-primary">Schedule Tour</button>
                                </div>
                            </div>
                        </form>
                    </div><!-- End Contact Form -->

                    <!-- Social Share -->
                    <div class="social-share">
                        <h5>Социальные сети</h5>
                        <div class="share-buttons">
                            <a href="#" class="share-btn facebook"><i class="bi bi-facebook"></i></a>
                            <a href="#" class="share-btn twitter"><i class="bi bi-twitter"></i></a>
                            <a href="#" class="share-btn whatsapp"><i class="bi bi-whatsapp"></i></a>
                            <a href="#" class="share-btn email"><i class="bi bi-envelope"></i></a>
                            <a href="#" class="share-btn print"><i class="bi bi-printer"></i></a>
                        </div>
                    </div><!-- End Social Share -->

                </div><!-- End Property Overview -->

            </div>

        </div>

    </div>

</section>
@endsection
