import { TranslateClient, TranslateClientConfig, TranslateTextCommand } from "@aws-sdk/client-translate";
import { sha256 } from "js-sha256";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { languageCodes } from "../types/languages";

export type ITranslatorState = {
  translations: any;
  currentLanguage: languageCodes;
};

export interface ITranslator extends ITranslatorState {
  setLanguage: (currentLanguage: languageCodes) => void;
  translate: (value: string) => string;
}

export const TranslatorContext = createContext({} as ITranslator);

export type TranslatorConfig = {
  awsClientConfig: TranslateClientConfig;
  defaultLanguage?: languageCodes;
  learningMode?: boolean;
};

function prepareTextForTranslation(value: string) {
  if (!value) return value;
  // Replace <sup>X</sup> (where X is a single non-whitespace character)
  // with <sup translate="no">X</sup>, but leave existing attributes alone.
  return value.replaceAll(/<sup>\s*([^<>\s])\s*<\/sup>/g, '<sup translate="no">$1</sup>');
}

export function useTranslator(config: TranslatorConfig): ITranslator {
  const [langsLoaded, setLangsLoaded] = useState(false);
  const { awsClientConfig, defaultLanguage, learningMode } = config;
  const client = useRef(new TranslateClient(awsClientConfig));
  const translationsRef = useRef<any>({});
  const [translations, setTranslations] = useState<any>({});
  const [currentLanguage, setCurrentLanguage] = useState<languageCodes>(defaultLanguage ?? "en");
  const [storedLangs, setStoredLangs] = useState<any>({});

  const loadTranslations = useCallback((languageCode: languageCodes, storedLangs: any) => {
    if (storedLangs[languageCode]) {
      setTranslations({ ...storedLangs[languageCode] });
      translationsRef.current = {};
      Object.keys(storedLangs[languageCode]).forEach((key) => {
        translationsRef.current[key] = true;
      });
    } else {
      translationsRef.current = {};
      setTranslations({});
    }
  }, []);

  useEffect(() => {
    fetch("/langs.json")
      .then((res) => {
        if (res.status) {
          res.json().then((data) => {
            setStoredLangs(data);
            loadTranslations(currentLanguage, data);
            setLangsLoaded(true);
          });
        } else {
          setLangsLoaded(true);
        }
      })
      .catch(() => setLangsLoaded(true));
  }, []);

  const translator = useMemo(() => {
    async function translateText(text: string, sourceLang: string, targetLang: string) {
      if (!langsLoaded) return;
      if (!text?.length) return;
      if (!client.current) return;
      if (!translationsRef.current) return;

      const hash = sha256(text);

      if (translationsRef.current[hash]) return;

      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceLang,
        TargetLanguageCode: targetLang,
      });

      try {
        translationsRef.current[hash] = true;
        const data = await client.current.send(command);
        if (data.TranslatedText) {
          const translatedText = data.TranslatedText;

          setTranslations((prev: any) => ({ ...prev, [hash]: translatedText }));

          if (learningMode) {
            const languages: any = JSON.parse(localStorage.getItem("langs") ?? "{}");
            languages[targetLang] = { ...languages[targetLang], [hash]: translatedText };
            localStorage.setItem("langs", JSON.stringify(languages));
          }
        }

        return data.TranslatedText;
      } catch (error) {
        console.error("Error translating text:", error);
      }
    }

    const translate = (value: string) => {
      if (currentLanguage === "en") return value;

      const text = prepareTextForTranslation(value);
      translateText(text, "en", currentLanguage);

      const hash = sha256(text);
      return translations[hash];
    };

    const setLanguage = (lanuage: languageCodes) => {
      loadTranslations(lanuage, storedLangs);
      setCurrentLanguage(lanuage);
    };

    return { translate, currentLanguage, setLanguage, translations };
  }, [translations, currentLanguage]);

  return translator;
}
