import { useEffect, useState } from "react";
import { LuArrowLeft, LuExternalLink } from "react-icons/lu";
import Logo from "./Logo";
import LegalScrollProgressBar from "./LegalScrollProgressBar";
import PolicyLanguageSwitcher from "./PolicyLanguageSwitcher";
import {
  DEFAULT_POLICY_LANGUAGE,
  getStoredPolicyLanguage,
  loadPolicyLanguagePack,
  POLICY_LANGUAGE_EVENT,
} from "../i18n/policies";

export default function TermsOfUse() {
  const [pack, setPack] = useState(null);

  useEffect(() => {
    let active = true;

    const syncLanguage = async (languageCode) => {
      const data = await loadPolicyLanguagePack(languageCode || DEFAULT_POLICY_LANGUAGE);
      if (!active) return;
      setPack(data);
    };

    syncLanguage(getStoredPolicyLanguage());

    const handleLanguageChange = (event) => {
      syncLanguage(event.detail || getStoredPolicyLanguage());
    };

    window.addEventListener(POLICY_LANGUAGE_EVENT, handleLanguageChange);
    return () => {
      active = false;
      window.removeEventListener(POLICY_LANGUAGE_EVENT, handleLanguageChange);
    };
  }, []);

  const terms = pack?.terms;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <LegalScrollProgressBar containerId="terms-policy-content" />
      <div id="terms-policy-content" className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <LuArrowLeft className="w-4 h-4" />
            Back to Landing
          </a>
          <a
            href="/chatroom"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
          >
            Open Chatroom <LuExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Logo className="w-7 h-7 text-white" />
          <span className="font-mono tracking-widest text-zinc-300 text-sm">GHOST TUNNEL</span>
        </div>

        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">{terms?.title || "Terms of Use"}</h1>
            <p className="text-zinc-500 text-sm">Last updated: {terms?.lastUpdated || "April 2, 2026"}</p>
          </div>

          <PolicyLanguageSwitcher className="w-full md:w-[320px] md:shrink-0" widgetId="terms-google-translate" />
        </div>

        <div className="space-y-8 text-zinc-300 leading-relaxed">
          {(terms?.sections || []).map((section, index) => (
            <section key={`${section.heading}-${index}`}>
              <h2 className="text-lg font-bold text-white mb-2">{section.heading}</h2>
              <p>{section.paragraph}</p>
              {Array.isArray(section.bullets) && section.bullets.length > 0 && (
                <ul className="mt-3 list-disc pl-6 space-y-1 text-zinc-400">
                  {section.bullets.map((item, bulletIndex) => (
                    <li key={`${section.heading}-bullet-${bulletIndex}`}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
