import type { LangCode } from "./language.js";

interface DefinitionsGroup {
  type: string;
  list: {
    definition: string;
    example: string;
    field: string | undefined;
    synonyms: string[];
  }[];
}

interface ExtraTranslationsGroup {
  type: string;
  list: {
    word: string;
    article: string | undefined;
    frequency: number;
    meanings: string[];
  }[];
}

/**
 * Complete information about a translation result
 */
export interface TranslationInfo {
  detectedSource: LangCode<"source"> | undefined;
  typo: string | undefined;
  pronunciation: {
    query: string | undefined;
    translation: string | undefined;
  };
  definitions: DefinitionsGroup[];
  examples: string[];
  similar: string[];
  extraTranslations: ExtraTranslationsGroup[];
}
