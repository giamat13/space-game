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
    return entry[currentLang] ?? entry.he;
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
