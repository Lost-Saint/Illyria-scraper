import * as languagesData from "./languages.json" with { type: "json" };

const { languages, exceptions, mappings } = languagesData.default;

export const LanguageType = {
  SOURCE: "source",
  TARGET: "target",
} as const;

type LangType = (typeof LanguageType)[keyof typeof LanguageType];

/**
 * Represents a valid language code in the system
 *
 * This type uses conditional types to filter out exception codes
 * based on the language context (source or target)
 *
 * @template T - Optional language type (source/target)
 *
 * @example
 * ```typescript
 * // All language codes including "auto"
 * const anyCode: LangCode = "en";
 *
 * // Source language codes (excludes zh_HANT which maps to zh)
 * const sourceCode: LangCode<"source"> = "en";
 *
 * // Target language codes (excludes "auto" which maps to "en")
 * const targetCode: LangCode<"target"> = "fr";
 * ```
 */
export type LangCode<T extends LangType | void = void> = T extends LangType
  ? Exclude<keyof typeof languages, keyof (typeof exceptions)[T]>
  : keyof typeof languages;

/**
 * Represents Google Translate-specific language codes
 *
 * Handles the mapping between internal codes and Google API expectations
 *
 * @template T - Language code or type
 *
 * @example
 * ```typescript
 * // Maps "zh" to "zh-CN" for Google API
 * const googleCode: LangCodeGoogle = mapGoogleCode("zh");
 * ```
 */
export type LangCodeGoogle<T extends LangCode | LangType = LangCode> =
  T extends LangType
    ?
        | Exclude<LangCode<T>, keyof (typeof mappings)["request"]>
        | keyof (typeof mappings)["response"]
    :
        | Exclude<T, keyof (typeof mappings)["request"]>
        | keyof (typeof mappings)["response"];

const isKeyOf =
  <T extends object>(obj: T) =>
  (key: keyof any): key is keyof T =>
    key in obj;

/**
 * Verifies if a string is a valid language code in our system
 *
 * @param code - Code to validate (e.g. "en", "zh", "auto")
 * @param langType - Optional language type to check against specific exceptions
 * @returns Type guard confirming code is valid
 *
 * @example
 * ```typescript
 * // Check if valid for any context
 * if (isValidCode("xyz")) {
 *   // Not valid, won't enter this block
 * }
 *
 * // Check if valid as a source language
 * if (isValidCode("auto", LanguageType.SOURCE)) {
 *   // Valid as source, will enter this block
 * }
 * ```
 */
export const isValidCode = <T extends LangType>(
  code: string | null | undefined,
  langType?: T,
): code is LangCode<T> =>
  !!code && isKeyOf(languageList[langType ?? "all"])(code);

/**
 * Replaces language codes with their exceptions based on language type
 *
 * Handles special cases like:
 * - Converting Traditional Chinese (zh_HANT) to standard Chinese (zh) for source languages
 * - Converting "auto" to "en" for target languages
 *
 * @param langType - Source or target language type
 * @param langCode - Original language code
 * @returns Potentially replaced language code appropriate for the context
 *
 * @example
 * ```typescript
 * // Traditional Chinese gets replaced with standard Chinese for source
 * replaceExceptedCode(LanguageType.SOURCE, "zh_HANT") // returns "zh"
 *
 * // "auto" gets replaced with "en" for target
 * replaceExceptedCode(LanguageType.TARGET, "auto") // returns "en"
 * ```
 *
 * @see {@link exceptions} for the full mapping of exceptions
 */
export const replaceExceptedCode = <T extends LangType>(
  langType: T,
  langCode: LangCode,
) => {
  const langExceptions = exceptions[langType];
  const finalCode = isKeyOf(langExceptions)(langCode)
    ? langExceptions[langCode]
    : langCode;
  return finalCode as LangCode<T>;
};

/**
 * Maps internal language codes to Google Translate API codes
 *
 * Google Translate API uses slightly different codes for some languages.
 * This function converts our internal codes to match Google's expectations.
 *
 * @param langCode - Internal language code
 * @returns Google-compatible language code
 *
 * @example
 * ```typescript
 * mapGoogleCode("zh") // returns "zh-CN"
 * mapGoogleCode("zh_HANT") // returns "zh-TW"
 * mapGoogleCode("en") // returns "en" (unchanged)
 * ```
 *
 * @see {@link mappings.request} for the full mapping table
 */
export const mapGoogleCode = <T extends LangCode>(langCode: T) => {
  const reqMappings = mappings["request"];
  const finalCode = isKeyOf(reqMappings)(langCode)
    ? reqMappings[langCode]
    : langCode;
  return finalCode as LangCodeGoogle<T>;
};

/**
 * Maps Google Translate API response codes back to internal language codes
 *
 * The reverse operation of {@link mapGoogleCode} - converts Google's specific
 * codes back to our internal representation for consistent handling.
 *
 * @param langCode - Google API language code
 * @returns Internal language code
 *
 * @example
 * ```typescript
 * mapLingvaCode("zh-CN") // returns "zh"
 * mapLingvaCode("zh-TW") // returns "zh"
 * mapLingvaCode("en") // returns "en" (unchanged)
 * ```
 *
 * @see {@link mappings.response} for the full mapping table
 */
export const mapLingvaCode = <T extends LangType>(
  langCode: LangCodeGoogle<T>,
) => {
  const resMappings = mappings["response"];
  const finalCode = isKeyOf(resMappings)(langCode)
    ? resMappings[langCode]
    : langCode;
  return finalCode as LangCode<T>;
};

const filteredLanguages = (type: LangType) => {
  const entries = Object.entries(languages) as [LangCode, string][];

  const filteredEntries = entries.filter(
    ([code]) => !Object.keys(exceptions[type]).includes(code),
  );

  return Object.fromEntries(filteredEntries) as typeof languages;
};

export const languageList = {
  all: languages,
  source: filteredLanguages(LanguageType.SOURCE),
  target: filteredLanguages(LanguageType.TARGET),
};
