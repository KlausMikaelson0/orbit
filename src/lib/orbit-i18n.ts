import type { OrbitLocale } from "@/src/types/orbit";

export const ORBIT_LOCALES: OrbitLocale[] = ["en", "ar", "tr"];
export const ORBIT_LOCALE_STORAGE_KEY = "orbit.locale.v1";
export const ORBIT_RTL_LOCALES = new Set<OrbitLocale>(["ar"]);

export const ORBIT_LOCALE_NAMES: Record<OrbitLocale, string> = {
  en: "English",
  ar: "العربية",
  tr: "Türkçe",
};

const enMessages = {
  "language.label": "Language",

  "auth.orbitAuth": "Orbit Auth",
  "auth.secureFastRealtime": "Secure. Fast. Realtime-native.",
  "auth.welcomeBack": "Welcome back to Orbit",
  "auth.createIdentity": "Create your Orbit identity",
  "auth.subtitleSignin": "Continue your mission in Unified Spaces.",
  "auth.subtitleSignup": "Spin up your workspace and invite your team.",
  "auth.namePlaceholder": "Your name",
  "auth.emailPlaceholder": "you@orbit.team",
  "auth.passwordPlaceholder": "••••••••",
  "auth.signInButton": "Sign in to Orbit",
  "auth.createButton": "Create Orbit account",
  "auth.googleButton": "Continue with Google",
  "auth.needAccount": "Need an account? Create one",
  "auth.haveAccount": "Already have an account? Sign in",
  "auth.accountCreated":
    "Account created. Verify your email if confirmation is enabled, then sign in.",
  "auth.notConfigured":
    "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables.",
  "auth.emailPasswordRequired": "Email and password are required.",
  "auth.oauthSetupHelp":
    "If Google login fails, add your callback URL in Supabase Auth > URL Configuration.",
  "auth.identityLayer": "Orbit Identity Layer",
  "auth.missionTitle": "Your mission starts with one secure node.",
  "auth.missionDescription":
    "Orbit Auth is tuned for modern product teams: email/password, Google OAuth, and Supabase session continuity that scales from MVP to global realtime collaboration.",
  "auth.sessionContinuity": "Session continuity",
  "auth.crossTabSynced": "Cross-tab synced",
  "auth.oauthReadiness": "OAuth readiness",
  "auth.googleEnabled": "Google enabled",
  "auth.backHome": "Back to home",

  "dashboard.supabaseSetupRequired": "Supabase setup required",
  "dashboard.supabaseSetupHelp":
    "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local or Vercel project settings to activate Orbit Auth and realtime sync.",
  "dashboard.authenticationRequired": "Authentication required",
  "dashboard.authenticationHelp":
    "Sign in to enter Orbit Dashboard and unlock Unified Spaces.",
  "dashboard.goToAuth": "Go to Orbit Auth",
  "dashboard.join": "Join",

  "settings.languageTitle": "Language",
  "settings.languageHelp":
    "Choose your preferred app language. Orbit applies it instantly.",

  "landing.features": "Features",
  "landing.about": "About",
  "landing.safety": "Safety",
  "landing.download": "Download",
  "landing.login": "Login",
  "landing.openBrowser": "Open Orbit in Browser",
  "landing.badge": "Orbit Desktop + Browser Ecosystem",
  "landing.heroTitle": "Orbit: The Evolution of Communication.",
  "landing.heroSubtitle":
    "A faster, cleaner, and AI-powered space for your communities. Built for the next generation.",
  "landing.downloadFor": "Download for {label}",
  "landing.openInBrowser": "Open in your browser",
  "landing.runtime": "Orbit Runtime",
  "landing.realtimeLatency": "Realtime latency",
  "landing.desktopWebParity": "Desktop + Web parity",
  "landing.oneEcosystem": "One ecosystem",
  "landing.aiRails": "AI + Moderation rails",
  "landing.builtInByDefault": "Built-in by default",
  "landing.whyTitle": "Why Orbit?",
  "landing.whySubtitle":
    "Everything your communities need, without the legacy clutter.",
  "landing.speedTitle": "Pure Speed",
  "landing.speedDesc":
    "Next.js-powered rendering and instant realtime sync keep Orbit feeling unbelievably fast at scale.",
  "landing.privacyTitle": "Privacy First",
  "landing.privacyDesc":
    "No ad-driven dark patterns. End-to-end trust, secure auth, and collaboration controls built in.",
  "landing.aiTitle": "Built-in AI",
  "landing.aiDesc":
    "AI summaries, moderation insights, and command workflows make every channel cleaner and smarter.",
  "landing.howTitle": "How to Orbit",
  "landing.howSubtitle":
    "Go live in minutes and scale from friend group to global community.",
  "landing.step1Title": "Create your Space",
  "landing.step1Desc":
    "Launch your first server and shape channels for your team or community.",
  "landing.step2Title": "Invite your Orbitals",
  "landing.step2Desc":
    "Share an invite code to bring friends and teammates into your ecosystem.",
  "landing.step3Title": "Launch instantly",
  "landing.step3Desc":
    "Switch to voice, video, or text rooms with no lag and no clutter.",
  "landing.safetyTitle": "Safety by design",
  "landing.safetySubtitle":
    "Built for trust with moderation systems, privacy controls, and secure auth rails.",
  "landing.platformSecurityTitle": "Platform Security",
  "landing.platformSecurityDesc":
    "2FA support, rate limiting, image moderation checks, and role-based controls keep every space protected.",
  "landing.communityIntegrityTitle": "Community Integrity",
  "landing.communityIntegrityDesc":
    "Real-time presence, moderation tooling, and smart bot APIs give owners clarity and control over growth.",
  "landing.aboutBadge": "About Orbit",
  "landing.aboutTitle": "A free, open, and modern communication core.",
  "landing.aboutDesc":
    "We built Orbit to be a powerful alternative to cluttered legacy apps: lightning-fast messaging, thoughtful design, desktop-grade reliability, and AI-assisted collaboration in one seamless platform. Orbit is crafted for builders, communities, and teams who want clarity, control, and momentum.",
  "landing.footerPolicyTitle": "Platform Policy",
  "landing.termsLink": "Terms",
  "landing.privacyLink": "Privacy",
  "landing.footerCopy": "Orbit is built for secure, high-trust communication.",
} as const;

