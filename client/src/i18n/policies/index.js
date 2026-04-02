export const POLICY_LANGUAGE_STORAGE_KEY = "policy-language";
export const POLICY_LANGUAGE_EVENT = "policy-language-changed";

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
  if (!stored) return DEFAULT_POLICY_LANGUAGE;
  return languageLoaders[stored] ? stored : DEFAULT_POLICY_LANGUAGE;
};

export const setStoredPolicyLanguage = (languageCode) => {
  if (!languageLoaders[languageCode]) return;
  localStorage.setItem(POLICY_LANGUAGE_STORAGE_KEY, languageCode);
  window.dispatchEvent(new CustomEvent(POLICY_LANGUAGE_EVENT, { detail: languageCode }));
};

export const loadPolicyLanguagePack = async (languageCode) => {
  const loader = languageLoaders[languageCode] || languageLoaders[DEFAULT_POLICY_LANGUAGE];
  const module = await loader();
  return module.default;
};
