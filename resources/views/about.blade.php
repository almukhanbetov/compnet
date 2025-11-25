@extends('layouts.guest')
@section('content')
    <div class="page-title">
        <div class="heading">
            <div class="container">
                <div class="row d-flex justify-content-center text-center">
                    <div class="col-lg-8">
                        <h1 class="heading-title">Кто мы?</h1>
                        <p class="mb-0">
                            uibirzhasi.kz - созданная впервые мире биржа недвижимости, биржа встречных цен, цен продаж недвижимости и цен покупок недвижимости.
                        </p>
                    </div>
                </div>
            </div>
        </div>
        <nav class="breadcrumbs">
            <div class="container">
                <ol>
                    <li><a href="/">Главная</a></li>
                    <li class="current">О нас</li>
                </ol>
            </div>
        </nav>
    </div>
    <section id="about" class="about section">
        <div class="container" data-aos="fade-up" data-aos-delay="100">
            <div class="row align-items-center mb-5">
                <div class="col-lg-7">
                    <div class="intro-content" data-aos="fade-right" data-aos-delay="200">
                        <div class="section-badge">
                            <i class="bi bi-house-heart"></i>
                            <span>ТОО "CPA"</span>
                        </div>
                        <h2>Продадим вашу недвижимость</h2>
                        <p class="lead-text">Ежедневно в 00.00 Астаны цены продаж недвижимости снижаются на 1%, а цены покупок недвижимости повышаются на 1%. При совпадении основных характеристик недвижимости и цен с точностью до 2% продавцу и покупателю высылаются уведомления по ватсапу. В уведомлении будет указано что есть контрагент за номером таким то с ценой такой то, являющейся арифметической средней между ценами продавца и покупателя, которые отличаются максимум на 2%. Получив уведомление продавец или покупатель может посмотреь контактные данные контрагента внеся 1% от стоимости недвижимости указанной в уведомлении на депозит на счет ТОО "СРА", являющийся владельцем данного сайта. В случае срыва сделки депозит возвращается вносителю.</p>
                        <p>uibirzhasi.kz - созданная впервые мире биржа недвижимости, биржа встречных цен, цен продаж недвижимости и цен покупок недвижимости.</p>

                        <div class="founder-highlight" data-aos="fade-up" data-aos-delay="300">
                            <div class="founder-image">
                                <img src="assets/img/person/person-m-7.webp" alt="Founder" class="img-fluid">
                            </div>
                            <div class="founder-info">
                                <blockquote>uibirzhasi.kz - созданная впервые мире биржа недвижимости, биржа встречных цен, цен продаж недвижимости и цен покупок недвижимости.</blockquote>
                                <div class="founder-details">
                                    <h5>Аимбетов Жусуп Шаймерденович</h5>
                                    <span>ТОО "CPA"</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="visual-section" data-aos="fade-left" data-aos-delay="250">
                        <div class="main-image">
                            <img src="assets/img/real-estate/property-exterior-7.webp" alt="Luxury Development" class="img-fluid">
                            <div class="experience-badge">
                                <div class="badge-number">14+</div>
                                <div class="badge-text">Years of Excellence</div>
                            </div>
                        </div>
                        <div class="overlay-image">
                            <img src="assets/img/real-estate/property-interior-6.webp" alt="Interior Design" class="img-fluid">
                        </div>
                    </div>
                </div>
            </div>

{{--            <div class="achievements-grid" data-aos="fade-up" data-aos-delay="350">--}}
{{--                <div class="row text-center">--}}
{{--                    <div class="col-lg-3 col-md-6 mb-4">--}}
{{--                        <div class="achievement-item" data-aos="zoom-in" data-aos-delay="400">--}}
{{--                            <div class="achievement-icon">--}}
{{--                                <i class="bi bi-key"></i>--}}
{{--                            </div>--}}
{{--                            <div class="achievement-number">--}}
{{--                                <span data-purecounter-start="0" data-purecounter-end="2850" data-purecounter-duration="2" class="purecounter"></span>+--}}
{{--                            </div>--}}
{{--                            <div class="achievement-label">Properties Sold</div>--}}
{{--                        </div>--}}
{{--                    </div>--}}
{{--                    <div class="col-lg-3 col-md-6 mb-4">--}}
{{--                        <div class="achievement-item" data-aos="zoom-in" data-aos-delay="450">--}}
{{--                            <div class="achievement-icon">--}}
{{--                                <i class="bi bi-heart-fill"></i>--}}
{{--                            </div>--}}
{{--                            <div class="achievement-number">--}}
{{--                                <span data-purecounter-start="0" data-purecounter-end="98" data-purecounter-duration="2" class="purecounter"></span>%--}}
{{--                            </div>--}}
{{--                            <div class="achievement-label">Client Satisfaction</div>--}}
{{--                        </div>--}}
{{--                    </div>--}}
{{--                    <div class="col-lg-3 col-md-6 mb-4">--}}
{{--                        <div class="achievement-item" data-aos="zoom-in" data-aos-delay="500">--}}
{{--                            <div class="achievement-icon">--}}
{{--                                <i class="bi bi-geo-alt"></i>--}}
{{--                            </div>--}}
{{--                            <div class="achievement-number">--}}
{{--                                <span data-purecounter-start="0" data-purecounter-end="35" data-purecounter-duration="2" class="purecounter"></span>--}}
{{--                            </div>--}}
{{--                            <div class="achievement-label">Cities Covered</div>--}}
{{--                        </div>--}}
{{--                    </div>--}}
{{--                    <div class="col-lg-3 col-md-6 mb-4">--}}
{{--                        <div class="achievement-item" data-aos="zoom-in" data-aos-delay="550">--}}
{{--                            <div class="achievement-icon">--}}
{{--                                <i class="bi bi-award"></i>--}}
{{--                            </div>--}}
{{--                            <div class="achievement-number">--}}
{{--                                <span data-purecounter-start="0" data-purecounter-end="127" data-purecounter-duration="2" class="purecounter"></span>--}}
{{--                            </div>--}}
{{--                            <div class="achievement-label">Industry Awards</div>--}}
{{--                        </div>--}}
{{--                    </div>--}}
{{--                </div>--}}
{{--            </div><!-- End Achievements Grid -->--}}