type OrbitTranslationKey = keyof typeof enMessages;

const arMessages: Record<OrbitTranslationKey, string> = {
  "language.label": "اللغة",

  "auth.orbitAuth": "تسجيل أوربت",
  "auth.secureFastRealtime": "آمن. سريع. لحظي.",
  "auth.welcomeBack": "مرحبًا بعودتك إلى Orbit",
  "auth.createIdentity": "أنشئ هويتك في Orbit",
  "auth.subtitleSignin": "كمّل رحلتك داخل المساحات الموحدة.",
  "auth.subtitleSignup": "ابدأ مساحة العمل وادعُ فريقك بسرعة.",
  "auth.namePlaceholder": "اسمك",
  "auth.emailPlaceholder": "you@orbit.team",
  "auth.passwordPlaceholder": "••••••••",
  "auth.signInButton": "تسجيل الدخول إلى Orbit",
  "auth.createButton": "إنشاء حساب Orbit",
  "auth.googleButton": "المتابعة عبر Google",
  "auth.needAccount": "ما عندك حساب؟ أنشئ حساب",
  "auth.haveAccount": "عندك حساب؟ سجّل دخول",
  "auth.accountCreated":
    "تم إنشاء الحساب. إذا التحقق بالإيميل مفعّل، أكد بريدك ثم سجّل دخول.",
  "auth.notConfigured":
    "Supabase غير مهيأ بعد. أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في متغيرات Vercel.",
  "auth.emailPasswordRequired": "الإيميل وكلمة المرور مطلوبان.",
  "auth.oauthSetupHelp":
    "إذا تسجيل Google ما اشتغل، أضف رابط callback في Supabase Auth > URL Configuration.",
  "auth.identityLayer": "طبقة هوية Orbit",
  "auth.missionTitle": "بداية مهمتك تكون بعقدة آمنة واحدة.",
  "auth.missionDescription":
    "نظام تسجيل Orbit مصمم للفرق الحديثة: إيميل/كلمة مرور، Google OAuth، واستمرارية جلسات Supabase للتعاون اللحظي على نطاق واسع.",
  "auth.sessionContinuity": "استمرارية الجلسة",
  "auth.crossTabSynced": "مزامنة بين التبويبات",
  "auth.oauthReadiness": "جاهزية OAuth",
  "auth.googleEnabled": "Google مفعّل",
  "auth.backHome": "العودة للرئيسية",

  "dashboard.supabaseSetupRequired": "مطلوب إعداد Supabase",
  "dashboard.supabaseSetupHelp":
    "أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في .env.local أو إعدادات Vercel لتفعيل تسجيل Orbit والمزامنة اللحظية.",
  "dashboard.authenticationRequired": "مطلوب تسجيل الدخول",
  "dashboard.authenticationHelp":
    "سجّل دخولك لفتح لوحة Orbit والوصول للمساحات الموحدة.",
  "dashboard.goToAuth": "الانتقال لتسجيل Orbit",
  "dashboard.join": "انضم",

  "settings.languageTitle": "اللغة",
  "settings.languageHelp": "اختر لغة التطبيق المفضلة، وسيتم التطبيق مباشرة.",

  "landing.features": "المميزات",
  "landing.about": "عن Orbit",
  "landing.safety": "الأمان",
  "landing.download": "تحميل",
  "landing.login": "تسجيل الدخول",
  "landing.openBrowser": "فتح Orbit في المتصفح",
  "landing.badge": "منظومة Orbit للويب + سطح المكتب",
  "landing.heroTitle": "Orbit: تطور التواصل.",
  "landing.heroSubtitle":
    "مساحة أسرع وأنظف ومدعومة بالذكاء الاصطناعي لمجتمعاتك، مبنية للجيل القادم.",
  "landing.downloadFor": "تحميل لـ {label}",
  "landing.openInBrowser": "افتحه في المتصفح",
  "landing.runtime": "بيئة تشغيل Orbit",
  "landing.realtimeLatency": "زمن استجابة لحظي",
  "landing.desktopWebParity": "تطابق الويب وسطح المكتب",
  "landing.oneEcosystem": "منظومة واحدة",
  "landing.aiRails": "مسارات الذكاء الاصطناعي والإشراف",
  "landing.builtInByDefault": "مدمجة بشكل افتراضي",
  "landing.whyTitle": "ليش Orbit؟",
  "landing.whySubtitle": "كل ما يحتاجه مجتمعك بدون تعقيد التطبيقات القديمة.",
  "landing.speedTitle": "سرعة خالصة",
  "landing.speedDesc":
    "عرض سريع عبر Next.js ومزامنة فورية تجعل Orbit سريعًا بشكل واضح حتى مع التوسع.",
  "landing.privacyTitle": "الخصوصية أولًا",
  "landing.privacyDesc":
    "بدون أنماط إعلانية مزعجة. ثقة كاملة، تسجيل آمن، وتحكم تعاوني مدمج.",
  "landing.aiTitle": "ذكاء اصطناعي مدمج",
  "landing.aiDesc":
    "ملخصات ذكية وإشراف تلقائي وأوامر عملية تجعل القنوات أوضح وأذكى.",
  "landing.howTitle": "كيف تبدأ في Orbit",
  "landing.howSubtitle": "ابدأ خلال دقائق وتوسّع من مجموعة أصدقاء إلى مجتمع كامل.",
  "landing.step1Title": "أنشئ مساحتك",
  "landing.step1Desc": "أنشئ أول سيرفر واضبط قنواته لفريقك أو مجتمعك.",
  "landing.step2Title": "ادعُ Orbitals",
  "landing.step2Desc": "شارك كود الدعوة وادخل أصدقاءك وفريقك لنفس المنظومة.",
  "landing.step3Title": "انطلق فورًا",
  "landing.step3Desc": "انتقل للصوت أو الفيديو أو النص بدون تأخير أو فوضى.",
  "landing.safetyTitle": "الأمان بالتصميم",
  "landing.safetySubtitle":
    "مبني على الثقة مع أنظمة إشراف وخصوصية وتوثيق آمن.",
  "landing.platformSecurityTitle": "أمان المنصة",
  "landing.platformSecurityDesc":
    "دعم 2FA وتحديد المعدل وفحص الصور وصلاحيات الأدوار لحماية كل مساحة.",
  "landing.communityIntegrityTitle": "سلامة المجتمع",
  "landing.communityIntegrityDesc":
    "حضور لحظي وأدوات إشراف وواجهات بوت ذكية تمنح المالك وضوحًا وتحكمًا بالنمو.",
  "landing.aboutBadge": "عن Orbit",
  "landing.aboutTitle": "نواة تواصل حديثة، مجانية ومفتوحة.",
  "landing.aboutDesc":
    "بنينا Orbit كبديل أقوى للتطبيقات القديمة المزدحمة: رسائل فائقة السرعة، تصميم مدروس، موثوقية سطح مكتب، وتعاون مدعوم بالذكاء الاصطناعي في منصة واحدة.",
  "landing.footerPolicyTitle": "سياسات المنصة",
  "landing.termsLink": "الشروط",
  "landing.privacyLink": "الخصوصية",
  "landing.footerCopy": "Orbit مبني لتواصل آمن وعالي الثقة.",
};

