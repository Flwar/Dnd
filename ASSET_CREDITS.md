# קרדיטים ורישוי נכסים

כל נכסי האיור הרסטריים ברשימה זו נוצרו במיוחד עבור **הכתר המנופץ** באמצעות כלי ה־image generation המובנה של OpenAI בתאריך 31 ביולי 2026. הם נשמרים מקומית במאגר; אין קישורים חמים, כתובות זמניות או תלות בנכסי משחקים קיימים. הגופנים ואייקוני הממשק הם נכסי צד שלישי ומפורטים בנפרד בהמשך.

## תנאי שימוש ותיעוד מקור

- יוצר: OpenAI image generation, בהכוונת צוות הפרויקט.
- מקור: יצירה מקורית בתוך סביבת הפיתוח; אין עמוד מקור חיצוני.
- רישיון חיצוני: לא חל — לא שולב חומר צד שלישי או מאגר תמונות חיצוני.
- ייחוס נדרש: אין ייחוס חיצוני נדרש לנכסים אלה.
- מגבלת הפצה: השימוש כפוף לתנאים החלים על פלט OpenAI ולבדיקה משפטית רגילה לפני הפצה מסחרית.
- שינויים כלליים: פיצול אטלסים, חיתוך ממוקד, התאמת צבע עדינה, חידוד, שינוי גודל והמרה ל־WebP.

## חבילות נכסים

| חבילה | נתיבים מקומיים | כמות | תיאור | שינויים |
| --- | --- | ---: | --- | --- |
| רקע תפריט קולנועי | `public/assets/rebuild/backgrounds/menu-cinematic*.webp` | 2 | מזבח אבן וכתר שבור מעל עמק ערפילי; ללא טקסט | גרסאות שולחן עבודה ומובייל, חיתוך קשב, WebP |
| תמונת שיתוף חברתית | `public/og.png`, `public/assets/rebuild/backgrounds/social-preview.webp` | 2 | שבעת שברי הכתר מרחפים מעל מזבח אבן ועמק ערפילי; ללא טקסט | מקור PNG מקומי וגרסת WebP בגודל 1200×630 |
| ערפלון והדרך למכרה | `public/assets/rebuild/backgrounds/{village-gate,arfelon-square,wet-raven-inn,smithy,healer-hut,headman-house,mine-road}*.webp` | 14 | שבע סביבות מובחנות לכפר, שירותיו והדרך | פיצול אטלס, גרסאות רחבות וניידות, WebP |
| המכרה והעימות המסכם | `public/assets/rebuild/backgrounds/{mine-entrance,main-tunnel,abandoned-tool-store,flooded-passage,pillar-hall,hidden-chamber,guardian-sanctum,shard-sanctum}*.webp` | 16 | שמונה סביבות מובחנות מן הכניסה ועד הרסיס | פיצול שני אטלסים, גרסאות רחבות וניידות, WebP |
| דיוקנאות דמויות שחקן | `public/assets/rebuild/portraits/portrait-{human,elf,dwarf,halfling,orc,dragonborn}-*.webp` | 24 | שישה עוגני זהות עקביים, ארבע וריאציות חיתוך וצבע לכל גזע | פיצול אטלס, חיתוכים ודרגות צבע מובחנים, WebP |
| דיוקנאות דמויות עולם | `public/assets/rebuild/portraits/portrait-npc-*.webp` | 6 | אלריק, מירה, תאל, ברום, דנור והאישה באפור | פיצול אטלס, חיתוך אחיד, WebP |
| אייקוני יכולות | `public/assets/rebuild/icons/abilities/*.webp` | 24 | כל 18 יכולות הפתיחה ושש יכולות אויב/בוס | פיצול אטלסים, חיתוך ריבועי, WebP |
| אייקוני פריטים | `public/assets/rebuild/icons/items/*.webp` | 30 | כל מפתחות הפריטים בפרק הפתיחה | פיצול אטלסים, חיתוך ריבועי, WebP |

בסך הכול קיימות 117 רשומות איור במניפסט המקומי, ועוד `public/og.png` כתמונת מקור לשיתוף החברתי.

## גופנים ואייקוני ממשק מצד שלישי

| נכס | נתיב מקומי או חבילה | יוצר ומקור | רישיון | ייחוס ותנאים | שינויים |
| --- | --- | --- | --- | --- | --- |
| Heebo Variable | `public/fonts/heebo-variable.ttf` | Copyright 2014 The Heebo Project Authors; [Google Fonts / Heebo](https://github.com/google/fonts/tree/main/ofl/heebo) | [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/heebo/OFL.txt) | יש לשמר את הודעת זכויות היוצרים ואת רישיון OFL בכל הפצה של קובץ הגופן. אין למכור את קובץ הגופן לבדו. | שינוי שם קובץ לצורך טעינה מקומית; ללא שינוי גליפים. |
| Frank Ruhl Libre Variable | `public/fonts/frank-ruhl-libre-variable.ttf` | Copyright 2015 The Frank Ruhl Libre Project Authors; [Google Fonts / Frank Ruhl Libre](https://github.com/google/fonts/tree/main/ofl/frankruhllibre) | [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/frankruhllibre/OFL.txt) | יש לשמר את הודעת זכויות היוצרים ואת רישיון OFL בכל הפצה של קובץ הגופן. אין למכור את קובץ הגופן לבדו. | שינוי שם קובץ לצורך טעינה מקומית; ללא שינוי גליפים. |
| Lucide React | חבילת `lucide-react` ב־`package-lock.json`; האייקונים מרונדרים מתוך הקוד | Copyright (c) 2026 Lucide Icons and Contributors; רכיבי Feather: Copyright (c) 2013-present Cole Bemis; [lucide.dev](https://lucide.dev/) | ISC; חלק מן האייקונים נגזרים מ־Feather תחת MIT, כמפורט בקובץ `node_modules/lucide-react/LICENSE` של הגרסה המותקנת | יש לשמר את הודעות זכויות היוצרים והרישיון הכלולות בחבילה בכל עותק מופץ. | בחירת אייקונים, גודל, צבע ועובי קו בלבד; ללא העתקת קובצי תמונה חיצוניים. |

אין במאגר קובצי מוזיקה או אפקטים מוקלטים מצד שלישי. מנהל האודיו הנוכחי מייצר רמזים קצרים ואווירה באופן פרוצדורלי בדפדפן; אם יתווספו הקלטות, יש להוסיף לכל קובץ נתיב, יוצר, מקור, רישיון, ייחוס ושינויים לפני שילובו.

## כיוון אמנותי משותף

- פנטזיה ימי־ביניימית אפלה, ריאליסטית־ציורית ובטון רציני.
- אבן עתיקה, מתכת מוכתמת, עץ רטוב, קלף ישן וצללים עמוקים.
- תאורת לפידים חמה מול קסם כחול קר; בורדו עמוק וזהב עתיק כהדגשות.
- ללא טקסט מוטבע, לוגו, סימן מים, חפצים מודרניים או דמויות מזיכיונות קיימים.

המניפסט הקנוני לאיורים נמצא ב־`src/lib/assets/manifest.ts` וממפה כל מפתח לנתיב מקומי יציב. הגופנים נטענים מקומית ב־`src/app/layout.tsx`; אייקוני Lucide מגיעים מהחבילה הנעולה ולא מכתובת רשת בזמן ריצה.
