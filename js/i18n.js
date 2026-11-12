// ===== INTERNATIONALISATION =====
// Multi-language UI support.
// Usage:
//   import { t, applyLang, currentLang, LANGUAGES } from './i18n.js';
//   t('startBtn')          // → translated string in currentLang
//   applyLang('en')        // swap all [data-i18n] elements + re-render JS text

// ---------- Language metadata ----------
// Each entry: { code, name (native), flag, dir }
export const LANGUAGES = [
    { code: 'he', name: 'עברית',    flag: '🇮🇱', dir: 'rtl' },
    { code: 'en', name: 'English',  flag: '🇺🇸', dir: 'ltr' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
    { code: 'ru', name: 'Русский',  flag: '🇷🇺', dir: 'ltr' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
    { code: 'es', name: 'Español',  flag: '🇪🇸', dir: 'ltr' },
];

const STRINGS = {
    // ---- HUD ----
    score:            { he: 'ניקוד: ',   en: 'Score: ',    ar: 'النتيجة: ', ru: 'Счёт: ',    fr: 'Score : ',   es: 'Puntos: ' },
    hp:               { he: 'HP: ',      en: 'HP: ',       ar: 'الصحة: ',   ru: 'HP: ',      fr: 'PV : ',      es: 'VP: ' },
    level:            { he: 'שלב: ',    en: 'Level: ',    ar: 'المستوى: ', ru: 'Уровень: ', fr: 'Niveau : ',  es: 'Nivel: ' },

    // ---- Gamepad ----
    gamepadConnected:    { he: '🎮 שלט חובר', en: '🎮 Controller connected', ar: '🎮 تم توصيل وحدة التحكم', ru: '🎮 Геймпад подключён', fr: '🎮 Manette connectée', es: '🎮 Mando conectado' },
    gamepadDisconnected: { he: '🎮 שלט נותק', en: '🎮 Controller disconnected', ar: '🎮 تم فصل وحدة التحكم', ru: '🎮 Геймпад отключён', fr: '🎮 Manette déconnectée', es: '🎮 Mando desconectado' },

    // ---- Main menu ----
    gameTitle:        { he: 'מגיני החלל', en: 'Space Defender', ar: 'حارس الفضاء', ru: 'Защитник Космоса', fr: 'Défenseur de l\'Espace', es: 'Defensor del Espacio' },
    subTitle:         { he: 'בחר ספינה וצא למשימה', en: 'Choose a ship and start your mission', ar: 'اختر سفينة وابدأ مهمتك', ru: 'Выберите корабль и начните миссию', fr: 'Choisissez un vaisseau et commencez votre mission', es: 'Elige una nave y comienza tu misión' },
    startBtn:         { he: 'צא למשימה', en: 'Start Mission', ar: 'ابدأ المهمة', ru: 'Начать миссию', fr: 'Démarrer la mission', es: 'Iniciar misión' },
    loginBtn:         { he: '🔐 התחבר',  en: '🔐 Login',   ar: '🔐 تسجيل الدخول', ru: '🔐 Войти', fr: '🔐 Connexion', es: '🔐 Iniciar sesión' },
    leaderboardBtn:   { he: '🏆 לוח שיאים', en: '🏆 Leaderboard', ar: '🏆 لوحة الصدارة', ru: '🏆 Рейтинг', fr: '🏆 Classement', es: '🏆 Clasificación' },
    settingsBtn:      { he: '⚙️ הגדרות', en: '⚙️ Settings', ar: '⚙️ الإعدادات', ru: '⚙️ Настройки', fr: '⚙️ Paramètres', es: '⚙️ Ajustes' },

    // ---- Auth ----
    authTitle:        { he: '🔐 התחברות', en: '🔐 Sign In', ar: '🔐 تسجيل الدخول', ru: '🔐 Вход', fr: '🔐 Connexion', es: '🔐 Iniciar sesión' },
    googleBtn:        { he: '🔵 התחבר עם Google', en: '🔵 Sign in with Google', ar: '🔵 تسجيل الدخول بـ Google', ru: '🔵 Войти через Google', fr: '🔵 Se connecter avec Google', es: '🔵 Entrar con Google' },
    orSep:            { he: 'או', en: 'or', ar: 'أو', ru: 'или', fr: 'ou', es: 'o' },
    loginFormTitle:   { he: 'התחבר עם מייל', en: 'Sign in with email', ar: 'تسجيل الدخول بالبريد', ru: 'Войти по email', fr: 'Connexion par email', es: 'Entrar con email' },
    loginEmailPh:     { he: 'מייל', en: 'Email', ar: 'البريد الإلكتروني', ru: 'Email', fr: 'Email', es: 'Correo' },
    loginPassPh:      { he: 'סיסמה', en: 'Password', ar: 'كلمة المرور', ru: 'Пароль', fr: 'Mot de passe', es: 'Contraseña' },
    loginSubmit:      { he: 'התחבר', en: 'Sign In', ar: 'دخول', ru: 'Войти', fr: 'Connexion', es: 'Entrar' },
    noAccount:        { he: 'אין לך חשבון?', en: "Don't have an account?", ar: 'ليس لديك حساب؟', ru: 'Нет аккаунта?', fr: 'Pas de compte ?', es: '¿Sin cuenta?' },
    registerHere:     { he: 'הירשם כאן', en: 'Register here', ar: 'سجّل هنا', ru: 'Зарегистрируйтесь', fr: 'Inscrivez-vous ici', es: 'Regístrate aquí' },
    signupFormTitle:  { he: 'הרשמה', en: 'Sign Up', ar: 'إنشاء حساب', ru: 'Регистрация', fr: 'Inscription', es: 'Registro' },
    signupNamePh:     { he: 'שם מלא', en: 'Full name', ar: 'الاسم الكامل', ru: 'Полное имя', fr: 'Nom complet', es: 'Nombre completo' },
    signupEmailPh:    { he: 'מייל', en: 'Email', ar: 'البريد الإلكتروني', ru: 'Email', fr: 'Email', es: 'Correo' },
    signupPassPh:     { he: 'סיסמה (לפחות 6 תווים)', en: 'Password (min 6 chars)', ar: 'كلمة المرور (6 أحرف على الأقل)', ru: 'Пароль (мин. 6 символов)', fr: 'Mot de passe (6 car. min)', es: 'Contraseña (mín. 6 chars)' },
    signupSubmit:     { he: 'הירשם', en: 'Sign Up', ar: 'تسجيل', ru: 'Зарегистрироваться', fr: "S'inscrire", es: 'Registrarse' },
    haveAccount:      { he: 'כבר יש לך חשבון?', en: 'Already have an account?', ar: 'لديك حساب بالفعل؟', ru: 'Уже есть аккаунт?', fr: 'Déjà un compte ?', es: '¿Ya tienes cuenta?' },
    loginHere:        { he: 'התחבר כאן', en: 'Login here', ar: 'سجّل دخولك هنا', ru: 'Войдите здесь', fr: 'Connectez-vous ici', es: 'Entra aquí' },
    backToMenu:       { he: '◀ חזרה לתפריט', en: '◀ Back to menu', ar: '◀ العودة للقائمة', ru: '◀ В меню', fr: '◀ Menu', es: '◀ Menú' },

    // ---- User profile ----
    userNameLabel:    { he: 'שם משתמש', en: 'Username', ar: 'اسم المستخدم', ru: 'Имя пользователя', fr: "Nom d'utilisateur", es: 'Nombre de usuario' },
    editName:         { he: '✏️ ערוך שם', en: '✏️ Edit name', ar: '✏️ تعديل الاسم', ru: '✏️ Изменить имя', fr: '✏️ Modifier le nom', es: '✏️ Editar nombre' },
    logout:           { he: '🚪 התנתק', en: '🚪 Logout', ar: '🚪 تسجيل الخروج', ru: '🚪 Выйти', fr: '🚪 Déconnexion', es: '🚪 Cerrar sesión' },
    startGame:        { he: '🎮 התחל משחק', en: '🎮 Start Game', ar: '🎮 ابدأ اللعبة', ru: '🎮 Начать игру', fr: '🎮 Jouer', es: '🎮 Jugar' },

    // ---- Leaderboard ----
    lbOverall:        { he: '🏆 כללי', en: '🏆 Overall', ar: '🏆 الكل', ru: '🏆 Все', fr: '🏆 Général', es: '🏆 General' },
    lbBack:           { he: 'חזרה', en: 'Back', ar: 'رجوع', ru: 'Назад', fr: 'Retour', es: 'Volver' },
    saveStSaving:     { he: '☁️ שומר את התוצאה…', en: '☁️ Saving your result…', ar: '☁️ جارٍ حفظ النتيجة…', ru: '☁️ Сохраняем результат…', fr: '☁️ Enregistrement du résultat…', es: '☁️ Guardando tu resultado…' },
    saveStRecord:     { he: '🏆 שיא חדש! נשמר בטבלת השיאים', en: '🏆 New record! Saved to the leaderboard', ar: '🏆 رقم قياسي جديد! تم الحفظ في لوحة الصدارة', ru: '🏆 Новый рекорд! Сохранён в таблице лидеров', fr: '🏆 Nouveau record ! Enregistré au classement', es: '🏆 ¡Nuevo récord! Guardado en la clasificación' },
    saveStSkinRecord: { he: '🏆 שיא חדש לחללית הזו! נשמר בטבלה', en: '🏆 New record for this ship! Saved', ar: '🏆 رقم قياسي جديد لهذه السفينة! تم الحفظ', ru: '🏆 Новый рекорд для этого корабля! Сохранён', fr: '🏆 Nouveau record pour ce vaisseau ! Enregistré', es: '🏆 ¡Nuevo récord con esta nave! Guardado' },
    saveStKept:       { he: '✅ התוצאה נשמרה. השיא שלך בטבלה עדיין גבוה יותר', en: '✅ Result saved. Your leaderboard record is still higher', ar: '✅ تم حفظ النتيجة. رقمك القياسي ما زال أعلى', ru: '✅ Результат сохранён. Ваш рекорд в таблице всё ещё выше', fr: '✅ Résultat enregistré. Votre record reste plus élevé', es: '✅ Resultado guardado. Tu récord sigue siendo más alto' },
    saveStGuest:      { he: '💾 נשמר רק במכשיר הזה. התחבר כדי להופיע בטבלת השיאים', en: '💾 Saved on this device only. Sign in to appear on the leaderboard', ar: '💾 حُفظ على هذا الجهاز فقط. سجّل الدخول لتظهر في لوحة الصدارة', ru: '💾 Сохранено только на этом устройстве. Войдите, чтобы попасть в таблицу', fr: '💾 Enregistré sur cet appareil uniquement. Connectez-vous pour apparaître au classement', es: '💾 Guardado solo en este dispositivo. Inicia sesión para aparecer en la clasificación' },
    saveStFailQueued: { he: '⚠️ לא הצלחנו לשמור בטבלה. התוצאה שמורה במכשיר ותישלח אוטומטית', en: '⚠️ Could not reach the leaderboard. Your result is kept on this device and will be sent automatically', ar: '⚠️ تعذّر الحفظ في لوحة الصدارة. النتيجة محفوظة على الجهاز وستُرسل تلقائيًا', ru: '⚠️ Не удалось сохранить в таблицу. Результат сохранён на устройстве и отправится автоматически', fr: '⚠️ Classement injoignable. Le résultat est gardé sur cet appareil et sera envoyé automatiquement', es: '⚠️ No se pudo guardar en la clasificación. El resultado queda en este dispositivo y se enviará automáticamente' },
    saveStFail:       { he: '⚠️ התוצאה לא נשמרה בטבלת השיאים', en: '⚠️ Your result was not saved to the leaderboard', ar: '⚠️ لم تُحفظ النتيجة في لوحة الصدارة', ru: '⚠️ Результат не сохранён в таблице лидеров', fr: '⚠️ Le résultat n\'a pas été enregistré au classement', es: '⚠️ El resultado no se guardó en la clasificación' },
    saveStFlushed:    { he: '☁️ {n} תוצאות שחיכו נשמרו בטבלת השיאים', en: '☁️ {n} waiting result(s) saved to the leaderboard', ar: '☁️ تم حفظ {n} نتيجة منتظرة في لوحة الصدارة', ru: '☁️ Отложенных результатов сохранено: {n}', fr: '☁️ {n} résultat(s) en attente enregistré(s) au classement', es: '☁️ {n} resultado(s) pendiente(s) guardado(s) en la clasificación' },
    lbEmpty:          { he: 'אין עדיין שיאים 🎯...', en: 'No scores yet 🎯...', ar: 'لا نتائج بعد 🎯...', ru: 'Рекордов нет 🎯...', fr: 'Aucun score 🎯...', es: 'Sin puntuaciones 🎯...' },

    // ---- Settings general ----
    settingsTitle:    { he: '⚙️ הגדרות', en: '⚙️ Settings', ar: '⚙️ الإعدادات', ru: '⚙️ Настройки', fr: '⚙️ Paramètres', es: '⚙️ Ajustes' },
    settingsBack:     { he: 'חזרה', en: 'Back', ar: 'رجوع', ru: 'Назад', fr: 'Retour', es: 'Volver' },

    // ---- Settings tabs ----
    tabDevice:        { he: '📱 מכשיר', en: '📱 Device', ar: '📱 الجهاز', ru: '📱 Устройство', fr: '📱 Appareil', es: '📱 Dispositivo' },
    tabControls:      { he: '🎮 שליטה', en: '🎮 Controls', ar: '🎮 التحكم', ru: '🎮 Управление', fr: '🎮 Contrôles', es: '🎮 Controles' },
    tabRules:         { he: '📜 כללים', en: '📜 Rules', ar: '📜 القواعد', ru: '📜 Правила', fr: '📜 Règles', es: '📜 Reglas' },
    tabEdu:           { he: '📚 חינוכי', en: '📚 Education', ar: '📚 تعليمي', ru: '📚 Обучение', fr: '📚 Éducation', es: '📚 Educación' },
    tabDev:           { he: '💻 מפתחים', en: '💻 Dev', ar: '💻 المطورين', ru: '💻 Разработка', fr: '💻 Dev', es: '💻 Dev' },
    tabLang:          { he: '🌐 שפה', en: '🌐 Language', ar: '🌐 اللغة', ru: '🌐 Язык', fr: '🌐 Langue', es: '🌐 Idioma' },

    // ---- Device tab ----
    deviceLabel:      { he: 'סוג מכשיר:', en: 'Device type:', ar: 'نوع الجهاز:', ru: 'Тип устройства:', fr: "Type d'appareil :", es: 'Tipo de dispositivo:' },
    deviceMobile:     { he: '📱 טלפון', en: '📱 Mobile', ar: '📱 هاتف', ru: '📱 Телефон', fr: '📱 Mobile', es: '📱 Móvil' },
    deviceDesktop:    { he: '🖥️ מחשב', en: '🖥️ Desktop', ar: '🖥️ كمبيوتر', ru: '🖥️ ПК', fr: '🖥️ Bureau', es: '🖥️ Escritorio' },
    deviceNote:       { he: 'במצב טלפון, הגדרות המקשים מושבתות', en: 'In mobile mode, keyboard settings are disabled', ar: 'في وضع الهاتف، إعدادات لوحة المفاتيح معطّلة', ru: 'В мобильном режиме настройки клавиатуры недоступны', fr: 'En mode mobile, les paramètres clavier sont désactivés', es: 'En modo móvil, los ajustes de teclado están desactivados' },

    // ---- Controls tab ----
    controlLabel:     { he: 'שליטה בספינה:', en: 'Ship control:', ar: 'التحكم بالسفينة:', ru: 'Управление кораблём:', fr: 'Commande du vaisseau :', es: 'Control de nave:' },
    controlMouse:     { he: '🖱️ עכבר', en: '🖱️ Mouse', ar: '🖱️ ماوس', ru: '🖱️ Мышь', fr: '🖱️ Souris', es: '🖱️ Ratón' },
    controlArrows:    { he: '⬅️➡️ חצים', en: '⬅️➡️ Arrows', ar: '⬅️➡️ الأسهم', ru: '⬅️➡️ Стрелки', fr: '⬅️➡️ Flèches', es: '⬅️➡️ Flechas' },
    inputUsedLabel:   { he: 'אמצעי שליטה בפועל:', en: 'Input used:', ar: 'وسيلة التحكم المستخدمة:', ru: 'Использованный ввод:', fr: 'Commande utilisée :', es: 'Control usado:' },
    inputKeyboard:    { he: '⌨️ מקלדת', en: '⌨️ Keyboard', ar: '⌨️ لوحة المفاتيح', ru: '⌨️ Клавиатура', fr: '⌨️ Clavier', es: '⌨️ Teclado' },
    inputGamepad:     { he: '🎮 שלט', en: '🎮 Controller', ar: '🎮 وحدة تحكم', ru: '🎮 Геймпад', fr: '🎮 Manette', es: '🎮 Mando' },
    shootKeyLabel:    { he: 'מקש ירי:', en: 'Shoot key:', ar: 'مفتاح الإطلاق:', ru: 'Клавиша стрельبы:', fr: 'Touche tir :', es: 'Tecla disparo:' },
    shootKeyNote:     { he: 'לחץ על "שנה מקש" ואז לחץ על המקש הרצוי', en: 'Click "Change key" then press the desired key', ar: 'انقر على "تغيير المفتاح" ثم اضغط على المفتاح المطلوب', ru: 'Нажмите «Изменить клавишу», затем нужную клавишу', fr: 'Cliquez sur «Changer» puis appuyez sur la touche souhaitée', es: 'Haz clic en «Cambiar tecla» y luego presiona la tecla deseada' },
    abilityKeyLabel:  { he: 'מקש יכולת מיוחדת:', en: 'Special ability key:', ar: 'مفتاح القدرة الخاصة:', ru: 'Клавиша спецспособности:', fr: 'Touche compétence spéciale :', es: 'Tecla habilidad especial:' },
    rightClickLabel:  { he: 'קליק ימני ליכולת מיוחדת:', en: 'Right-click for special ability:', ar: 'النقر الأيمن للقدرة الخاصة:', ru: 'ПКМ для спецспособности:', fr: 'Clic droit pour compétence spéciale :', es: 'Clic derecho para habilidad especial:' },
    changeKey:        { he: 'שנה מקש', en: 'Change key', ar: 'تغيير المفتاح', ru: 'Изменить', fr: 'Changer', es: 'Cambiar' },
    listenKey:        { he: '...לחץ על מקש', en: '...Press a key', ar: '...اضغط على مفتاح', ru: '...Нажмите клавишу', fr: '...Appuyez sur une touche', es: '...Presiona una tecla' },
    rcOn:             { he: '✅ פעיל', en: '✅ On', ar: '✅ تشغيل', ru: '✅ Вкл', fr: '✅ Activé', es: '✅ Activado' },
    rcOff:            { he: '❌ כבוי', en: '❌ Off', ar: '❌ إيقاف', ru: '❌ Выкл', fr: '❌ Désactivé', es: '❌ Desactivado' },

    // ---- Rules tab ----
    enemiesAsteLabel: { he: 'אויבים יורים דרך סלעים:', en: 'Enemies shoot through asteroids:', ar: 'الأعداء يطلقون عبر الكويكبات:', ru: 'Враги стреляют сквозь астероиды:', fr: 'Les ennemis tirent à travers les astéroïdes :', es: 'Los enemigos disparan a través de asteroides:' },
    enemiesAsteNote:  { he: 'קליעי אויבים עוברים דרך אסטרואידים', en: 'Enemy bullets pass through asteroids', ar: 'طلقات الأعداء تمر عبر الكويكبات', ru: 'Пули врагов проходят сквозь астероиды', fr: 'Les balles ennemies traversent les astéroïdes', es: 'Las balas enemigas atraviesan asteroides' },
    playerAsteLabel:  { he: 'השחקן יורה דרך סלעים:', en: 'Player shoots through asteroids:', ar: 'اللاعب يطلق عبر الكويكبات:', ru: 'Игрок стреляет сквозь астероиды:', fr: 'Le joueur tire à travers les astéroïdes :', es: 'El jugador dispara a través de asteroides:' },
    playerAsteNote:   { he: 'הקליעים שלך עוברים דרך אסטרואידים', en: 'Your bullets pass through asteroids', ar: 'طلقاتك تمر عبر الكويكبات', ru: 'Ваши пули проходят сквозь астероиды', fr: 'Vos balles traversent les astéroïdes', es: 'Tus balas atraviesan asteroides' },
    yes:              { he: '✅ כן', en: '✅ Yes', ar: '✅ نعم', ru: '✅ Да', fr: '✅ Oui', es: '✅ Sí' },
    no:               { he: '❌ לא', en: '❌ No', ar: '❌ لا', ru: '❌ Нет', fr: '❌ Non', es: '❌ No' },

    // ---- Education tab ----
    eduLockedNote:    { he: '🔒 מצב חינוכי נעול. כדי לבטל יש להזין סיסמה — או שייפתח אוטומטית אחרי 45 דקות.', en: '🔒 Education mode locked. Enter the password to unlock — or it auto-opens after 45 minutes.', ar: '🔒 الوضع التعليمي مقفل. أدخل كلمة المرور للفتح — أو سيُفتح تلقائيًا بعد 45 دقيقة.', ru: '🔒 Учебный режим заблокирован. Введите пароль или подождите 45 минут.', fr: '🔒 Mode éducatif verrouillé. Entrez le mot de passe — ou il s\'ouvre automatiquement après 45 min.', es: '🔒 Modo educativo bloqueado. Ingresa la contraseña — o se abre automáticamente tras 45 min.' },
    eduUnlockPh:      { he: 'סיסמה לפתיחה', en: 'Password to unlock', ar: 'كلمة المرور للفتح', ru: 'Пароль для разблокировки', fr: 'Mot de passe pour déverrouiller', es: 'Contraseña para desbloquear' },
    eduUnlockBtn:     { he: '🔓 בטל נעילה', en: '🔓 Unlock', ar: '🔓 فتح', ru: '🔓 Разблокировать', fr: '🔓 Déverrouiller', es: '🔓 Desbloquear' },
    eduOnOffLabel:    { he: 'הפעלת מצב חינוכי:', en: 'Education mode:', ar: 'الوضع التعليمي:', ru: 'Учебный режим:', fr: 'Mode éducatif :', es: 'Modo educativo:' },
    eduOn:            { he: '✅ פעיל', en: '✅ On', ar: '✅ تشغيل', ru: '✅ Вкл', fr: '✅ Activé', es: '✅ Activado' },
    eduOff:           { he: '❌ כבוי', en: '❌ Off', ar: '❌ إيقاف', ru: '❌ Выкл', fr: '❌ Désactivé', es: '❌ Desactivado' },
    eduOnNote:        { he: 'שאלות יופיעו בעליית שלב, בהשמדת אויב ובתחילת המשחק (עם הפסקה של 10 שניות בין שאלות)', en: 'Questions appear on level-up, enemy kill and game start (10-second cooldown between questions)', ar: 'تظهر الأسئلة عند الترقي ومع قتل الأعداء وبداية اللعبة (فاصل 10 ثوان بين الأسئلة)', ru: 'Вопросы появляются при повышении уровня, уничтожении врага и старте (пауза 10 сек)', fr: 'Les questions apparaissent à la montée de niveau, à chaque ennemi tué et au démarrage (10 sec entre questions)', es: 'Preguntas al subir nivel, matar enemigos y al iniciar la partida (pausa de 10 segundos entre preguntas)' },
    subjectLabel:     { he: 'מקצוע:', en: 'Subject:', ar: 'المادة:', ru: 'Предмет:', fr: 'Matière :', es: 'Materia:' },
    gradeLabel_:      { he: 'כיתה:', en: 'Grade:', ar: 'الصف:', ru: 'Класс:', fr: 'Classe :', es: 'Curso:' },
    lockLabel:        { he: 'נעילת המצב הנוכחי עם סיסמה:', en: 'Lock current mode with a password:', ar: 'قفل الوضع الحالي بكلمة مرور:', ru: 'Заблокировать режим паролем:', fr: 'Verrouiller le mode avec un mot de passe :', es: 'Bloquear modo con contraseña:' },
    lockPh:           { he: 'בחר סיסמה', en: 'Choose a password', ar: 'اختر كلمة مرور', ru: 'Выберите пароль', fr: 'Choisissez un mot de passe', es: 'Elige una contraseña' },
    lockBtn:          { he: '🔒 נעל', en: '🔒 Lock', ar: '🔒 قفل', ru: '🔒 Заблокировать', fr: '🔒 Verrouiller', es: '🔒 Bloquear' },
    lockNote:         { he: 'לאחר נעילה לא ניתן לשנות מקצוע/כיתה או לכבות בלי הסיסמה. ייפתח אוטומטית אחרי 45 דקות.', en: 'Once locked the subject/grade cannot change without the password. Auto-unlocks after 45 min.', ar: 'بعد القفل لا يمكن تغيير المادة/الصف أو الإيقاف بدون كلمة المرور. يُفتح تلقائيًا بعد 45 دقيقة.', ru: 'После блокировки предмет/класс нельзя изменить без пароля. Автоматически разблокируется через 45 мин.', fr: 'Une fois verrouillé, la matière/classe ne peut être modifiée sans le mot de passe. Déverrouillage auto après 45 min.', es: 'Una vez bloqueado no se puede cambiar materia/curso sin contraseña. Se desbloquea automáticamente en 45 min.' },
    linkLabel:        { he: 'צור קישור חינוכי (לתלמידים/לכיתה):', en: 'Create education link (for students/class):', ar: 'إنشاء رابط تعليمي (للطلاب/الفصل):', ru: 'Создать учебную ссылку (для учеников/класса):', fr: 'Créer un lien éducatif (pour les élèves/la classe) :', es: 'Crear enlace educativo (para alumnos/clase):' },
    linkPh:           { he: 'סיסמה (ריק = ללא נעילה)', en: 'Password (empty = no lock)', ar: 'كلمة المرور (فارغ = بدون قفل)', ru: 'Пароль (пусто = без блокировки)', fr: 'Mot de passe (vide = sans verrou)', es: 'Contraseña (vacío = sin bloqueo)' },
    linkBtn:          { he: '🔗 צור קישור', en: '🔗 Create link', ar: '🔗 إنشاء رابط', ru: '🔗 Создать ссылку', fr: '🔗 Créer le lien', es: '🔗 Crear enlace' },
    linkNote:         { he: 'הקישור מקבע את המקצוע והכיתה שנבחרו. עם סיסמה — נעול ל-45 דקות. בלי סיסמה — רק בוחר מקצוע וכיתה, ללא נעילה.', en: 'The link fixes the selected subject/grade. With password — locked for 45 min. Without — just preselects.', ar: 'الرابط يثبّت المادة والصف المختارين. مع كلمة مرور — مقفل 45 دقيقة. بدونها — يختار فقط.', ru: 'Ссылка фиксирует предмет и класс. С паролем — заблокировано на 45 мин. Без — только предвыбор.', fr: 'Le lien fixe la matière/classe choisie. Avec mot de passe — verrouillé 45 min. Sans — présélection seulement.', es: 'El enlace fija la materia/curso elegidos. Con contraseña — bloqueado 45 min. Sin — solo preselección.' },
    copyLink:         { he: '📋 העתק קישור', en: '📋 Copy link', ar: '📋 نسخ الرابط', ru: '📋 Копировать ссылку', fr: '📋 Copier le lien', es: '📋 Copiar enlace' },
    linkPlaceholder:  { he: 'הקישור יופיע כאן', en: 'Link will appear here', ar: 'سيظهر الرابط هنا', ru: 'Ссылка появится здесь', fr: 'Le lien apparaîtra ici', es: 'El enlace aparecerá aquí' },
    manageLabel:      { he: 'ניהול הכיתה (מי שיצר את הסיסמה):', en: 'Class management (password creator):', ar: 'إدارة الفصل (من أنشأ كلمة المرور):', ru: 'Управление классом (создатель пароля):', fr: 'Gestion de la classe (créateur du mot de passe) :', es: 'Gestión de clase (creador de contraseña):' },
    unlockAll:        { he: '🔓 פתח לכולם', en: '🔓 Unlock everyone', ar: '🔓 فتح الجميع', ru: '🔓 Разблокировать всех', fr: '🔓 Déverrouiller tout le monde', es: '🔓 Desbloquear a todos' },
    participantsNote: { he: 'רשימת המחוברים לקישור הזה. אפשר לפתוח ליחידים:', en: 'List of connected users. Click to unlock individuals:', ar: 'قائمة المتصلين بهذا الرابط. يمكن فتح الأفراد:', ru: 'Список подключённых. Можно разблокировать по одному:', fr: 'Liste des utilisateurs connectés. Cliquez pour débloquer individuellement :', es: 'Lista de conectados. Puedes desbloquear individualmente:' },
    noParticipants:   { he: 'עדיין לא נכנס אף אחד לקישור הזה…', en: 'Nobody has joined this link yet…', ar: 'لم ينضم أحد لهذا الرابط بعد…', ru: 'Никто ещё не подключился к этой ссылке…', fr: 'Personne n\'a encore rejoint ce lien…', es: 'Nadie se ha unido a este enlace aún…' },
    unlockOne:        { he: '🔓 פתח', en: '🔓 Unlock', ar: '🔓 فتح', ru: '🔓 Разблокировать', fr: '🔓 Déverrouiller', es: '🔓 Desbloquear' },

    // ---- Dev tab ----
    devLabel:         { he: 'הרצת קוד (בדיוק כמו ב-F12 → Console):', en: 'Run code (just like F12 → Console):', ar: 'تشغيل الكود (مثل F12 → Console):', ru: 'Запустить код (как F12 → Console):', fr: 'Exécuter du code (comme F12 → Console) :', es: 'Ejecutar código (como F12 → Console):' },
    devRun:           { he: '▶️ הרץ', en: '▶️ Run', ar: '▶️ تشغيل', ru: '▶️ Запустить', fr: '▶️ Exécuter', es: '▶️ Ejecutar' },
    devClear:         { he: '🗑️ נקה', en: '🗑️ Clear', ar: '🗑️ مسح', ru: '🗑️ Очистить', fr: '🗑️ Effacer', es: '🗑️ Limpiar' },

    // ---- In-game / floating messages ----
    shipDestroyed:    { he: 'הספינה שלך הושמדה!', en: 'Your ship was destroyed!', ar: 'تم تدمير سفينتك!', ru: 'Ваш корабль уничтожен!', fr: 'Votre vaisseau a été détruit !', es: '¡Tu nave fue destruida!' },
    finalScore:       { he: 'ניקוד סופי:', en: 'Final score:', ar: 'النتيجة النهائية:', ru: 'Финальный счёт:', fr: 'Score final :', es: 'Puntuación final:' },
    levelWord:        { he: 'שלב:', en: 'Level:', ar: 'المستوى:', ru: 'Уровень:', fr: 'Niveau :', es: 'Nivel:' },
    levelUp:          { he: 'LEVEL UP! HP REFILL', en: 'LEVEL UP! HP REFILL', ar: 'ترقية المستوى! استعادة الصحة', ru: 'УРОВЕНЬ ВВЕРХ! HP ВОССТАНОВЛЕН', fr: 'NIVEAU SUPÉRIEUR ! PV RECHARGÉS', es: '¡SUBISTE DE NIVEL! HP RECARGADO' },
    loading:          { he: '⏳ טוען נתונים...', en: '⏳ Loading data...', ar: '⏳ جارٍ التحميل...', ru: '⏳ Загрузка данных...', fr: '⏳ Chargement...', es: '⏳ Cargando datos...' },
    lockOpened:       { he: '🔓 הנעילה נפתחה', en: '🔓 Lock opened', ar: '🔓 تم فتح القفل', ru: '🔓 Блокировка снята', fr: '🔓 Verrouillage ouvert', es: '🔓 Bloqueo abierto' },
    linkCopied:       { he: '📋 הקישור הועתק!', en: '📋 Link copied!', ar: '📋 تم نسخ الرابط!', ru: '📋 Ссылка скопирована!', fr: '📋 Lien copié !', es: '📋 ¡Enlace copiado!' },
    createLinkFirst:  { he: 'צור קישור קודם', en: 'Create a link first', ar: 'أنشئ رابطًا أولًا', ru: 'Сначала создайте ссылку', fr: 'Créez d\'abord un lien', es: 'Crea un enlace primero' },
    enterPassword:    { he: 'יש להזין סיסמה', en: 'Please enter a password', ar: 'يرجى إدخال كلمة المرور', ru: 'Введите пароль', fr: 'Veuillez entrer un mot de passe', es: 'Por favor ingresa una contraseña' },
    unlockSuccess:    { he: '🔓 הנעילה בוטלה.', en: '🔓 Unlocked.', ar: '🔓 تم رفع القفل.', ru: '🔓 Разблокировано.', fr: '🔓 Déverrouillé.', es: '🔓 Desbloqueado.' },
    unlockFail:       { he: '❌ סיסמה שגויה.', en: '❌ Wrong password.', ar: '❌ كلمة المرور خاطئة.', ru: '❌ Неверный пароль.', fr: '❌ Mot de passe incorrect.', es: '❌ Contraseña incorrecta.' },
    lockSuccess:      { he: '🔒 מצב חינוכי ננעל. ייפתח אוטומטית אחרי 45 דקות, עם הסיסמה, או מרחוק.', en: '🔒 Education mode locked. Auto-unlocks in 45 min, by password, or remotely.', ar: '🔒 تم قفل الوضع التعليمي. يُفتح تلقائيًا بعد 45 دقيقة أو بكلمة المرور أو عن بُعد.', ru: '🔒 Учебный режим заблокирован. Автоматически через 45 мин, паролем или удалённо.', fr: '🔒 Mode éducatif verrouillé. Déverrouillage auto dans 45 min, par mot de passe ou à distance.', es: '🔒 Modo educativo bloqueado. Se desbloquea automáticamente en 45 min, con contraseña o remotamente.' },
    noLinkPassword:   { he: 'ℹ️ נוצר קישור ללא סיסמה — הקישור לא ננעל, רק בוחר מקצוע וכיתה.', en: 'ℹ️ Link created without a password — not locked, only preselects subject/grade.', ar: 'ℹ️ تم إنشاء رابط بدون كلمة مرور — غير مقفل، يختار المادة والصف فقط.', ru: 'ℹ️ Ссылка создана без пароля — не заблокировано, только предвыбор предмета/класса.', fr: 'ℹ️ Lien créé sans mot de passe — non verrouillé, présélectionne seulement la matière/classe.', es: 'ℹ️ Enlace creado sin contraseña — no bloqueado, solo preselecciona materia/curso.' },
    unlockAllConfirm: { he: 'לפתוח את הנעילה לכל מי שמחובר לקישור?', en: 'Unlock everyone connected to this link?', ar: 'هل تريد فتح القفل لجميع المتصلين بهذا الرابط؟', ru: 'Разблокировать всех, кто подключён к этой ссылке?', fr: 'Déverrouiller tout le monde connecté à ce lien ?', es: '¿Desbloquear a todos los conectados a este enlace?' },
    unlockAllOk:      { he: '🔓 נפתח לכולם.', en: '🔓 Unlocked for everyone.', ar: '🔓 تم الفتح للجميع.', ru: '🔓 Разблокировано для всех.', fr: '🔓 Déverrouillé pour tout le monde.', es: '🔓 Desbloqueado para todos.' },
    unlockAllFail:    { he: '⚠️ לא ניתן להתחבר לשרת כעת.', en: '⚠️ Cannot reach the server right now.', ar: '⚠️ تعذّر الاتصال بالخادم الآن.', ru: '⚠️ Не удаётся подключиться к серверу.', fr: '⚠️ Impossible de contacter le serveur.', es: '⚠️ No se puede conectar al servidor ahora.' },
    unlockOneFail:    { he: '⚠️ לא ניתן להתחבר לשרת כעת.', en: '⚠️ Cannot reach the server right now.', ar: '⚠️ تعذّر الاتصال بالخادم الآن.', ru: '⚠️ Не удаётся подключиться к серверу.', fr: '⚠️ Impossible de contacter le serveur.', es: '⚠️ No se puede conectar al servidor ahora.' },

    // ---- Education quiz ----
    quizLevelup:      { he: '⬆️ עליית שלב — ענה נכון כדי להמשיך', en: '⬆️ Level up — answer correctly to continue', ar: '⬆️ ترقية المستوى — أجب بشكل صحيح للمتابعة', ru: '⬆️ Повышение уровня — ответьте правильно, чтобы продолжить', fr: '⬆️ Niveau supérieur — répondez correctement pour continuer', es: '⬆️ Subiste nivel — responde correctamente para continuar' },
    quizKill:         { he: '💥 אויב הושמד — שאלת בונוס', en: '💥 Enemy destroyed — bonus question', ar: '💥 تم تدمير العدو — سؤال مكافأة', ru: '💥 Враг уничтожен — бонусный вопрос', fr: '💥 Ennemi détruit — question bonus', es: '💥 Enemigo destruido — pregunta extra' },
    quizStart:        { he: '🚀 לפני שמתחילים — שאלת פתיחה', en: '🚀 Before we start — opening question', ar: '🚀 قبل البدء — سؤال افتتاحي', ru: '🚀 Перед стартом — вступительный вопрос', fr: '🚀 Avant de commencer — question d\'ouverture', es: '🚀 Antes de empezar — pregunta inicial' },
    quizCorrect:      { he: '✅ נכון!', en: '✅ Correct!', ar: '✅ صحيح!', ru: '✅ Правильно!', fr: '✅ Correct !', es: '✅ ¡Correcto!' },
    quizWrong:        { he: '❌ טעות. התשובה הנכונה מסומנת.', en: '❌ Wrong. The correct answer is highlighted.', ar: '❌ خطأ. الإجابة الصحيحة مظلّلة.', ru: '❌ Неверно. Правильный ответ выделен.', fr: '❌ Faux. La bonne réponse est surlignée.', es: '❌ Incorrecto. La respuesta correcta está resaltada.' },

    // ---- Entry settings view ----
    esTitle:          { he: '⚙️ הגדרות משחק', en: '⚙️ Game Settings', ar: '⚙️ إعدادات اللعبة', ru: '⚙️ Настройки игры', fr: '⚙️ Paramètres de jeu', es: '⚙️ Ajustes del juego' },
    esFilterAll:      { he: 'הכל', en: 'All', ar: 'الكل', ru: 'Все', fr: 'Tout', es: 'Todo' },
    esFallbackNote:   { he: '⚠️ הגדרות לא נשמרו למשחק ישן זה — מוצגות ההגדרות הנוכחיות שלך', en: '⚠️ Settings not saved for this old game — showing your current settings', ar: '⚠️ لم تُحفظ الإعدادات لهذه اللعبة القديمة — عرض إعداداتك الحالية', ru: '⚠️ Настройки не сохранены для этой старой игры — показаны ваши текущие настройки', fr: '⚠️ Paramètres non sauvegardés pour cette ancienne partie — affichage de vos paramètres actuels', es: '⚠️ Ajustes no guardados para esta partida antigua — mostrando tus ajustes actuales' },
    esDuration:       { he: '⏱️ זמן משחק', en: '⏱️ Game duration', ar: '⏱️ مدة اللعبة', ru: '⏱️ Длительность', fr: '⏱️ Durée de partie', es: '⏱️ Duración' },

    // ---- Language tab ----
    langTabTitle:     { he: 'בחר שפה', en: 'Choose Language', ar: 'اختر اللغة', ru: 'Выберите язык', fr: 'Choisir la langue', es: 'Elegir idioma' },
    langLabel:        { he: 'שפה / Language:', en: 'Language / שפה:', ar: 'اللغة:', ru: 'Язык:', fr: 'Langue :', es: 'Idioma:' },
    langToggle:       { he: 'English', en: 'עברית', ar: 'عربي', ru: 'Рус', fr: 'Fr', es: 'Es' },

    // ---- Shop ----
    shopTitle:            { he: '🛍️ Upgrade Shop', en: '🛍️ Upgrade Shop', ar: '🛍️ متجر الترقيات', ru: '🛍️ Магазин улучшений', fr: '🛍️ Boutique', es: '🛍️ Tienda' },
    shopBalance:          { he: '💰 יתרה:', en: '💰 Balance:', ar: '💰 الرصيد:', ru: '💰 Баланс:', fr: '💰 Solde :', es: '💰 Saldo:' },
    shopBack:             { he: '◀ חזרה', en: '◀ Back', ar: '◀ رجوع', ru: '◀ Назад', fr: '◀ Retour', es: '◀ Volver' },
    shopTabAll:           { he: 'הכל', en: 'All', ar: 'الكل', ru: 'Все', fr: 'Tout', es: 'Todo' },
    shopUpgradeActive:    { he: '✅ פעיל', en: '✅ Active', ar: '✅ نشط', ru: '✅ Активно', fr: '✅ Actif', es: '✅ Activo' },
    shopUpgradeDisabled:  { he: '🚫 מושבת', en: '🚫 Disabled', ar: '🚫 معطّل', ru: '🚫 Отключено', fr: '🚫 Désactivé', es: '🚫 Desactivado' },
    shopBtnEnable:        { he: '▶ הפעל', en: '▶ Enable', ar: '▶ تفعيل', ru: '▶ Включить', fr: '▶ Activer', es: '▶ Activar' },
    shopBtnDisable:       { he: '🚫 השבת', en: '🚫 Disable', ar: '🚫 تعطيل', ru: '🚫 Отключить', fr: '🚫 Désactiver', es: '🚫 Desactivar' },
    shopBtnOwned:         { he: '✅ נרכש', en: '✅ Purchased', ar: '✅ تم الشراء', ru: '✅ Куплено', fr: '✅ Acheté', es: '✅ Comprado' },
    shopBtnRefund:        { he: '↩ החזר', en: '↩ Refund', ar: '↩ استرداد', ru: '↩ Возврат', fr: '↩ Remboursement', es: '↩ Reembolso' },
    shopRequires:         { he: '⚠️ דורש:', en: '⚠️ Requires:', ar: '⚠️ يتطلب:', ru: '⚠️ Требует:', fr: '⚠️ Nécessite :', es: '⚠️ Requiere:' },
    shopNoUpgrades:       { he: 'אין שדרוגים נוספים לסקין זה', en: 'No more upgrades for this skin', ar: 'لا مزيد من الترقيات لهذا المظهر', ru: 'Больше нет улучшений для этого скина', fr: 'Aucune autre amélioration pour ce skin', es: 'No hay más mejoras para este skin' },
    shopHPUpgrade:        { he: '❤️ שדרוג חיים', en: '❤️ HP Upgrade', ar: '❤️ ترقية الصحة', ru: '❤️ Улучшение HP', fr: '❤️ Amélioration PV', es: '❤️ Mejora de VP' },
    shopHPMax:            { he: '(מקסימום!)', en: '(Max!)', ar: '(الحد الأقصى!)', ru: '(Максимум!)', fr: '(Max !)', es: '(¡Máx!)' },
    shopHPDesc:           { he: '+50 HP לכל רמה', en: '+50 HP per level', ar: '+50 HP لكل مستوى', ru: '+50 HP за уровень', fr: '+50 PV par niveau', es: '+50 VP por nivel' },
    shopHPTotal:          { he: 'סה"כ:', en: 'Total:', ar: 'الإجمالي:', ru: 'Итого:', fr: 'Total :', es: 'Total:' },
    shopHPNextCost:       { he: 'הרמה הבאה:', en: 'Next level:', ar: 'المستوى التالي:', ru: 'Следующий уровень:', fr: 'Niveau suivant :', es: 'Siguiente nivel:' },
    shopBtnUpgrade:       { he: '⬆ שדרג', en: '⬆ Upgrade', ar: '⬆ ترقية', ru: '⬆ Улучшить', fr: '⬆ Améliorer', es: '⬆ Mejorar' },
    shopBtnDowngrade:     { he: '⬇ הורד', en: '⬇ Downgrade', ar: '⬇ خفض المستوى', ru: '⬇ Понизить', fr: '⬇ Rétrograder', es: '⬇ Degradar' },

    // ---- Skin names (for shop tabs / labels) ----
    skinClassic:          { he: 'קלאסיק', en: 'Classic', ar: 'كلاسيكي', ru: 'Классик', fr: 'Classique', es: 'Clásico' },
    skinInterceptor:      { he: 'אינטרספטור', en: 'Interceptor', ar: 'الاعتراضي', ru: 'Перехватчик', fr: 'Intercepteur', es: 'Interceptor' },
    skinTanker:           { he: 'טנקר', en: 'Tanker', ar: 'الناقلة', ru: 'Танкер', fr: 'Tanker', es: 'Tanquero' },
    skinPhoenix:          { he: 'פניקס', en: 'Phoenix', ar: 'العنقاء', ru: 'Феникс', fr: 'Phénix', es: 'Fénix' },
    skinVortex:           { he: 'וורטקס', en: 'Vortex', ar: 'الدوامة', ru: 'Вортекс', fr: 'Vortex', es: 'Vórtice' },
    skinJoker:            { he: "ג'וקר", en: 'Joker', ar: 'الجوكر', ru: 'Джокер', fr: 'Joker', es: 'Comodín' },
    skinDragon:           { he: 'דרגון', en: 'Dragon', ar: 'التنين', ru: 'Дракон', fr: 'Dragon', es: 'Dragón' },

    // ---- Upgrade names & descriptions ----
    upgDragonHomingName:      { he: '🐉 כדורי דרגון חכמים', en: '🐉 Dragon Smart Bullets', ar: '🐉 رصاصات التنين الذكية', ru: '🐉 Умные пули Дракона', fr: '🐉 Balles intelligentes du Dragon', es: '🐉 Balas inteligentes del Dragón' },
    upgDragonHomingDesc:      { he: 'הכדורים שדרגון מחזיר עוקבים אחרי האויב הקרוב ביותר', en: 'Bullets that Dragon deflects home in on the nearest enemy', ar: 'الرصاصات التي يعكسها التنين تتتبع أقرب عدو', ru: 'Отражённые пули Дракона наводятся на ближайшего врага', fr: 'Les balles renvoyées par le Dragon ciblent l\'ennemi le plus proche', es: 'Las balas que el Dragón desvía persiguen al enemigo más cercano' },
    upgPhoenixSuperName:      { he: '🔥 5 נוצות', en: '🔥 5 Feathers', ar: '🔥 5 ريشات', ru: '🔥 5 Перьев', fr: '🔥 5 Plumes', es: '🔥 5 Plumas' },
    upgPhoenixSuperDesc:      { he: 'פניקס יורה 5 נוצות במקום 3', en: 'Phoenix fires 5 feathers instead of 3', ar: 'العنقاء يطلق 5 ريشات بدلاً من 3', ru: 'Феникс выпускает 5 перьев вместо 3', fr: 'Le Phénix tire 5 plumes au lieu de 3', es: 'El Fénix dispara 5 plumas en lugar de 3' },
    upgPhoenixHomingName:     { he: '🎯 נוצות מחפשות', en: '🎯 Homing Feathers', ar: '🎯 ريشات موجّهة', ru: '🎯 Самонаводящиеся перья', fr: '🎯 Plumes à guidage', es: '🎯 Plumas teledirigidas' },
    upgPhoenixHomingDesc:     { he: 'הנוצות עוקבות אחרי האויבים', en: 'Feathers home in on enemies', ar: 'الريشات تتتبع الأعداء', ru: 'Перья наводятся на врагов', fr: 'Les plumes ciblent les ennemis', es: 'Las plumas persiguen a los enemigos' },
    upgPhoenixPowerName:      { he: '💥 נוצות כוח', en: '💥 Power Feathers', ar: '💥 ريشات قوة', ru: '💥 Силовые перья', fr: '💥 Plumes de puissance', es: '💥 Plumas de poder' },
    upgPhoenixPowerDesc:      { he: 'נוצות מורידות נזק עצום — יהרוג כמעט כל אויב עד LVL 10 במכה', en: 'Feathers deal massive damage — kills almost any enemy up to LVL 10 in one hit', ar: 'الريشات تتسبب في ضرر هائل — تقتل تقريبًا أي عدو حتى LVL 10 بضربة واحدة', ru: 'Перья наносят огромный урон — убивают почти любого врага до LVL 10 за один удар', fr: 'Les plumes infligent des dégâts énormes — tue presque tout ennemi jusqu\'au LVL 10 en un coup', es: 'Las plumas infligen daño masivo — mata casi cualquier enemigo hasta LVL 10 de un golpe' },
    upgVortexCooldownName:    { he: '⚡ קולדאון X2', en: '⚡ Cooldown ×2', ar: '⚡ مضاعفة السرعة ×2', ru: '⚡ Откат ×2 быстрее', fr: '⚡ Temps de recharge ×2', es: '⚡ Recarga ×2' },
    upgVortexCooldownDesc:    { he: 'מוריד פי 2 את הcooldown של אולטי הוורטקס (מ-30 שניות ל-15)', en: 'Halves the Vortex ultimate cooldown (from 30s to 15s)', ar: 'يُقلّص فترة التبريد لـ Vortex بمقدار ×2 (من 30 ثانية إلى 15)', ru: 'Сокращает откат ульты Вортекса в 2 раза (с 30 до 15 сек)', fr: 'Divise le temps de recharge de l\'ultime Vortex par 2 (de 30s à 15s)', es: 'Reduce a la mitad el tiempo de recarga del Vortex (de 30s a 15s)' },
    upgJokerCoinsName:        { he: '🃏 מטבעות ניצחון', en: '🃏 Victory Coins', ar: '🃏 عملات النصر', ru: '🃏 Монеты победы', fr: '🃏 Pièces de victoire', es: '🃏 Monedas de victoria' },
    upgJokerCoinsDesc:        { he: 'כל 10 הריגות עם הג׳וקר מרוויחים 100 מטבעות', en: 'Every 10 kills with the Joker earns 100 coins', ar: 'كل 10 قتلات مع الجوكر تكسب 100 عملة', ru: 'Каждые 10 убийств с Джокером дают 100 монет', fr: 'Tous les 10 kills avec le Joker rapportent 100 pièces', es: 'Cada 10 kills con el Joker gana 100 monedas' },

    // ---- Leaderboard HP Level filter ----
    lbFilterHPAny:        { he: 'כל הרמות', en: 'All levels', ar: 'جميع المستويات', ru: 'Все уровни', fr: 'Tous niveaux', es: 'Todos los niveles' },
    lbFilterHPNote:       { he: 'הצג רק רשומות שבהן שדרוג HP ≤ הרמה הנבחרת. No settings → LVL 0', en: 'Show only entries where HP upgrade ≤ selected level. No settings → LVL 0', ar: 'عرض المدخلات فقط حيث ترقية HP ≤ المستوى المحدد. بدون إعدادات → LVL 0', ru: 'Показывать только записи где HP ≤ выбранного уровня. Без настроек → LVL 0', fr: 'Afficher uniquement les entrées où l\'amélioration HP ≤ niveau sélectionné. Sans paramètres → LVL 0', es: 'Mostrar solo entradas donde mejora HP ≤ nivel seleccionado. Sin ajustes → LVL 0' },

    // ---- Floating messages (in-game) ----
    phoenixFeathers:      { he: 'נוצות פניקס', en: 'PHOENIX FEATHERS', ar: 'ريشات العنقاء', ru: 'ПЕРЬЯ ФЕНИКСА', fr: 'PLUMES PHÉNIX', es: 'PLUMAS FÉNIX' },
    jokerKillCoins:       { he: '🃏 +100 💰 (10 הריגות!)', en: '🃏 +100 💰 (10 kills!)', ar: '🃏 +100 💰 (10 قتلات!)', ru: '🃏 +100 💰 (10 убийств!)', fr: '🃏 +100 💰 (10 kills !)', es: '🃏 +100 💰 (¡10 kills!)' },

    // ---- Friend coin transfer ----
    shopTabSend:          { he: '💌 שלח לחבר', en: '💌 Send to Friend', ar: '💌 إرسال لصديق', ru: '💌 Отправить другу', fr: '💌 Envoyer à un ami', es: '💌 Enviar a amigo' },
    sendTitle:            { he: 'שלח מטבעות לחבר', en: 'Send Coins to a Friend', ar: 'إرسال عملات لصديق', ru: 'Отправить монеты другу', fr: 'Envoyer des pièces à un ami', es: 'Enviar monedas a un amigo' },
    sendDesc:             { he: 'הכנס אימייל של חבר ובחר כמה מטבעות לשלוח', en: 'Enter a friend\'s email and choose how many coins to send', ar: 'أدخل بريد صديق واختر عدد العملات للإرسال', ru: 'Введите email друга и выберите сумму монет', fr: 'Entrez l\'email d\'un ami et choisissez le nombre de pièces', es: 'Ingresa el email de un amigo y elige cuántas monedas enviar' },
    sendEmailLabel:       { he: 'אימייל של החבר', en: 'Friend\'s Email', ar: 'بريد الصديق', ru: 'Email друга', fr: 'Email de l\'ami', es: 'Email del amigo' },
    sendEmailPlaceholder: { he: 'example@email.com', en: 'example@email.com', ar: 'example@email.com', ru: 'example@email.com', fr: 'example@email.com', es: 'example@email.com' },
    sendAmountLabel:      { he: 'כמות מטבעות', en: 'Amount of Coins', ar: 'عدد العملات', ru: 'Количество монет', fr: 'Nombre de pièces', es: 'Cantidad de monedas' },
    sendCustomAmount:     { he: 'כמות מותאמת אישית...', en: 'Custom amount...', ar: 'مبلغ مخصص...', ru: 'Другая сумма...', fr: 'Montant personnalisé...', es: 'Monto personalizado...' },
    sendBtn:              { he: '💸 שלח מטבעות', en: '💸 Send Coins', ar: '💸 إرسال العملات', ru: '💸 Отправить монеты', fr: '💸 Envoyer les pièces', es: '💸 Enviar monedas' },
    sendNotLoggedIn:      { he: 'יש להתחבר כדי לשלוח מטבעות', en: 'You must be logged in to send coins', ar: 'يجب تسجيل الدخول لإرسال العملات', ru: 'Войдите, чтобы отправлять монеты', fr: 'Connectez-vous pour envoyer des pièces', es: 'Debes iniciar sesión para enviar monedas' },
    sendSuccess:          { he: 'המטבעות נשלחו! 🎉', en: 'Coins sent! 🎉', ar: 'تم إرسال العملات! 🎉', ru: 'Монеты отправлены! 🎉', fr: 'Pièces envoyées ! 🎉', es: '¡Monedas enviadas! 🎉' },
    sendErrSelf:          { he: 'אי אפשר לשלוח לעצמך', en: 'You cannot send coins to yourself', ar: 'لا يمكنك إرسال عملات لنفسك', ru: 'Нельзя отправить монеты самому себе', fr: 'Vous ne pouvez pas vous envoyer des pièces', es: 'No puedes enviarte monedas a ti mismo' },
    sendErrCoins:         { he: 'אין מספיק מטבעות', en: 'Not enough coins', ar: 'ليس هناك عملات كافية', ru: 'Недостаточно монет', fr: 'Pas assez de pièces', es: 'No tienes suficientes monedas' },
    sendErrEmail:         { he: 'יש להזין אימייל תקין', en: 'Please enter a valid email', ar: 'يرجى إدخال بريد إلكتروني صالح', ru: 'Введите корректный email', fr: 'Veuillez entrer un email valide', es: 'Por favor ingresa un email válido' },
    sendErrAmount:        { he: 'יש להזין כמות חיובית', en: 'Please enter a positive amount', ar: 'يرجى إدخال مبلغ موجب', ru: 'Введите положительную сумму', fr: 'Veuillez entrer un montant positif', es: 'Por favor ingresa una cantidad positiva' },
    sendErrServer:        { he: 'שגיאת שרת, נסה שוב', en: 'Server error, please try again', ar: 'خطأ في الخادم، حاول مجدداً', ru: 'Ошибка сервера, попробуйте снова', fr: 'Erreur serveur, réessayez', es: 'Error del servidor, inténtalo de nuevo' },
    sendErrNotConnected:  { he: 'אין חיבור לשרת', en: 'Not connected to server', ar: 'لا يوجد اتصال بالخادم', ru: 'Нет подключения к серверу', fr: 'Pas de connexion au serveur', es: 'Sin conexión al servidor' },
    sendClaimedTitle:     { he: '🎁 קיבלת מטבעות!', en: '🎁 You received coins!', ar: '🎁 لقد تلقيت عملات!', ru: '🎁 Вы получили монеты!', fr: '🎁 Vous avez reçu des pièces !', es: '🎁 ¡Recibiste monedas!' },
    sendClaimedFrom:      { he: 'מאת', en: 'From', ar: 'من', ru: 'От', fr: 'De', es: 'De' },


    // ---- UI rework: previously hard-coded strings ----
    historyBtn: { he: '📊 ההיסטוריה שלי', en: '📊 My History', ar: '📊 سجلي', ru: '📊 Моя история', fr: '📊 Mon historique', es: '📊 Mi historial' },
    shopBtn: { he: '🛍️ חנות שדרוגים', en: '🛍️ Upgrade Shop', ar: '🛍️ متجر الترقيات', ru: '🛍️ Магазин улучшений', fr: '🛍️ Boutique d\'améliorations', es: '🛍️ Tienda de mejoras' },
    pausedTitle: { he: '⏸ מושהה', en: '⏸ Paused', ar: '⏸ متوقف', ru: '⏸ Пауза', fr: '⏸ Pause', es: '⏸ Pausa' },
    resumeBtn: { he: '▶ המשך', en: '▶ Resume', ar: '▶ متابعة', ru: '▶ Продолжить', fr: '▶ Reprendre', es: '▶ Continuar' },
    coinsLabel: { he: '💰 מטבעות:', en: '💰 Coins:', ar: '💰 العملات:', ru: '💰 Монеты:', fr: '💰 Pièces :', es: '💰 Monedas:' },
    historyTitle: { he: '📊 ההיסטוריה שלי', en: '📊 My History', ar: '📊 سجلي', ru: '📊 Моя история', fr: '📊 Mon historique', es: '📊 Mi historial' },
    histTabHistory: { he: '🕒 היסטוריה', en: '🕒 History', ar: '🕒 السجل', ru: '🕒 История', fr: '🕒 Historique', es: '🕒 Historial' },
    histTabBests: { he: '🥇 שיאים אישיים', en: '🥇 Personal Bests', ar: '🥇 أفضل نتائجي', ru: '🥇 Личные рекорды', fr: '🥇 Records perso', es: '🥇 Mejores marcas' },
    histTabAch: { he: '🏅 הישגים', en: '🏅 Achievements', ar: '🏅 الإنجازات', ru: '🏅 Достижения', fr: '🏅 Exploits', es: '🏅 Logros' },
    tabUpgrades: { he: '🛍️ שדרוגים', en: '🛍️ Upgrades', ar: '🛍️ الترقيات', ru: '🛍️ Улучшения', fr: '🛍️ Améliorations', es: '🛍️ Mejoras' },
    replayStop: { he: '⏸ עצור', en: '⏸ Pause', ar: '⏸ إيقاف مؤقت', ru: '⏸ Пауза', fr: '⏸ Pause', es: '⏸ Pausa' },
    replayClose: { he: '✕ סגור', en: '✕ Close', ar: '✕ إغلاق', ru: '✕ Закрыть', fr: '✕ Fermer', es: '✕ Cerrar' },
    replayContinue: { he: '▶ המשך', en: '▶ Resume', ar: '▶ متابعة', ru: '▶ Продолжить', fr: '▶ Reprendre', es: '▶ Continuar' },
    replayRestart: { he: '▶ הפעל מחדש', en: '▶ Play again', ar: '▶ إعادة التشغيل', ru: '▶ Заново', fr: '▶ Rejouer', es: '▶ Repetir' },
    replayNoData: { he: 'אין נתוני Replay לריצה זו', en: 'No replay data for this run', ar: 'لا توجد بيانات إعادة لهذه الجولة', ru: 'Нет данных повтора для этого забега', fr: 'Aucune donnée de replay pour cette partie', es: 'No hay datos de repetición de esta partida' },
    replayInfo: { he: '{score} נקודות • שלב {level} • {skin} • {date}', en: '{score} points • Level {level} • {skin} • {date}', ar: '{score} نقطة • المستوى {level} • {skin} • {date}', ru: '{score} очков • Уровень {level} • {skin} • {date}', fr: '{score} points • Niveau {level} • {skin} • {date}', es: '{score} puntos • Nivel {level} • {skin} • {date}' },
    devPh: { he: '// הקלד קוד כאן', en: '// code here', ar: '// اكتب الكود هنا', ru: '// введите код', fr: '// code ici', es: '// código aquí' },
    pwPh: { he: 'בחר סיסמה', en: 'Choose a password', ar: 'اختر كلمة مرور', ru: 'Выберите пароль', fr: 'Choisissez un mot de passe', es: 'Elige una contraseña' },
    skinDescClassic: { he: 'לוחם מאוזן', en: 'Balanced fighter', ar: 'مقاتل متوازن', ru: 'Сбалансированный истребитель', fr: 'Chasseur équilibré', es: 'Caza equilibrado' },
    skinDescInterceptor: { he: 'גרסה מהירה', en: 'Speed variant', ar: 'نسخة سريعة', ru: 'Скоростной вариант', fr: 'Variante rapide', es: 'Variante veloz' },
    skinDescTanker: { he: 'שריון כבד', en: 'Heavy armor', ar: 'درع ثقيل', ru: 'Тяжёлая броня', fr: 'Blindage lourd', es: 'Blindaje pesado' },
    skinDescPhoenix: { he: '⚡ ירי מהיר 🔥 נזק גבוה', en: '⚡ Faster fire rate 🔥 More damage', ar: '⚡ إطلاق أسرع 🔥 ضرر أكبر', ru: '⚡ Быстрая стрельба 🔥 Больше урона', fr: '⚡ Tir rapide 🔥 Plus de dégâts', es: '⚡ Disparo rápido 🔥 Más daño' },
    skinDescVortex: { he: '⚡⚡ ירי סופר-מהיר 💥 נזק כפול ❤️ חיים כפולים', en: '⚡⚡ Ultra-fast fire 💥 2X dmg ❤️ 2X HP', ar: '⚡⚡ إطلاق فائق السرعة 💥 ضرر مضاعف ❤️ صحة مضاعفة', ru: '⚡⚡ Сверхбыстрая стрельба 💥 2x урон ❤️ 2x HP', fr: '⚡⚡ Tir ultra-rapide 💥 Dégâts x2 ❤️ PV x2', es: '⚡⚡ Disparo ultrarrápido 💥 Daño x2 ❤️ Vida x2' },
    skinDescJoker: { he: '🃏 מצב כאוס | 🔥 ירי בוער | ⚡ ירי כפול | 💥 נזק x3 | ❤️ 3 חיים', en: '🃏 Chaos mode | 🔥 Fire bullets | ⚡ 2X fire rate | 💥 3X dmg | ❤️ 3 lives', ar: '🃏 وضع الفوضى | 🔥 رصاص ناري | ⚡ إطلاق مضاعف | 💥 ضرر x3 | ❤️ 3 أرواح', ru: '🃏 Режим хаоса | 🔥 Огненные пули | ⚡ 2x скорострельность | 💥 3x урон | ❤️ 3 жизни', fr: '🃏 Mode chaos | 🔥 Balles de feu | ⚡ Cadence x2 | 💥 Dégâts x3 | ❤️ 3 vies', es: '🃏 Modo caos | 🔥 Balas de fuego | ⚡ Cadencia x2 | 💥 Daño x3 | ❤️ 3 vidas' },
    skinDescDragon: { he: '🐉 אש לכל הכיוונים | 🛡️ 10 שנ׳ בלתי פגיע | ⚡ הכי חזק', en: '🐉 Fire all around | 🛡️ 10s invincible | ⚡ Best stats', ar: '🐉 نار في كل الاتجاهات | 🛡️ 10 ثوانٍ مناعة | ⚡ الأقوى', ru: '🐉 Огонь во все стороны | 🛡️ 10 с неуязвимости | ⚡ Лучшие характеристики', fr: '🐉 Feu dans toutes les directions | 🛡️ 10 s d\'invincibilité | ⚡ Meilleures stats', es: '🐉 Fuego en todas direcciones | 🛡️ 10 s invencible | ⚡ Mejores stats' },
    lockLvl: { he: '🔒 שלב {n}', en: '🔒 LVL {n}', ar: '🔒 المستوى {n}', ru: '🔒 Ур. {n}', fr: '🔒 NIV. {n}', es: '🔒 NIV. {n}' },
    fcDevice: { he: 'מכשיר', en: 'Device', ar: 'الجهاز', ru: 'Устройство', fr: 'Appareil', es: 'Dispositivo' },
    fcRules: { he: 'חוקים', en: 'Rules', ar: 'القواعد', ru: 'Правила', fr: 'Règles', es: 'Reglas' },
    fcControls: { he: 'שליטה', en: 'Controls', ar: 'التحكم', ru: 'Управление', fr: 'Commandes', es: 'Controles' },
    fcEdu: { he: 'חינוכי', en: 'Education', ar: 'تعليمي', ru: 'Обучение', fr: 'Éducatif', es: 'Educativo' },
    fcLang: { he: 'שפה', en: 'Language', ar: 'اللغة', ru: 'Язык', fr: 'Langue', es: 'Idioma' },
    fcUpgrades: { he: 'שדרוגים', en: 'Upgrades', ar: 'الترقيات', ru: 'Улучшения', fr: 'Améliorations', es: 'Mejoras' },
    fcHp: { he: 'רמת HP', en: 'HP Level', ar: 'مستوى الصحة', ru: 'Уровень HP', fr: 'Niveau PV', es: 'Nivel de vida' },
    flNoSettingsAll: { he: 'ללא הגדרות ← מוצג רק ב"הכל"', en: 'No settings → shown only in "All"', ar: 'بدون إعدادات ← يظهر فقط في "الكل"', ru: 'Нет настроек → только во «Все»', fr: 'Sans réglages → visible seulement dans « Tout »', es: 'Sin ajustes → solo en «Todo»' },
    flMobile: { he: '📱 טלפון', en: '📱 Mobile', ar: '📱 هاتف', ru: '📱 Телефон', fr: '📱 Mobile', es: '📱 Móvil' },
    flDesktop: { he: '🖥️ מחשב', en: '🖥️ Desktop', ar: '🖥️ حاسوب', ru: '🖥️ Компьютер', fr: '🖥️ Ordinateur', es: '🖥️ Ordenador' },
    flRuleEnemies: { he: 'אויבים יורים דרך סלעים', en: 'Enemies shoot through asteroids', ar: 'الأعداء يطلقون عبر الكويكبات', ru: 'Враги стреляют сквозь астероиды', fr: 'Les ennemis tirent à travers les astéroïdes', es: 'Los enemigos disparan a través de asteroides' },
    flRulePlayer: { he: 'השחקן יורה דרך סלעים', en: 'Player shoots through asteroids', ar: 'اللاعب يطلق عبر الكويكبات', ru: 'Игрок стреляет сквозь астероиды', fr: 'Le joueur tire à travers les astéroïdes', es: 'El jugador dispara a través de asteroides' },
    flTriRules: { he: '⬜=הכל &nbsp;✅=כן &nbsp;🚫=לא &nbsp;· ללא הגדרות ← ברירות מחדל', en: '⬜=Any &nbsp;✅=Yes &nbsp;🚫=No &nbsp;· No settings → defaults', ar: '⬜=أي &nbsp;✅=نعم &nbsp;🚫=لا &nbsp;· بدون إعدادات ← الافتراضي', ru: '⬜=Любой &nbsp;✅=Да &nbsp;🚫=Нет &nbsp;· Нет настроек → по умолчанию', fr: '⬜=Tous &nbsp;✅=Oui &nbsp;🚫=Non &nbsp;· Sans réglages → défaut', es: '⬜=Cualquiera &nbsp;✅=Sí &nbsp;🚫=No &nbsp;· Sin ajustes → por defecto' },
    flCtrlType: { he: 'סוג שליטה:', en: 'Control type:', ar: 'نوع التحكم:', ru: 'Тип управления:', fr: 'Type de contrôle :', es: 'Tipo de control:' },
    flMouse: { he: '🖱️ עכבר', en: '🖱️ Mouse', ar: '🖱️ فأرة', ru: '🖱️ Мышь', fr: '🖱️ Souris', es: '🖱️ Ratón' },
    flArrows: { he: '⬆️ חצים', en: '⬆️ Arrows', ar: '⬆️ أسهم', ru: '⬆️ Стрелки', fr: '⬆️ Flèches', es: '⬆️ Flechas' },
    flRightClick: { he: 'קליק ימני:', en: 'Right-click:', ar: 'النقر الأيمن:', ru: 'Правый клик:', fr: 'Clic droit :', es: 'Clic derecho:' },
    flTriRightClick: { he: '⬜=הכל ✅=כן 🚫=לא &nbsp;· ללא הגדרות ← כן', en: '⬜=Any ✅=Yes 🚫=No &nbsp;· No settings → Yes', ar: '⬜=أي ✅=نعم 🚫=لا &nbsp;· بدون إعدادات ← نعم', ru: '⬜=Любой ✅=Да 🚫=Нет &nbsp;· Нет настроек → Да', fr: '⬜=Tous ✅=Oui 🚫=Non &nbsp;· Sans réglages → Oui', es: '⬜=Cualquiera ✅=Sí 🚫=No &nbsp;· Sin ajustes → Sí' },
    flController: { he: '🎮 שלט:', en: '🎮 Controller:', ar: '🎮 يد التحكم:', ru: '🎮 Геймпад:', fr: '🎮 Manette :', es: '🎮 Mando:' },
    flTriController: { he: '⬜=הכל ✅=בשימוש 🚫=לא בשימוש &nbsp;· ללא הגדרות ← לא בשימוש', en: '⬜=Any ✅=Used 🚫=Not used &nbsp;· No settings → Not used', ar: '⬜=أي ✅=مستخدمة 🚫=غير مستخدمة &nbsp;· بدون إعدادات ← غير مستخدمة', ru: '⬜=Любой ✅=Использован 🚫=Не использован &nbsp;· Нет настроек → Не использован', fr: '⬜=Tous ✅=Utilisée 🚫=Non utilisée &nbsp;· Sans réglages → Non utilisée', es: '⬜=Cualquiera ✅=Usado 🚫=No usado &nbsp;· Sin ajustes → No usado' },
    flNoSettingsOff: { he: 'ללא הגדרות ← כבוי', en: 'No settings → Off', ar: 'بدون إعدادات ← معطل', ru: 'Нет настроек → Выкл', fr: 'Sans réglages → Désactivé', es: 'Sin ajustes → Desactivado' },
    flOn: { he: '✅ פעיל', en: '✅ On', ar: '✅ مفعّل', ru: '✅ Вкл', fr: '✅ Activé', es: '✅ Activado' },
    flOff: { he: '❌ כבוי', en: '❌ Off', ar: '❌ معطّل', ru: '❌ Выкл', fr: '❌ Désactivé', es: '❌ Desactivado' },
    flMulti: { he: 'בחירה מרובה · ללא הגדרות ← מוצג רק ב"הכל"', en: 'Multi-select · No settings → shown only in "All"', ar: 'اختيار متعدد · بدون إعدادات ← يظهر فقط في "الكل"', ru: 'Мультивыбор · Нет настроек → только во «Все»', fr: 'Choix multiple · Sans réglages → visible seulement dans « Tout »', es: 'Selección múltiple · Sin ajustes → solo en «Todo»' },
    flNoUpgrades: { he: 'אין שדרוגים', en: 'No upgrades', ar: 'لا توجد ترقيات', ru: 'Нет улучшений', fr: 'Aucune amélioration', es: 'Sin mejoras' },
    flTriUpgrades: { he: '⬜=הכל &nbsp;✅=חובה &nbsp;🚫=אסור &nbsp;· ללא הגדרות ← ללא שדרוגים', en: '⬜=Any &nbsp;✅=Required &nbsp;🚫=Forbidden &nbsp;· No settings → No upgrades', ar: '⬜=أي &nbsp;✅=مطلوب &nbsp;🚫=ممنوع &nbsp;· بدون إعدادات ← بدون ترقيات', ru: '⬜=Любое &nbsp;✅=Обязательно &nbsp;🚫=Запрещено &nbsp;· Нет настроек → без улучшений', fr: '⬜=Tous &nbsp;✅=Requis &nbsp;🚫=Interdit &nbsp;· Sans réglages → sans améliorations', es: '⬜=Cualquiera &nbsp;✅=Requerido &nbsp;🚫=Prohibido &nbsp;· Sin ajustes → sin mejoras' },
    flFilters: { he: '🔍 סינון', en: '🔍 Filters', ar: '🔍 تصفية', ru: '🔍 Фильтры', fr: '🔍 Filtres', es: '🔍 Filtros' },
    flClear: { he: '✕ נקה הכל', en: '✕ Clear All', ar: '✕ مسح الكل', ru: '✕ Сбросить всё', fr: '✕ Tout effacer', es: '✕ Borrar todo' },
    lbModeScore: { he: '🏆 ניקוד', en: '🏆 Score', ar: '🏆 النقاط', ru: '🏆 Очки', fr: '🏆 Score', es: '🏆 Puntos' },
    lbModeSpeedrun: { he: '⚡ ספידראן', en: '⚡ Speedrun', ar: '⚡ سباق السرعة', ru: '⚡ Спидран', fr: '⚡ Speedrun', es: '⚡ Speedrun' },
    lbModeMoney: { he: '💰 כסף', en: '💰 Money', ar: '💰 المال', ru: '💰 Деньги', fr: '💰 Argent', es: '💰 Dinero' },
    lbCustom: { he: '＋ מותאם', en: '＋ Custom', ar: '＋ مخصص', ru: '＋ Свой', fr: '＋ Perso', es: '＋ Propio' },
    lbDelete: { he: 'מחק', en: 'Delete', ar: 'حذف', ru: 'Удалить', fr: 'Supprimer', es: 'Eliminar' },
    lbGoalScore: { he: 'ניקוד', en: 'Score', ar: 'النقاط', ru: 'Очки', fr: 'Score', es: 'Puntos' },
    lbGoalLevel: { he: 'שלב', en: 'Level', ar: 'المستوى', ru: 'Уровень', fr: 'Niveau', es: 'Nivel' },
    lbGoalTargetPh: { he: 'ערך יעד', en: 'Target value', ar: 'القيمة المستهدفة', ru: 'Целевое значение', fr: 'Valeur cible', es: 'Valor objetivo' },
    lbAdd: { he: '✅ הוסף', en: '✅ Add', ar: '✅ إضافة', ru: '✅ Добавить', fr: '✅ Ajouter', es: '✅ Añadir' },
    goalPts: { he: '{n} נק׳', en: '{n} pts', ar: '{n} نقطة', ru: '{n} очков', fr: '{n} pts', es: '{n} pts' },
    goalLevel: { he: 'שלב {n}', en: 'Level {n}', ar: 'المستوى {n}', ru: 'Уровень {n}', fr: 'Niveau {n}', es: 'Nivel {n}' },
    devBadgeTitle: { he: 'מפתח המשחק', en: 'Game developer', ar: 'مطوّر اللعبة', ru: 'Разработчик игры', fr: 'Développeur du jeu', es: 'Desarrollador del juego' },
    watchReplay: { he: 'צפה ב-Replay', en: 'Watch replay', ar: 'شاهد الإعادة', ru: 'Смотреть повтор', fr: 'Voir le replay', es: 'Ver repetición' },
    srEmpty: { he: 'אין שיאים עדיין — השלם "{goal}" מהר ככל האפשר!', en: 'No records yet — complete "{goal}" as fast as possible!', ar: 'لا توجد أرقام قياسية بعد — أكمل "{goal}" بأسرع ما يمكن!', ru: 'Рекордов пока нет — пройдите «{goal}» как можно быстрее!', fr: 'Aucun record — terminez « {goal} » le plus vite possible !', es: 'Aún no hay récords: ¡completa «{goal}» lo más rápido posible!' },
    noFilterResults: { he: 'אין תוצאות עבור הסינון הזה', en: 'No results for these filters', ar: 'لا نتائج لهذه التصفية', ru: 'Нет результатов для этих фильтров', fr: 'Aucun résultat pour ces filtres', es: 'Sin resultados para estos filtros' },
    catNotFound: { he: 'הקטגוריה לא נמצאה', en: 'Category not found', ar: 'الفئة غير موجودة', ru: 'Категория не найдена', fr: 'Catégorie introuvable', es: 'Categoría no encontrada' },
    anonymous: { he: 'אנונימי', en: 'Anonymous', ar: 'مجهول', ru: 'Аноним', fr: 'Anonyme', es: 'Anónimo' },
    ptsWord: { he: 'נק׳', en: 'pts', ar: 'نقطة', ru: 'очков', fr: 'pts', es: 'pts' },
    yesWord: { he: 'כן', en: 'Yes', ar: 'نعم', ru: 'Да', fr: 'Oui', es: 'Sí' },
    noWord: { he: 'לא', en: 'No', ar: 'لا', ru: 'Нет', fr: 'Non', es: 'No' },
    newSkin: { he: '🎉 סקין חדש נפתח: {name}!', en: '🎉 NEW SKIN UNLOCKED: {name}!', ar: '🎉 تصميم جديد: {name}!', ru: '🎉 НОВЫЙ СКИН: {name}!', fr: '🎉 NOUVEAU SKIN : {name} !', es: '🎉 ¡NUEVO SKIN: {name}!' },
    levelUpRefill: { he: 'עלית שלב! HP מלא', en: 'LEVEL UP! HP REFILL', ar: 'ارتفع المستوى! صحة كاملة', ru: 'НОВЫЙ УРОВЕНЬ! HP ВОССТАНОВЛЕНО', fr: 'NIVEAU SUPÉRIEUR ! PV RESTAURÉS', es: '¡SUBES DE NIVEL! VIDA RECUPERADA' },
    coinsGained: { he: '💰 +{n} מטבעות!', en: '💰 +{n} coins!', ar: '💰 +{n} عملة!', ru: '💰 +{n} монет!', fr: '💰 +{n} pièces !', es: '💰 ¡+{n} monedas!' },
    eduAutoOpen: { he: '⏳ ייפתח אוטומטית בעוד {m}:{s} דקות', en: '⏳ Auto-opens in {m}:{s} min', ar: '⏳ يُفتح تلقائيًا بعد {m}:{s} دقيقة', ru: '⏳ Откроется через {m}:{s} мин', fr: '⏳ Ouverture auto dans {m}:{s} min', es: '⏳ Se abre solo en {m}:{s} min' },
    lockedWord: { he: 'נעול', en: 'Locked', ar: 'مقفل', ru: 'Заблокировано', fr: 'Verrouillé', es: 'Bloqueado' },
    openWord: { he: 'פתוח', en: 'Open', ar: 'مفتوح', ru: 'Открыто', fr: 'Ouvert', es: 'Abierto' },
    eduUnlockFirst: { he: '🔒 יש לבטל את הנעילה עם סיסמה תחילה', en: '🔒 Unlock with password first', ar: '🔒 ألغِ القفل بكلمة المرور أولًا', ru: '🔒 Сначала снимите блокировку паролем', fr: '🔒 Déverrouillez d\'abord avec le mot de passe', es: '🔒 Primero desbloquea con la contraseña' },
    devNoCode: { he: '⚠️ אין קוד להרצה', en: '⚠️ No code to run', ar: '⚠️ لا يوجد كود للتشغيل', ru: '⚠️ Нет кода для запуска', fr: '⚠️ Aucun code à exécuter', es: '⚠️ No hay código para ejecutar' },
    questionTag: { he: 'שאלה', en: 'Question', ar: 'سؤال', ru: 'Вопрос', fr: 'Question', es: 'Pregunta' },
    guestName: { he: 'אורח', en: 'Guest', ar: 'ضيف', ru: 'Гость', fr: 'Invité', es: 'Invitado' },
    achLocked: { he: '🔒 נעול', en: '🔒 Locked', ar: '🔒 مقفل', ru: '🔒 Закрыто', fr: '🔒 Verrouillé', es: '🔒 Bloqueado' },
    abilityVortex: { he: 'לייזר ורטקס', en: 'Vortex Laser', ar: 'ليزر الدوامة', ru: 'Лазер Вортекса', fr: 'Laser Vortex', es: 'Láser Vortex' },
    abilityPhoenix: { he: 'פניקס', en: 'Phoenix', ar: 'العنقاء', ru: 'Феникс', fr: 'Phénix', es: 'Fénix' },
    abilityJoker: { he: 'כאוס ג׳וקר', en: 'Joker Chaos', ar: 'فوضى الجوكر', ru: 'Хаос Джокера', fr: 'Chaos du Joker', es: 'Caos del Joker' },
    abilityDragon: { he: 'אש הדרקון', en: 'Dragon Fire', ar: 'نار التنين', ru: 'Огонь дракона', fr: 'Feu du dragon', es: 'Fuego del dragón' },
    srBestsEmpty: { he: 'עדיין אין שיאים אישיים ב"{goal}"', en: 'No personal bests in "{goal}" yet', ar: 'لا أرقام شخصية في "{goal}" بعد', ru: 'Личных рекордов в «{goal}» пока нет', fr: 'Pas encore de record perso dans « {goal} »', es: 'Aún no hay marcas personales en «{goal}»' },
    histEmpty: { he: 'עדיין אין משחקים שמורים', en: 'No saved games yet', ar: 'لا توجد ألعاب محفوظة بعد', ru: 'Сохранённых игр пока нет', fr: 'Aucune partie enregistrée', es: 'Aún no hay partidas guardadas' },
    histEmpty2: { he: 'עדיין אין היסטוריה — שחק משחק!', en: 'No history yet — play a game!', ar: 'لا يوجد سجل بعد — العب لعبة!', ru: 'Истории пока нет — сыграйте!', fr: 'Pas encore d\'historique — jouez !', es: 'Aún no hay historial: ¡juega una partida!' },
    bestsEmpty: { he: 'אין שיאים לקטגוריה זו עדיין', en: 'No records in this category yet', ar: 'لا أرقام قياسية في هذه الفئة بعد', ru: 'В этой категории рекордов пока нет', fr: 'Aucun record dans cette catégorie', es: 'Aún no hay récords en esta categoría' },
    statGames: { he: 'משחקים', en: 'Games', ar: 'الألعاب', ru: 'Игры', fr: 'Parties', es: 'Partidas' },
    statBest: { he: 'שיא', en: 'Best', ar: 'الأفضل', ru: 'Рекорд', fr: 'Meilleur', es: 'Mejor' },
    statMaxLevel: { he: 'שלב מקסימלי', en: 'Max level', ar: 'أعلى مستوى', ru: 'Макс. уровень', fr: 'Niveau max', es: 'Nivel máx.' },
    statAvg: { he: 'ממוצע', en: 'Average', ar: 'المتوسط', ru: 'Среднее', fr: 'Moyenne', es: 'Promedio' },
    statAvgTime: { he: 'זמן ממוצע', en: 'Avg. time', ar: 'متوسط الوقت', ru: 'Среднее время', fr: 'Temps moyen', es: 'Tiempo medio' },
    statFavShip: { he: 'ספינה מועדפת', en: 'Favorite ship', ar: 'السفينة المفضلة', ru: 'Любимый корабль', fr: 'Vaisseau favori', es: 'Nave favorita' },
    gamesCount: { he: '{a} / {b} משחקים', en: '{a} / {b} games', ar: '{a} / {b} لعبة', ru: '{a} / {b} игр', fr: '{a} / {b} parties', es: '{a} / {b} partidas' },
    bestsCount: { he: '{a} / {b} שיאים', en: '{a} / {b} records', ar: '{a} / {b} رقم قياسي', ru: '{a} / {b} рекордов', fr: '{a} / {b} records', es: '{a} / {b} récords' },
    levelN: { he: 'שלב {n}', en: 'Level {n}', ar: 'المستوى {n}', ru: 'Уровень {n}', fr: 'Niveau {n}', es: 'Nivel {n}' },
    yourBest: { he: 'השיא שלך: {score} נקודות • שלב {level}', en: 'Your best: {score} points • Level {level}', ar: 'أفضل نتيجة لك: {score} نقطة • المستوى {level}', ru: 'Ваш рекорд: {score} очков • Уровень {level}', fr: 'Votre record : {score} points • Niveau {level}', es: 'Tu mejor marca: {score} puntos • Nivel {level}' },
    msgDragon: { he: '🐉 סערת דרקון!', en: '🐉 DRAGON INFERNO!', ar: '🐉 جحيم التنين!', ru: '🐉 АД ДРАКОНА!', fr: '🐉 ENFER DU DRAGON !', es: '🐉 ¡INFIERNO DEL DRAGÓN!' },
    msgRicochet: { he: '🛡️ ריקושט!', en: '🛡️ RICOCHET!', ar: '🛡️ ارتداد!', ru: '🛡️ РИКОШЕТ!', fr: '🛡️ RICOCHET !', es: '🛡️ ¡RICOCHET!' },
    msgFat: { he: 'שמנתי! 🍔🍔🍔', en: 'FAT! 🍔🍔🍔', ar: 'سمين! 🍔🍔🍔', ru: 'ТОЛСТЯК! 🍔🍔🍔', fr: 'GROS ! 🍔🍔🍔', es: '¡GORDO! 🍔🍔🍔' },
    msgAmmoFull: { he: '⚡ תחמושת מלאה!', en: '⚡ AMMO FULL!', ar: '⚡ الذخيرة ممتلئة!', ru: '⚡ БОЕЗАПАС ПОЛОН!', fr: '⚡ MUNITIONS PLEINES !', es: '⚡ ¡MUNICIÓN LLENA!' },
    msgWeightLost: { he: 'ירדת במשקל!', en: 'WEIGHT LOST!', ar: 'خسرت وزنًا!', ru: 'ПОХУДЕЛ!', fr: 'POIDS PERDU !', es: '¡PESO PERDIDO!' },
    msgRepair: { he: 'תיקון +{p}%', en: 'REPAIR +{p}%', ar: 'إصلاح +{p}%', ru: 'РЕМОНТ +{p}%', fr: 'RÉPARATION +{p}%', es: 'REPARACIÓN +{p}%' },
    msgCritRepair: { he: 'תיקון קריטי +75%', en: 'CRITICAL REPAIR +75%', ar: 'إصلاح حرج +75%', ru: 'КРИТ. РЕМОНТ +75%', fr: 'RÉPARATION CRITIQUE +75%', es: 'REPARACIÓN CRÍTICA +75%' },
    msgRepairPts: { he: 'תיקון +{h} ו-{p} נק׳', en: 'REPAIR +{h} & {p} PTS', ar: 'إصلاح +{h} و{p} نقطة', ru: 'РЕМОНТ +{h} и {p} ОЧК.', fr: 'RÉPARATION +{h} et {p} PTS', es: 'REPARACIÓN +{h} y {p} PTS' },
    msgRepairFlat: { he: 'תיקון +20', en: 'REPAIR +20', ar: 'إصلاح +20', ru: 'РЕМОНТ +20', fr: 'RÉPARATION +20', es: 'REPARACIÓN +20' },
    msgVortex: { he: 'לייזר ורטקס: {n} חיסולים!', en: 'VORTEX LASER: {n} KILLS!', ar: 'ليزر الدوامة: {n} إسقاط!', ru: 'ЛАЗЕР ВОРТЕКСА: {n} УБИЙСТВ!', fr: 'LASER VORTEX : {n} KILLS !', es: 'LÁSER VORTEX: ¡{n} BAJAS!' },
    msgChaos: { he: 'כאוס! +{n} נק׳', en: 'CHAOS! +{n} PTS', ar: 'فوضى! +{n} نقطة', ru: 'ХАОС! +{n} ОЧК.', fr: 'CHAOS ! +{n} PTS', es: '¡CAOS! +{n} PTS' },
    upgDoubleScoreName: { he: '⭐ ניקוד כפול', en: '⭐ Score x2', ar: '⭐ ضعف النقاط', ru: '⭐ Двойные очки', fr: '⭐ Score x2', es: '⭐ Puntos x2' },
    upgDoubleScoreDesc: { he: 'כל הניקוד שאתה צובר מוכפל ב-2, בכל משחק ובכל מכשיר', en: 'All the score you earn is doubled, in every game on every device', ar: 'كل النقاط التي تكسبها تتضاعف في كل لعبة وعلى كل الأجهزة', ru: 'Все очки удваиваются в каждой игре на любом устройстве', fr: 'Tous les points gagnés sont doublés à chaque partie, sur tous les appareils', es: 'Todos los puntos que ganes se duplican en cada partida, en cualquier dispositivo' },
    upgScoreX4Name: { he: '⭐ ניקוד ×4', en: '⭐ Score ×4', ar: '⭐ نقاط ×4', ru: '⭐ Очки ×4', fr: '⭐ Score ×4', es: '⭐ Puntuación ×4' },
    upgScoreX4Desc: { he: 'מכפיל את כל הניקוד פי 4 בכל משחק', en: 'Multiplies all score by 4 in every game', ar: 'يضاعف كل النقاط 4 مرات في كل لعبة', ru: 'Умножает все очки на 4 в каждой игре', fr: 'Multiplie tous les points par 4 à chaque partie', es: 'Multiplica toda la puntuación por 4 en cada partida' },
    upgScoreX6Name: { he: '⭐ ניקוד ×6', en: '⭐ Score ×6', ar: '⭐ نقاط ×6', ru: '⭐ Очки ×6', fr: '⭐ Score ×6', es: '⭐ Puntuación ×6' },
    upgScoreX6Desc: { he: 'מכפיל את כל הניקוד פי 6 בכל משחק', en: 'Multiplies all score by 6 in every game', ar: 'يضاعف كل النقاط 6 مرات في كل لعبة', ru: 'Умножает все очки на 6 в каждой игре', fr: 'Multiplie tous les points par 6 à chaque partie', es: 'Multiplica toda la puntuación por 6 en cada partida' },
    upgScoreX8Name: { he: '⭐ ניקוד ×8', en: '⭐ Score ×8', ar: '⭐ نقاط ×8', ru: '⭐ Очки ×8', fr: '⭐ Score ×8', es: '⭐ Puntuación ×8' },
    upgScoreX8Desc: { he: 'מכפיל את כל הניקוד פי 8 בכל משחק', en: 'Multiplies all score by 8 in every game', ar: 'يضاعف كل النقاط 8 مرات في كل لعبة', ru: 'Умножает все очки на 8 в каждой игре', fr: 'Multiplie tous les points par 8 à chaque partie', es: 'Multiplica toda la puntuación por 8 en cada partida' },
    upgScoreX10Name: { he: '⭐ ניקוד ×10', en: '⭐ Score ×10', ar: '⭐ نقاط ×10', ru: '⭐ Очки ×10', fr: '⭐ Score ×10', es: '⭐ Puntuación ×10' },
    upgScoreX10Desc: { he: 'מכפיל את כל הניקוד פי 10 בכל משחק', en: 'Multiplies all score by 10 in every game', ar: 'يضاعف كل النقاط 10 مرات في كل لعبة', ru: 'Умножает все очки на 10 в каждой игре', fr: 'Multiplie tous les points par 10 à chaque partie', es: 'Multiplica toda la puntuación por 10 en cada partida' },
    shopTabGlobal: { he: 'כללי', en: 'General', ar: 'عام', ru: 'Общее', fr: 'Général', es: 'General' },
    bossArenaHP: { he: 'בונוס זירה: חיים עד {n}!', en: 'ARENA BONUS: HP up to {n}!', ar: 'مكافأة الحلبة: الصحة حتى {n}!', ru: 'БОНУС АРЕНЫ: HP до {n}!', fr: 'BONUS D\'ARÈNE : PV jusqu\'à {n} !', es: '¡BONO DE ARENA: VIDA hasta {n}!' },
    bossMines: { he: 'מוקשים!', en: 'MINES!', ar: 'ألغام!', ru: 'МИНЫ!', fr: 'MINES !', es: '¡MINAS!' },
    bossLightning: { he: 'ברקים!', en: 'LIGHTNING!', ar: 'صواعق!', ru: 'МОЛНИИ!', fr: 'FOUDRE !', es: '¡RAYOS!' },
    bossBurst: { he: 'סערה!', en: 'STORM!', ar: 'عاصفة!', ru: 'БУРЯ!', fr: 'TEMPÊTE !', es: '¡TORMENTA!' },
    bossWall: { he: 'קיר!', en: 'WALL!', ar: 'جدار!', ru: 'СТЕНА!', fr: 'MUR !', es: '¡MURO!' },
    bossMissiles: { he: 'טילים!', en: 'MISSILES!', ar: 'صواريخ!', ru: 'РАКЕТЫ!', fr: 'MISSILES !', es: '¡MISILES!' },
    bossMeteors: { he: 'מטאורים!', en: 'METEORS!', ar: 'نيازك!', ru: 'МЕТЕОРИТЫ!', fr: 'MÉTÉORES !', es: '¡METEORITOS!' },
    bossDrones: { he: 'תגבורת!', en: 'REINFORCEMENTS!', ar: 'تعزيزات!', ru: 'ПОДКРЕПЛЕНИЕ!', fr: 'RENFORTS !', es: '¡REFUERZOS!' },
    bossPhase2: { he: 'הוא כועס!', en: 'HE\'S ANGRY!', ar: 'لقد غضب!', ru: 'ОН В ЯРОСТИ!', fr: 'IL EST FURIEUX !', es: '¡ESTÁ FURIOSO!' },
    bossPhase3: { he: 'זעם מוחלט!', en: 'ENRAGED!', ar: 'غضب مطلق!', ru: 'БЕШЕНСТВО!', fr: 'FUREUR TOTALE !', es: '¡FURIA TOTAL!' },
    bossWeak: { he: 'חשוף! נזק x2', en: 'EXPOSED! x2 DMG', ar: 'مكشوف! ضرر x2', ru: 'УЯЗВИМ! УРОН x2', fr: 'EXPOSÉ ! DÉGÂTS x2', es: '¡EXPUESTO! DAÑO x2' },
    bossShield: { he: 'מגן!', en: 'SHIELD!', ar: 'درع!', ru: 'ЩИТ!', fr: 'BOUCLIER !', es: '¡ESCUDO!' },
    goalBoss: { he: 'הריגת בוס', en: 'Boss kill', ar: 'هزيمة الزعيم', ru: 'Победа над боссом', fr: 'Boss vaincu', es: 'Jefe derrotado' },
    bossBadgeTitle: { he: 'הביס את הבוס', en: 'Defeated the boss', ar: 'هزم الزعيم', ru: 'Победил босса', fr: 'A vaincu le boss', es: 'Derrotó al jefe' },
    bossName: { he: 'מלך הקוביות', en: 'Cube King', ar: 'ملك المكعبات', ru: 'Король кубов', fr: 'Roi des Cubes', es: 'Rey de los Cubos' },
    bossWarning: { he: '⚠ אזהרה! בוס מתקרב ⚠', en: '⚠ WARNING! BOSS INCOMING ⚠', ar: '⚠ تحذير! زعيم قادم ⚠', ru: '⚠ ВНИМАНИЕ! ПРИБЛИЖАЕТСЯ БОСС ⚠', fr: '⚠ ATTENTION ! BOSS EN APPROCHE ⚠', es: '⚠ ¡ATENCIÓN! JEFE EN CAMINO ⚠' },
    bossDefeated: { he: 'הבוס הובס!', en: 'BOSS DEFEATED!', ar: 'تم هزيمة الزعيم!', ru: 'БОСС ПОВЕРЖЕН!', fr: 'BOSS VAINCU !', es: '¡JEFE DERROTADO!' },
    bossReward: { he: '+{score} נק׳  +{coins} 💰', en: '+{score} pts  +{coins} 💰', ar: '+{score} نقطة  +{coins} 💰', ru: '+{score} очков  +{coins} 💰', fr: '+{score} pts  +{coins} 💰', es: '+{score} pts  +{coins} 💰' },
    gameOverTitle: { he: 'המשחק נגמר', en: 'Game Over', ar: 'انتهت اللعبة', ru: 'Игра окончена', fr: 'Partie terminée', es: 'Fin del juego' },
    authLoginOk: { he: 'התחברת בהצלחה! 🎉', en: 'Signed in successfully! 🎉', ar: 'تم تسجيل الدخول بنجاح! 🎉', ru: 'Вход выполнен! 🎉', fr: 'Connexion réussie ! 🎉', es: '¡Sesión iniciada! 🎉' },
    authExistsGoogle: { he: 'האימייל הזה כבר קיים עם Google. מחבר...', en: 'This email already exists with Google. Connecting...', ar: 'هذا البريد موجود مع Google. جارٍ الربط...', ru: 'Этот email уже связан с Google. Подключаем...', fr: 'Cet e-mail existe déjà avec Google. Connexion...', es: 'Este correo ya existe con Google. Conectando...' },
    authLinked: { he: 'החשבונות קושרו בהצלחה! 🎉', en: 'Accounts linked successfully! 🎉', ar: 'تم ربط الحسابات بنجاح! 🎉', ru: 'Аккаунты связаны! 🎉', fr: 'Comptes liés avec succès ! 🎉', es: '¡Cuentas vinculadas! 🎉' },
    authEmailRegistered: { he: 'האימייל כבר רשום. נסה להתחבר במקום', en: 'This email is already registered. Try signing in instead', ar: 'هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول', ru: 'Этот email уже зарегистрирован. Попробуйте войти', fr: 'Cet e-mail est déjà inscrit. Essayez de vous connecter', es: 'Este correo ya está registrado. Prueba a iniciar sesión' },
    authSignupOk: { he: 'ההרשמה הושלמה בהצלחה! 🎉', en: 'Signed up successfully! 🎉', ar: 'تم التسجيل بنجاح! 🎉', ru: 'Регистрация завершена! 🎉', fr: 'Inscription réussie ! 🎉', es: '¡Registro completado! 🎉' },
    authNeedLogin: { he: 'עליך להתחבר קודם', en: 'You need to sign in first', ar: 'عليك تسجيل الدخول أولًا', ru: 'Сначала войдите в аккаунт', fr: 'Vous devez d\'abord vous connecter', es: 'Primero debes iniciar sesión' },
    authGoogleLinked: { he: 'חשבון Google קושר בהצלחה! 🎉', en: 'Google account linked successfully! 🎉', ar: 'تم ربط حساب Google بنجاح! 🎉', ru: 'Аккаунт Google связан! 🎉', fr: 'Compte Google lié avec succès ! 🎉', es: '¡Cuenta de Google vinculada! 🎉' },
    authLogoutOk: { he: 'התנתקת בהצלחה', en: 'Signed out successfully', ar: 'تم تسجيل الخروج', ru: 'Вы вышли из аккаунта', fr: 'Déconnexion réussie', es: 'Sesión cerrada' },
    authLogoutErr: { he: 'שגיאה בהתנתקות', en: 'Error signing out', ar: 'خطأ أثناء تسجيل الخروج', ru: 'Ошибка при выходе', fr: 'Erreur de déconnexion', es: 'Error al cerrar sesión' },
    authNameUpdated: { he: 'השם עודכן בהצלחה! ✅', en: 'Name updated successfully! ✅', ar: 'تم تحديث الاسم! ✅', ru: 'Имя обновлено! ✅', fr: 'Nom mis à jour ! ✅', es: '¡Nombre actualizado! ✅' },
    authNameErr: { he: 'שגיאה בעדכון השם', en: 'Error updating name', ar: 'خطأ في تحديث الاسم', ru: 'Ошибка обновления имени', fr: 'Erreur de mise à jour du nom', es: 'Error al actualizar el nombre' },
    authFillAll: { he: 'נא למלא את כל השדות', en: 'Please fill in all fields', ar: 'يرجى ملء جميع الحقول', ru: 'Заполните все поля', fr: 'Veuillez remplir tous les champs', es: 'Completa todos los campos' },
    authFillEmailPw: { he: 'נא למלא מייל וסיסמה', en: 'Please enter email and password', ar: 'يرجى إدخال البريد وكلمة المرور', ru: 'Введите email и пароль', fr: 'Veuillez saisir e-mail et mot de passe', es: 'Introduce correo y contraseña' },
    authNewName: { he: 'שם חדש:', en: 'New name:', ar: 'الاسم الجديد:', ru: 'Новое имя:', fr: 'Nouveau nom :', es: 'Nuevo nombre:' },
    authErrInUse: { he: 'האימייל כבר בשימוש', en: 'Email is already in use', ar: 'البريد قيد الاستخدام بالفعل', ru: 'Email уже используется', fr: 'E-mail déjà utilisé', es: 'El correo ya está en uso' },
    authErrWeak: { he: 'הסיסמה חלשה מדי (לפחות 6 תווים)', en: 'Password is too weak (at least 6 characters)', ar: 'كلمة المرور ضعيفة (6 أحرف على الأقل)', ru: 'Слишком слабый пароль (минимум 6 символов)', fr: 'Mot de passe trop faible (6 caractères minimum)', es: 'Contraseña demasiado débil (mínimo 6 caracteres)' },
    authErrEmail: { he: 'כתובת אימייל לא תקינה', en: 'Invalid email address', ar: 'عنوان بريد غير صالح', ru: 'Неверный email', fr: 'Adresse e-mail invalide', es: 'Correo no válido' },
    authErrNoUser: { he: 'משתמש לא נמצא', en: 'User not found', ar: 'المستخدم غير موجود', ru: 'Пользователь не найден', fr: 'Utilisateur introuvable', es: 'Usuario no encontrado' },
    authErrWrongPw: { he: 'סיסמה שגויה', en: 'Wrong password', ar: 'كلمة مرور خاطئة', ru: 'Неверный пароль', fr: 'Mot de passe incorrect', es: 'Contraseña incorrecta' },
    authErrPopup: { he: 'חלון ההתחברות נסגר', en: 'Sign-in window was closed', ar: 'تم إغلاق نافذة تسجيل الدخول', ru: 'Окно входа закрыто', fr: 'La fenêtre de connexion a été fermée', es: 'Se cerró la ventana de inicio de sesión' },
    authErrDiffCred: { he: 'קיים חשבון עם שיטת התחברות אחרת', en: 'Account exists with different sign-in method', ar: 'يوجد حساب بطريقة دخول مختلفة', ru: 'Аккаунт существует с другим способом входа', fr: 'Un compte existe avec une autre méthode de connexion', es: 'Existe una cuenta con otro método de acceso' },
    authErrCredUsed: { he: 'פרטי ההתחברות כבר בשימוש', en: 'Credentials are already in use', ar: 'بيانات الدخول مستخدمة بالفعل', ru: 'Данные для входа уже используются', fr: 'Identifiants déjà utilisés', es: 'Las credenciales ya están en uso' },
    authErrUnknown: { he: 'שגיאה לא צפויה', en: 'Unexpected error', ar: 'خطأ غير متوقع', ru: 'Непредвиденная ошибка', fr: 'Erreur inattendue', es: 'Error inesperado' },
    newShipTitle: { he: '✨ ספינה חדשה! ✨', en: '✨ NEW SHIP! ✨', ar: '✨ سفينة جديدة! ✨', ru: '✨ НОВЫЙ КОРАБЛЬ! ✨', fr: '✨ NOUVEAU VAISSEAU ! ✨', es: '✨ ¡NUEVA NAVE! ✨' },
    levelUpTitle: { he: 'שלב {n}!', en: 'LEVEL {n}!', ar: 'المستوى {n}!', ru: 'УРОВЕНЬ {n}!', fr: 'NIVEAU {n} !', es: '¡NIVEL {n}!' },
};

// ---------- Runtime ----------
const LANG_COOKIE = 'gameLang';

function readCookie(name) {
    const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name, value) {
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000`;
}

const SUPPORTED = new Set(LANGUAGES.map(l => l.code));

// Detect browser language; fallback to Hebrew.
function detectLang() {
    const nav = (navigator.language || navigator.userLanguage || 'he').slice(0, 2).toLowerCase();
    return SUPPORTED.has(nav) ? nav : 'he';
}

export let currentLang = readCookie(LANG_COOKIE) || detectLang();

export function t(key) {
    const entry = STRINGS[key];
    if (!entry) { console.warn(`[i18n] Unknown key: "${key}"`); return key; }
    return entry[currentLang] ?? (currentLang === 'he' ? entry.he : (entry.en ?? entry.he));
}

// Translate with {placeholders}: tf('key', { n: 5 })
export function tf(key, vars = {}) {
    return t(key).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

// Apply language to all [data-i18n] elements in the DOM.
export function applyLang(lang) {
    if (lang) {
        currentLang = lang;
        writeCookie(LANG_COOKIE, lang);
    }

    const langMeta = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
    document.documentElement.lang = currentLang;
    document.documentElement.dir  = langMeta.dir;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const attr = el.dataset.i18nAttr; // e.g. "placeholder"
        const val = t(key);
        if (attr) {
            el[attr] = val;
            el.setAttribute(attr, val);
        } else {
            el.innerHTML = val;
        }
    });

    document.querySelectorAll('[data-lock-n]').forEach(el => {
        el.textContent = tf('lockLvl', { n: el.dataset.lockN });
    });

    // Update the toggle button label (shows the OTHER language name)
    document.querySelectorAll('[data-i18n="langToggle"]').forEach(el => {
        el.textContent = t('langToggle');
    });

    // Notify listeners (like renderLangList) that language changed
    window.dispatchEvent(new Event('langchange'));
}

export function toggleLang() {
    // Cycle to the next language in the list (kept for backwards compatibility).
    const idx = LANGUAGES.findIndex(l => l.code === currentLang);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length].code;
    applyLang(next);
}
