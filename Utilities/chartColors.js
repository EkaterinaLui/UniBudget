// ===============================
// hashString
// ===============================
// מטרה: להפוך טקסט (שם/ID) למספר קבוע.
// אותו טקסט -> תמיד אותו מספר.
export const hashString = (str = "") => {
  let h = 0;

  for (let i = 0; i < str.length; i++) {
    // מערבבים את המספר עם הקוד של האות הנוכחית
    h = h * 31 + str.charCodeAt(i);

    // "חותכים" ל-32 ביט כדי שהמספר לא יגדל בלי גבול
    h |= 0;
  }

  // מחזירים מספר חיובי
  return Math.abs(h);
};

// ===============================
// hslToHex
// ===============================
// מטרה: לקחת צבע בפורמט HSL ולהחזיר צבע HEX (#RRGGBB).
// אנחנו משתמשים ב-HSL כי קל לייצר צבעים שונים רק ע"י שינוי Hue.
export const hslToHex = (h, s, l) => {
  // הופכים אחוזים ל-0..1
  s /= 100;
  l /= 100;

  // עוזרים לחשב את ערכי ה-RGB מתוך HSL
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  // 0..1 -> 0..255 -> HEX
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");

  // מחזירים #RRGGBB
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

// ===============================
// colorFromId
// ===============================
// מטרה: לתת לכל ID צבע קבוע (לא משתנה בכל טעינה).
export const colorFromId = (id) => {
  const seed = hashString(String(id)); // מספר קבוע לפי ה-ID
  const hue = seed % 360;              // גוון בין 0..359
  return hslToHex(hue, 72, 50);        // צבע "יפה וברור"
};

// ===============================
// assignUniqueColors
// ===============================
// מטרה: בתוך אותו גרף לא יהיו שני פריטים עם אותו צבע.
// אם יצא צבע שכבר השתמשנו בו – מזיזים קצת את הגוון עד שמוצאים חדש.
export const assignUniqueColors = (items, getKey, getPreferredColor) => {
  const used = new Set(); // צבעים שכבר נלקחו

  return items.map((it, idx) => {
    const key = getKey(it);

    // אם יש צבע שמור (למשל מה-DB) נשתמש בו, אחרת נוציא צבע לפי ID
    let color = getPreferredColor?.(it) || colorFromId(key);

    // אם הצבע תפוס – ננסה צבע אחר כמה פעמים עד שמוצאים פנוי
    let guard = 0;
    while (used.has(color) && guard < 40) {
      const seed = hashString(`${key}:${guard}`); // seed אחר לניסיון הבא
      const hue = (seed + 29 * (idx + guard + 1)) % 360;
      color = hslToHex(hue, 72, 50);
      guard++;
    }

    used.add(color);
    return { ...it, color };
  });
};