{{--            <div class="timeline-section" data-aos="fade-up" data-aos-delay="400">--}}
{{--                <div class="row justify-content-center">--}}
{{--                    <div class="col-lg-10">--}}
{{--                        <div class="section-header text-center mb-5">--}}
{{--                            <h3>Our Journey of Excellence</h3>--}}
{{--                            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.</p>--}}
{{--                        </div>--}}

{{--                        <div class="timeline">--}}
{{--                            <div class="timeline-item" data-aos="fade-right" data-aos-delay="450">--}}
{{--                                <div class="timeline-year">2010</div>--}}
{{--                                <div class="timeline-content">--}}
{{--                                    <h4>Company Founded</h4>--}}
{{--                                    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>--}}
{{--                                </div>--}}
{{--                            </div>--}}
{{--                            <div class="timeline-item" data-aos="fade-left" data-aos-delay="500">--}}
{{--                                <div class="timeline-year">2015</div>--}}
{{--                                <div class="timeline-content">--}}
{{--                                    <h4>1000th Property Milestone</h4>--}}
{{--                                    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>--}}
{{--                                </div>--}}
{{--                            </div>--}}
{{--                            <div class="timeline-item" data-aos="fade-right" data-aos-delay="550">--}}
{{--                                <div class="timeline-year">2020</div>--}}
{{--                                <div class="timeline-content">--}}
{{--                                    <h4>Digital Innovation Launch</h4>--}}
{{--                                    <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>--}}
{{--                                </div>--}}
{{--                            </div>--}}
{{--                            <div class="timeline-item" data-aos="fade-left" data-aos-delay="600">--}}
{{--                                <div class="timeline-year">2024</div>--}}
{{--                                <div class="timeline-content">--}}
{{--                                    <h4>Regional Expansion</h4>--}}
{{--                                    <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti.</p>--}}
{{--                                </div>--}}
{{--                            </div>--}}
{{--                        </div>--}}
{{--                    </div>--}}
{{--                </div>--}}
{{--            </div><!-- End Timeline Section -->--}}

{{--            <div class="team-preview" data-aos="fade-up" data-aos-delay="450">--}}
{{--                <div class="row justify-content-center">--}}
{{--                    <div class="col-lg-8 text-center">--}}
{{--                        <h3>Meet Our Expert Team</h3>--}}
{{--                        <p class="team-description">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua quis nostrud exercitation.</p>--}}

{{--                        <div class="team-grid">--}}
{{--                            <div class="row justify-content-center">--}}
{{--                                <div class="col-lg-4 col-md-6 mb-4">--}}
{{--                                    <div class="team-member" data-aos="flip-up" data-aos-delay="500">--}}
{{--                                        <div class="member-image">--}}
{{--                                            <img src="assets/img/real-estate/agent-5.webp" alt="Team Member" class="img-fluid">--}}
{{--                                        </div>--}}
{{--                                        <div class="member-info">--}}
{{--                                            <h5>Sarah Martinez</h5>--}}
{{--                                            <span>Senior Property Advisor</span>--}}
{{--                                        </div>--}}
{{--                                    </div>--}}
{{--                                </div>--}}
{{--                                <div class="col-lg-4 col-md-6 mb-4">--}}
{{--                                    <div class="team-member" data-aos="flip-up" data-aos-delay="550">--}}
{{--                                        <div class="member-image">--}}
{{--                                            <img src="assets/img/real-estate/agent-2.webp" alt="Team Member" class="img-fluid">--}}
{{--                                        </div>--}}
{{--                                        <div class="member-info">--}}
{{--                                            <h5>David Chen</h5>--}}
{{--                                            <span>Investment Specialist</span>--}}
{{--                                        </div>--}}
{{--                                    </div>--}}
{{--                                </div>--}}
{{--                            </div>--}}
{{--                        </div>--}}

{{--                        <a href="team.html" class="view-team-btn">View Full Team</a>--}}
{{--                    </div>--}}
{{--                </div>--}}
{{--            </div><!-- End Team Preview -->--}}

        </div>

    </section><!-- /About Section -->

@endsection

