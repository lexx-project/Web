// Data produk
const products = {
    'panel': {
        title: 'Panel Pterodactyl',
        description: 'Panel Pterodactyl untuk hosting game server Anda dengan performa tinggi dan fitur lengkap.',
        price: '50.000',
        features: [
            'Setup lengkap dan siap pakai',
            'Optimasi performa server',
            'Backup otomatis',
            'Panel admin intuitif',
            'Dukungan teknis 24/7'
        ]
    },
    'bot': {
        title: 'Sewa Bot WhatsApp',
        description: 'Bot WhatsApp dengan fitur lengkap untuk otomatisasi pesan dan manajemen grup.',
        price: '25.000',
        features: [
            'Auto-reply pesan',
            'Manajemen grup otomatis',
            'Integrasi dengan API eksternal',
            'Statistik penggunaan',
            'Update fitur berkala'
        ]
    },
    'script': {
        title: 'Script Bot WhatsApp',
        description: 'Script bot WhatsApp yang dapat dimodifikasi sesuai kebutuhan Anda.',
        price: '150.000',
        features: [
            'Source code lengkap',
            'Dokumentasi terperinci',
            'Panduan instalasi',
            'Free update 1 bulan',
            'Konsultasi implementasi'
        ]
    }
};

// Fungsi untuk memuat detail produk
function loadProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productType = urlParams.get('type');
    const product = products[productType];

    if (product) {
        document.getElementById('productTitle').textContent = product.title;
        document.getElementById('productDescription').textContent = product.description;
        document.getElementById('productPrice').textContent = `Rp ${product.price}`;

        const featuresList = document.getElementById('featuresList');
        featuresList.innerHTML = '';
        product.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featuresList.appendChild(li);
        });
    }
}

// Fungsi untuk menampilkan modal pembayaran
async function showPaymentModal(productType) {
    const modal = document.getElementById('paymentModal');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const qrContainer = document.getElementById('qrContainer');
    
    // Tampilkan modal
    modal.classList.add('show');
    loadingSpinner.style.display = 'block';
    qrContainer.style.display = 'none';
    
    const product = products[productType];
    if (product) {
        try {
            // Ambil QR code dari server
            const amount = product.price.replace(/\D/g, ''); // Hapus semua karakter non-digit
            const response = await fetch('http://localhost:3000/api/get-qr-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount,
                    productName: product.title
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get QR code');
            }

            const data = await response.json();
            
            // Tampilkan QR code
            const qrCodeImg = document.getElementById('qrCode');
            qrCodeImg.src = `http://localhost:3000/${data.qrCodePath.replace(/\\/g, '/')}`;
            
            loadingSpinner.style.display = 'none';
            qrContainer.style.display = 'block';
        } catch (error) {
            console.error('Error getting QR code:', error);
            closePaymentModal();
            alert('Terjadi kesalahan saat memuat QR code. Silakan coba lagi.');
        }
    }
}

// Fungsi untuk menutup modal pembayaran
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('show');
}

// Event listener untuk menutup modal saat mengklik di luar modal
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closePaymentModal();
    }
};

// Load product details when the page loads
if (window.location.pathname.includes('product.html')) {
    loadProductDetails();
}