import CryptoJS from "crypto-js";

export const POLICY_LANGUAGE_STORAGE_KEY = "policy-language";
export const POLICY_LANGUAGE_EVENT = "policy-language-changed";
const POLICY_LANGUAGE_STORAGE_VERSION = 1;
const POLICY_LANGUAGE_STORAGE_SECRET = `${window.location.origin}::securechatroom::policy-language::v1`;

export const POLICY_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ar", label: "العربية" },
  { code: "zh-CN", label: "中文 (简体)" }
];

export const DEFAULT_POLICY_LANGUAGE = "en";

const encodeStoredLanguage = (languageCode) => {
  const payload = JSON.stringify({
    v: POLICY_LANGUAGE_STORAGE_VERSION,
    code: languageCode,
  });
  return CryptoJS.AES.encrypt(payload, POLICY_LANGUAGE_STORAGE_SECRET).toString();
};

const decodeStoredLanguage = (rawValue) => {
  if (!rawValue) return null;

  if (languageLoaders[rawValue]) {
    return rawValue;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(rawValue, POLICY_LANGUAGE_STORAGE_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;

    const parsed = JSON.parse(decrypted);
    if (
      !parsed ||
      parsed.v !== POLICY_LANGUAGE_STORAGE_VERSION ||
      !languageLoaders[parsed.code]
    ) {
      return null;
    }

    return parsed.code;
  } catch {
    return null;
  }
};

const languageLoaders = {
  en: () => import("./en.json"),
  es: () => import("./es.json"),
  fr: () => import("./fr.json"),
  de: () => import("./de.json"),
  pt: () => import("./pt.json"),
  ru: () => import("./ru.json"),
  ja: () => import("./ja.json"),
  ko: () => import("./ko.json"),
  ar: () => import("./ar.json"),
  "zh-CN": () => import("./zh-CN.json")
};

export const getStoredPolicyLanguage = () => {
  const stored = localStorage.getItem(POLICY_LANGUAGE_STORAGE_KEY);

  if (stored && languageLoaders[stored]) {
    localStorage.setItem(POLICY_LANGUAGE_STORAGE_KEY, encodeStoredLanguage(stored));
    return stored;
  }

  const decoded = decodeStoredLanguage(stored);
  return decoded || DEFAULT_POLICY_LANGUAGE;
};

export const setStoredPolicyLanguage = (languageCode) => {
  if (!languageLoaders[languageCode]) return;
  localStorage.setItem(POLICY_LANGUAGE_STORAGE_KEY, encodeStoredLanguage(languageCode));
  window.dispatchEvent(new CustomEvent(POLICY_LANGUAGE_EVENT, { detail: languageCode }));
};

export const loadPolicyLanguagePack = async (languageCode) => {
  const loader = languageLoaders[languageCode] || languageLoaders[DEFAULT_POLICY_LANGUAGE];
  const module = await loader();
  return module.default;
};
