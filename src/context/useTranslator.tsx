import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import React, { createContext, useRef, useState } from "react";

const client = new TranslateClient({
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID as string,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY as string,
  },
  region: import.meta.env.VITE_AWS_REGION as string,
});

// async function hashString(value: string) {
//   // Encode the string as a Uint8Array
//   const msgBuffer = new TextEncoder().encode(value);

//   // Hash the message using SHA-256
//   const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

//   // Convert the ArrayBuffer to a hexadecimal string
//   const hashArray = Array.from(new Uint8Array(hashBuffer));
//   const hashHex = hashArray.map((b) => ("00" + b.toString(16)).slice(-2)).join("");

//   return hashHex;
// }

export type ITranslatorState = {
  translations: any;
  currentLanguage: string;
};

export interface ITranslator extends ITranslatorState {
  setCurrentLanguage: (currentLanguage: string) => void;
  translate: (value: string) => string;
}

export const TranslatorContext = createContext({} as ITranslator);

export function useTranslator(): ITranslator {
  const translationsRef = useRef<any>({});
  const [translations, setTranslations] = useState<any>({});
  const [currentLanguage, setCurrentLanguage] = useState("fr");

  async function translateText(text: string, sourceLang: string, targetLang: string) {
    if (!text?.length) return;
    if (!translationsRef.current) return;
    if (translationsRef.current[text]) return;

    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLang,
      TargetLanguageCode: targetLang,
    });

    try {
      translationsRef.current[text] = text;
      const data = await client.send(command);
      if (data.TranslatedText) {
        setTranslations((prev: any) => ({ ...prev, [text]: data.TranslatedText }));
      }

      return data.TranslatedText;
    } catch (error) {
      console.error("Error translating text:", error);
    }
  }

  const translate = (value: string) => {
    if (currentLanguage === "en") return value;
    translateText(value, "en", currentLanguage);
    return translations[value];
  };

  return { translate, currentLanguage, setCurrentLanguage, translations };
}

export default function Translator() {
  const translator = useTranslator();

  return <div>{translator.currentLanguage}</div>;
}
