// link.js - Handles all URL/shortening/share functionality

document.addEventListener('DOMContentLoaded', function() {
    const generatedLink = document.getElementById('generatedLink');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const copyFeedback = document.querySelector('.copy-feedback');
    const nativeShareBtn = document.getElementById('nativeShareBtn');
    const generateCardBtn = document.getElementById('generateCard');

    // Card data reference (shared with script.js)
    let cardData = window.cardData || {
        sender: '',
        recipient: '',
        message: '',
        style: 'random',
        bkash: '',
        nagad: ''
    };

    // Initialize
    setupLinkEventListeners();

    function setupLinkEventListeners() {
        copyLinkBtn.addEventListener('click', copyLinkToClipboard);
        document.querySelectorAll('.share-btn[data-platform]').forEach(btn => {
            btn.addEventListener('click', shareOnPlatform);
        });

        if (navigator.share) {
            nativeShareBtn.addEventListener('click', nativeShare);
        } else {
            nativeShareBtn.style.display = 'none';
        }

        // Listen for card generation to trigger link generation
        generateCardBtn.addEventListener('click', function() {
            setTimeout(generateShareLink, 0);
        });
    }

    async function shortenWithYourls(longUrl) {
        const yourlsApi = 'https://adha.letter-box.xyz/url/yourls-api.php';
        const signature = 'f46dcd4268';

        try {
            const response = await fetch(`${yourlsApi}?signature=${signature}&action=shorturl&url=${encodeURIComponent(longUrl)}&format=json`);
            const data = await response.json();
            return data.status === 'success' ? data.shorturl : longUrl;
        } catch (error) {
            console.error('URL shortening failed:', error);
            return longUrl;
        }
    }

    async function generateShareLink() {
        const baseUrl = window.location.href.split('?')[0];
        const params = new URLSearchParams();
        params.append('sender', encodeURIComponent(cardData.sender));
        params.append('recipient', encodeURIComponent(cardData.recipient));
        params.append('message', encodeURIComponent(cardData.message.replace(/\r?\n/g, '\n')));
        if (cardData.bkash) params.append('bkash', cardData.bkash);
        if (cardData.nagad) params.append('nagad', cardData.nagad);

        const longUrl = `${baseUrl.replace(/\/$/, '')}/pages/${cardData.style}/?${params.toString()}`;
        generatedLink.value = "Generating short link...";

        try {
            generatedLink.value = await shortenWithYourls(longUrl);
        } catch (error) {
            generatedLink.value = longUrl;
            console.error("URL shortening failed:", error);
        }

        document.querySelectorAll('.share-btn').forEach(btn => btn.disabled = false);
    }

    function copyLinkToClipboard() {
        generatedLink.select();
        document.execCommand('copy');
        copyFeedback.classList.add('show');
        setTimeout(() => copyFeedback.classList.remove('show'), 2000);
    }

    function shareOnPlatform() {
        const platform = this.dataset.platform;
        const url = encodeURIComponent(generatedLink.value);
        const text = encodeURIComponent(`Eid Mubarak ${cardData.recipient}!`);
        let shareUrl = '';
        switch (platform) {
            case 'whatsapp': shareUrl = `https://wa.me/?text=${text} ${url}`; break;
            case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break;
            case 'telegram': shareUrl = `https://t.me/share/url?url=${url}&text=${text}`; break;
        }
        window.open(shareUrl, '_blank');
    }

    function nativeShare() {
        navigator.share({
            title: 'Eid Card',
            text: `For ${cardData.recipient}`,
            url: generatedLink.value
        }).catch(console.error);
    }
});