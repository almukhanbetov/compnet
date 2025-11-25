<footer id="footer" class="footer position-relative">

    <div class="container">
        <div class="row gy-5">

            <div class="col-lg-4">
                <div class="footer-content">
                    <a href="#" class="logo d-flex align-items-center mb-4">
                        <span class="sitename">ТОО "CPA"</span>
                    </a>
                    <p class="mb-4">Впервые в мире биржа недвижимости</p>

                    <div class="newsletter-form">
                        <h5>Оставайтесь в курсе</h5>
                        <form action="../../../../Users/user/Desktop/JUSUP%20TEMP/TheProperty/forms/newsletter.php" method="post" class="php-email-form">
                            <div class="input-group">
                                <input type="email" name="email" class="form-control" placeholder="Enter your email" required="">
                                <button type="submit" class="btn-subscribe">
                                    <i class="bi bi-send"></i>
                                </button>
                            </div>
                            <div class="loading">Загрузка ...</div>
                            <div class="error-message"></div>
                            <div class="sent-message">Спасибо за отправление!</div>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-lg-2 col-6">
                <div class="footer-links">
                    <h4>Меню</h4>
                    <ul>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> Главная</a></li>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> О нас</a></li>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> Продажа</a></li>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> Покупка</a></li>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> Контакты</a></li>
                    </ul>
                </div>
            </div>

            <div class="col-lg-2 col-6">
                <div class="footer-links">
                    <h4>Решения</h4>
                    <ul>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> Поиск </a></li>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> Предложения</a></li>
                        <li><a href="#"><i class="bi bi-chevron-right"></i> Совпадения</a></li>

                    </ul>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="footer-contact">
                    <h4>Контакты:</h4>
                    <div class="contact-item">
                        <div class="contact-icon">
                            <i class="bi bi-geo-alt"></i>
                        </div>
                        <div class="contact-info">
                            <p>ул. Алтаева, дом 56 <br>Алмат,Илийский район, пос. Жапек Батыр<br>РК</p>
                        </div>
                    </div>

                    <div class="contact-item">
                        <div class="contact-icon">
                            <i class="bi bi-telephone"></i>
                        </div>
                        <div class="contact-info">
                            <p>+77027897120</p>
                        </div>
                    </div>

                    <div class="contact-item">
                        <div class="contact-icon">
                            <i class="bi bi-envelope"></i>
                        </div>
                        <div class="contact-info">
                            <p>zhusup@mail.ru</p>
                        </div>
                    </div>

                    <div class="social-links">
                        <a href="#"><i class="bi bi-facebook"></i></a>
                        <a href="#"><i class="bi bi-twitter-x"></i></a>
                        <a href="#"><i class="bi bi-linkedin"></i></a>
                        <a href="#"><i class="bi bi-youtube"></i></a>
                        <a href="#"><i class="bi bi-github"></i></a>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div class="footer-bottom">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-lg-6">
                    <div class="copyright">
                        <p>© <span>Copyright</span> <strong class="px-1 sitename">MyWebsite</strong> <span>uilbirzhasi.kz</span></p>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="footer-bottom-links">
                        <a href="#"></a>
                        <a href="#"></a>
                        <a href="#"></a>
                    </div>
                </div>
            </div>
        </div>
    </div>

</footer>
<a href="#" id="scroll-top" class="scroll-top d-flex align-items-center justify-content-center"><i class="bi bi-arrow-up-short"></i></a>
<div id="preloader"></div>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.inputmask/5.0.9/jquery.inputmask.min.js"></script>
<script src="{{asset("assets/vendor/bootstrap/js/bootstrap.bundle.min.js")}}"></script>
<script src="{{asset("assets/vendor/php-email-form/validate.js")}}"></script>
<script src="{{asset("assets/vendor/aos/aos.js")}}"></script>
<script src="{{asset("assets/vendor/purecounter/purecounter_vanilla.js")}}"></script>
<script src="{{asset("assets/vendor/glightbox/js/glightbox.min.js")}}"></script>
<script src="{{asset("assets/vendor/swiper/swiper-bundle.min.js")}}"></script>
<script src="{{asset("assets/vendor/drift-zoom/Drift.min.js")}}"></script>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script>
    document.querySelector('form#filterForm')?.addEventListener('change', async function(e) {
        e.preventDefault();

        const form = e.target.closest('form');
        const formData = new FormData(form);
        const params = new URLSearchParams(formData).toString();

        const container = document.getElementById('listing-container');
        container.innerHTML = '<div class="text-center p-5"><div class="spinner-border"></div><p>Загрузка...</p></div>';

        try {
            const { data } = await axios.get(`/listings/ajax?${params}`);
            container.innerHTML = data;
        } catch (error) {
            container.innerHTML = '<div class="text-danger text-center p-5">Ошибка загрузки</div>';
            console.error(error);
        }
    });
</script>


<!-- Main JS File -->
<script src="{{asset("assets/js/main.js")}}"></script>

</body>

</html>
