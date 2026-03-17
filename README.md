# Work Pulse PWA

מערכת עדכון סטטוס עבודה לפרויקטים ותתי-פרויקטים, עם תמיכה ב:

- עדכון בזמן אמת בין משתמשים (Firebase Firestore)
- עבודה אופליין עם מאגר DATA מקומי (localStorage + cache של PWA)
- ממשק מותאם גם למחשב וגם לטלפון

## הפעלה מהירה

1. התקנת תלויות:

```bash
npm install
```

2. הרצה בסביבת פיתוח:

```bash
npm run dev
```

3. בניית Production:

```bash
npm run build
```

## חייב Firebase?

לא. Firebase הוא רק פתרון אחד.

- בלי Firebase ובלי backend אחר: האפליקציה עובדת מקומית בלבד בכל מכשיר בנפרד.
- עם Firebase או backend אחר: יש סנכרון LIVE בין כל המשתמשים.

ב-GitHub Pages האתר הוא סטטי, לכן סנכרון בין משתמשים מחייב שירות חיצוני (כמו Firebase, Supabase, Appwrite או שרת API משלך).

## סנכרון עם Firebase (אופציונלי)

כדי לקבל סנכרון LIVE בין כל המשתמשים ב-PWA:

1. צור פרויקט Firebase.
2. הפעל Firestore.
3. העתק את `.env.example` ל-`.env`.
4. מלא את כל ערכי `VITE_FIREBASE_*`.

אם לא מוגדרים משתני Firebase, האפליקציה עובדת במצב מקומי בלבד.

## פריסה ל-GitHub Pages (הריפו workstat)

נוספו סקריפטים וקובץ workflow לפריסה אוטומטית:

- סקריפט build ל-GitHub Pages: npm run build:gh
- פריסה ידנית לענף gh-pages: npm run deploy
- פריסה אוטומטית מ-main דרך GitHub Actions:
	- .github/workflows/deploy-pages.yml

### מה להגדיר ב-GitHub

1. בריפו, תחת Settings > Pages:
	 - Build and deployment: Source = GitHub Actions
2. דחיפה ל-main תריץ אוטומטית פריסה.

אם שם הריפו ישתנה בעתיד, עדכן את הנתיב בסקריפט build:gh בתוך package.json.

## PWA

- קובץ מניפסט: `public/manifest.webmanifest`
- Service Worker: `public/sw.js`

ניתן להתקין את האפליקציה מהדפדפן ולפתוח אותה כאפליקציה עצמאית בטלפון או במחשב.