const trMessages: Record<OrbitTranslationKey, string> = {
  "language.label": "Dil",

  "auth.orbitAuth": "Orbit Giriş",
  "auth.secureFastRealtime": "Güvenli. Hızlı. Gerçek zamanlı.",
  "auth.welcomeBack": "Orbit'e tekrar hoş geldin",
  "auth.createIdentity": "Orbit kimliğini oluştur",
  "auth.subtitleSignin": "Birleşik Alanlardaki görevine devam et.",
  "auth.subtitleSignup": "Çalışma alanını başlat ve ekibini davet et.",
  "auth.namePlaceholder": "Adın",
  "auth.emailPlaceholder": "you@orbit.team",
  "auth.passwordPlaceholder": "••••••••",
  "auth.signInButton": "Orbit'e giriş yap",
  "auth.createButton": "Orbit hesabı oluştur",
  "auth.googleButton": "Google ile devam et",
  "auth.needAccount": "Hesabın yok mu? Oluştur",
  "auth.haveAccount": "Zaten hesabın var mı? Giriş yap",
  "auth.accountCreated":
    "Hesap oluşturuldu. E-posta doğrulaması açıksa doğrulayıp giriş yap.",
  "auth.notConfigured":
    "Supabase henüz yapılandırılmadı. Vercel ortam değişkenlerine NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.",
  "auth.emailPasswordRequired": "E-posta ve şifre zorunludur.",
  "auth.oauthSetupHelp":
    "Google girişi çalışmıyorsa callback URL'ini Supabase Auth > URL Configuration bölümüne ekleyin.",
  "auth.identityLayer": "Orbit Kimlik Katmanı",
  "auth.missionTitle": "Görevin tek güvenli düğümle başlar.",
  "auth.missionDescription":
    "Orbit Auth modern ekipler için optimize edildi: e-posta/şifre, Google OAuth ve MVP'den küresel gerçek zamanlı işbirliğine uzanan Supabase oturum sürekliliği.",
  "auth.sessionContinuity": "Oturum sürekliliği",
  "auth.crossTabSynced": "Sekmeler arası senkron",
  "auth.oauthReadiness": "OAuth hazır",
  "auth.googleEnabled": "Google etkin",
  "auth.backHome": "Ana sayfaya dön",

  "dashboard.supabaseSetupRequired": "Supabase kurulumu gerekli",
  "dashboard.supabaseSetupHelp":
    "Orbit Auth ve gerçek zamanlı senkronizasyon için NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini .env.local veya Vercel ayarlarına ekleyin.",
  "dashboard.authenticationRequired": "Kimlik doğrulama gerekli",
  "dashboard.authenticationHelp":
    "Orbit paneline girmek ve Birleşik Alanları açmak için giriş yap.",
  "dashboard.goToAuth": "Orbit giriş sayfasına git",
  "dashboard.join": "Katıl",

  "settings.languageTitle": "Dil",
  "settings.languageHelp": "Tercih ettiğin uygulama dilini seç. Anında uygulanır.",

  "landing.features": "Özellikler",
  "landing.about": "Hakkında",
  "landing.safety": "Güvenlik",
  "landing.download": "İndir",
  "landing.login": "Giriş",
  "landing.openBrowser": "Orbit'i tarayıcıda aç",
  "landing.badge": "Orbit Masaüstü + Web Ekosistemi",
  "landing.heroTitle": "Orbit: İletişimin Evrimi.",
  "landing.heroSubtitle":
    "Toplulukların için daha hızlı, daha temiz ve yapay zekâ destekli bir alan.",
  "landing.downloadFor": "{label} için indir",
  "landing.openInBrowser": "Tarayıcıda aç",
  "landing.runtime": "Orbit Çalışma Zamanı",
  "landing.realtimeLatency": "Gerçek zamanlı gecikme",
  "landing.desktopWebParity": "Masaüstü + Web uyumu",
  "landing.oneEcosystem": "Tek ekosistem",
  "landing.aiRails": "Yapay zekâ + moderasyon",
  "landing.builtInByDefault": "Varsayılan olarak yerleşik",
  "landing.whyTitle": "Neden Orbit?",
  "landing.whySubtitle":
    "Topluluğunuzun ihtiyaç duyduğu her şey, eski karmaşa olmadan.",
  "landing.speedTitle": "Saf Hız",
  "landing.speedDesc":
    "Next.js tabanlı render ve anlık senkronizasyon Orbit'i ölçekte bile hızlı hissettirir.",
  "landing.privacyTitle": "Önce Gizlilik",
  "landing.privacyDesc":
    "Reklam odaklı karanlık desenler yok. Güvenli kimlik doğrulama ve kontrol mekanizmaları hazır.",
  "landing.aiTitle": "Yerleşik Yapay Zekâ",
  "landing.aiDesc":
    "Özetler, moderasyon içgörüleri ve komut akışları kanalları daha akıllı kılar.",
  "landing.howTitle": "Orbit nasıl kullanılır",
  "landing.howSubtitle":
    "Dakikalar içinde başlayın, küçük ekipten büyük topluluğa ölçekleyin.",
  "landing.step1Title": "Alanını oluştur",
  "landing.step1Desc":
    "İlk sunucunu başlat ve kanallarını ekip veya topluluğuna göre düzenle.",
  "landing.step2Title": "Orbitals'ı davet et",
  "landing.step2Desc": "Davet kodunu paylaş, arkadaşlarını ve ekibini ekosisteme al.",
  "landing.step3Title": "Anında başlat",
  "landing.step3Desc":
    "Ses, video veya metin kanallarına gecikmesiz ve düzenli şekilde geç.",
  "landing.safetyTitle": "Tasarımla güvenlik",
  "landing.safetySubtitle":
    "Moderasyon, gizlilik kontrolleri ve güvenli doğrulama ile güven odaklı.",
  "landing.platformSecurityTitle": "Platform Güvenliği",
  "landing.platformSecurityDesc":
    "2FA, hız sınırlama, görsel moderasyonu ve rol kontrolleri ile alanlar korunur.",
  "landing.communityIntegrityTitle": "Topluluk Bütünlüğü",
  "landing.communityIntegrityDesc":
    "Gerçek zamanlı durum, moderasyon araçları ve bot API'leri ile sahipler büyümeyi yönetir.",
  "landing.aboutBadge": "Orbit hakkında",
  "landing.aboutTitle": "Ücretsiz, açık ve modern bir iletişim çekirdeği.",
  "landing.aboutDesc":
    "Orbit'i eski ve dağınık uygulamalara güçlü bir alternatif olarak geliştirdik: yüksek hızlı mesajlaşma, iyi tasarım, masaüstü güvenilirliği ve yapay zekâ destekli işbirliği tek platformda.",
  "landing.footerPolicyTitle": "Platform Politikası",
  "landing.termsLink": "Kullanım Koşulları",
  "landing.privacyLink": "Gizlilik",
  "landing.footerCopy": "Orbit güvenli ve yüksek güven odaklı iletişim için üretildi.",
};

const messages: Record<OrbitLocale, Record<OrbitTranslationKey, string>> = {
  en: enMessages,
  ar: arMessages,
  tr: trMessages,
};

export function isOrbitLocale(value: string): value is OrbitLocale {
  return ORBIT_LOCALES.includes(value as OrbitLocale);
}

export function translateOrbit(
  locale: OrbitLocale,
  key: OrbitTranslationKey,
  params?: Record<string, string | number>,
) {
  const template = messages[locale][key] ?? messages.en[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(params[token] ?? ""),
  );
}

export type { OrbitTranslationKey };
