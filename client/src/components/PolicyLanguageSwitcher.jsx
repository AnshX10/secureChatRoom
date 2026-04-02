import { useState } from "react";
import { LuLanguages } from "react-icons/lu";
import {
  getStoredPolicyLanguage,
  POLICY_LANGUAGES,
  setStoredPolicyLanguage,
} from "../i18n/policies";

export default function PolicyLanguageSwitcher({ className = "" }) {
  const [lang, setLang] = useState(getStoredPolicyLanguage());

  const applyLanguage = (value) => {
    setLang(value);
    setStoredPolicyLanguage(value);
  };

  return (
    <div className={`rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3 sm:p-2 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-zinc-300 text-sm font-semibold">
          <LuLanguages className="w-4 h-4" />
          Change language
        </div>
        <select
          value={lang}
          onChange={(e) => applyLanguage(e.target.value)}
          className="bg-zinc-950 border border-zinc-700/50 text-zinc-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500"
        >
          {POLICY_LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
