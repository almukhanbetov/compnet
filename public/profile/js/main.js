document.addEventListener("DOMContentLoaded", function () {
    const photoInput = document.getElementById("photoInput");
    const previewContainer = document.getElementById("previewContainer");

    if (!photoInput || !previewContainer) return;

    let images = [];        // список base64 для предпросмотра
    let files = [];         // реальные File-объекты для отправки
    let currentIndex = 0;

    photoInput.addEventListener("change", function (event) {
        const selectedFiles = Array.from(event.target.files);
        previewContainer.innerHTML = "";
        images = [];
        files = selectedFiles;

        selectedFiles.forEach((file, index) => {
            if (!file.type.startsWith("image/")) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const src = e.target.result;
                images.push(src);

                // --- Миниатюра ---
                const wrapper = document.createElement("div");
                wrapper.classList.add("preview-wrapper");

                const img = document.createElement("img");
                img.src = src;
                img.classList.add("preview-thumb");
                img.onload = () => img.classList.add("loaded");

                // --- Кнопка удаления ---
                const delBtn = document.createElement("button");
                delBtn.classList.add("delete-btn");
                delBtn.innerHTML = "🗑";
                delBtn.title = "Удалить фото";

                delBtn.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    wrapper.remove();
                    files.splice(index, 1);
                    images.splice(index, 1);
                    updateFileInput();
                });

                // --- Клик для просмотра ---
                img.addEventListener("click", function () {
                    openImageModal(images.indexOf(src));
                });

                wrapper.appendChild(img);
                wrapper.appendChild(delBtn);
                previewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    });

    // Обновляем input после удаления
    function updateFileInput() {
        const dataTransfer = new DataTransfer();
        files.forEach(f => dataTransfer.items.add(f));
        photoInput.files = dataTransfer.files;
    }

    // ======= Модальное окно Bootstrap =======
    function openImageModal(index) {
        currentIndex = index;
        if (images.length === 0) return;

        let modal = document.getElementById("photoModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.classList.add("modal", "fade");
            modal.id = "photoModal";
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 bg-transparent text-center position-relative">
                        <button type="button" class="btn-close position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" aria-label="Close"></button>
                        <img id="modalImage" src="" class="img-fluid rounded-3 shadow-lg" style="max-height:80vh; object-fit:contain;">
                        <button id="prevBtn" class="btn btn-light position-absolute top-50 start-0 translate-middle-y ms-3 rounded-circle shadow-sm">
                            <i class="bi bi-chevron-left fs-4"></i>
                        </button>
                        <button id="nextBtn" class="btn btn-light position-absolute top-50 end-0 translate-middle-y me-3 rounded-circle shadow-sm">
                            <i class="bi bi-chevron-right fs-4"></i>
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const modalImg = modal.querySelector("#modalImage");
        modalImg.src = images[currentIndex];

        const prevBtn = modal.querySelector("#prevBtn");
        const nextBtn = modal.querySelector("#nextBtn");
        prevBtn.onclick = showPrev;
        nextBtn.onclick = showNext;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        document.getElementById("modalImage").src = images[currentIndex];
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        document.getElementById("modalImage").src = images[currentIndex];
    }
});
