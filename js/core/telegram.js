// Telegram Mini App integration. In an ordinary browser this module is a no-op.
(function () {
    const webApp = window.Telegram && window.Telegram.WebApp;
    if (!webApp) return;

    // Telegram provides the profile photo in the Mini App user data when available.
    window.yetiTelegramPhotoUrl = function () {
        const photoUrl = webApp.initDataUnsafe && webApp.initDataUnsafe.user && webApp.initDataUnsafe.user.photo_url;
        return typeof photoUrl === 'string' && photoUrl.startsWith('https://') ? photoUrl : '';
    };

    try {
        if (typeof webApp.setHeaderColor === 'function') webApp.setHeaderColor('#87CEEB');
        if (typeof webApp.setBackgroundColor === 'function') webApp.setBackgroundColor('#87CEEB');
        if (typeof webApp.expand === 'function') webApp.expand();
    } catch (error) {
        console.warn('Telegram Mini App setup was not fully available.', error);
    }

    window.yetiTelegramReady = function () {
        if (typeof webApp.ready === 'function') webApp.ready();
    };
})();
