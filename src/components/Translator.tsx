import React, { ChangeEvent, useContext } from "react";
import { TranslatorContext } from "../context";
import { languageCodes, languages } from "../types";

type TranslatorProps = {
  languageFilter: Array<languageCodes>;
};

export function Translator(props: Readonly<TranslatorProps>) {
  const translator = useContext(TranslatorContext);
  const { translate, currentLanguage, setLanguage } = translator;

  function handleLanguageChange(e: ChangeEvent<HTMLSelectElement>) {
    setLanguage(e.target.value as languageCodes);
  }

  return (
    <div className="translator-container">
      <label className="translator-label">{translate("Select a language")}:</label>
      <select className="translator-value" value={currentLanguage} onChange={handleLanguageChange}>
        {Object.entries(languages)
          .filter((e) => props.languageFilter.length === 0 || props.languageFilter.includes(e[0] as languageCodes))
          .map((c) => (
            <option key={c[0]} value={c[0]}>
              {c[1]}
            </option>
          ))}
      </select>
    </div>
  );
}
