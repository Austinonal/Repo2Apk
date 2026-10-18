// UI language for the plan texts. Each text is written once as L(thai, english) at the place it is used.
// Texts that live in module-level objects are getters, so they follow setLang() instead of freezing at import time.
let lang = 'th';
export const setLang = l => { lang = l === 'en' ? 'en' : 'th'; };
export const getLang = () => lang;
export const L = (th, en) => (lang === 'en' ? en : th);
