import type { Data } from "./types.js";
import { mapLingvaCode } from "./language.js";
import type { TranslationInfo } from "./interfaces.js";

/**
 * Extracts the detected source language from translation data
 *
 * Attempts to find the language code from multiple possible locations in the data structure,
 * then maps it to the internal language code format.
 *
 * @param data - Raw translation data from Google Translate API
 * @returns The detected source language code or undefined if not found
 */
export const detected = ([
  source,
  target,
  detected,
  extra,
]: Data): TranslationInfo["detectedSource"] => {
  const code =
    source?.[2] ??
    target?.[3] ??
    detected ??
    extra?.[8] ??
    extra?.[5]?.[0]?.[0]?.[3];
  return code ? mapLingvaCode<"source">(code) : undefined;
};

/**
 * Extracts typo correction information from translation data
 *
 * @param data - Raw translation data from Google Translate API
 * @returns The typo correction text or undefined if no typo correction exists
 */
export const typo = ([source]: Data): TranslationInfo["typo"] =>
  source?.[1]?.[0]?.[4] ?? undefined;

/**
 * Functions for extracting pronunciation information from translation data
 */
export const pronunciation = {
  /**
   * Extracts the pronunciation for the query text
   *
   * @param data - Raw translation data from Google Translate API
   * @returns The query pronunciation or undefined if not available
   */
  query: ([source]: Data): TranslationInfo["pronunciation"]["query"] =>
    source?.[0] ?? undefined,

  /**
   * Extracts the pronunciation for the translated text
   *
   * @param data - Raw translation data from Google Translate API
   * @returns The translation pronunciation or undefined if not available
   */
  translation: ([
    ,
    target,
  ]: Data): TranslationInfo["pronunciation"]["translation"] =>
    target?.[0]?.[0]?.[1] ?? undefined,
};

/**
 * Collection of functions for extracting different types of lists from translation data
 */
export const list = {
  /**
   * Extracts word definitions grouped by type (e.g., noun, verb)
   *
   * @param data - Raw translation data from Google Translate API
   * @returns Array of definition groups with their types and definition lists
   */
  definitions: ({ 3: extra }: Data): TranslationInfo["definitions"] =>
    extra?.[1]?.[0]?.map(([type, defList]) => ({
      type,
      list:
        defList?.map(
          ({ 0: definition, 1: example, 4: fieldWrapper, 5: synList }) => ({
            definition,
            example,
            field: fieldWrapper?.[0]?.[0],
            synonyms:
              synList
                ?.flatMap((synItem) => synItem?.[0]?.map(([item]) => item))
                ?.filter((item): item is string => !!item) ?? [],
          }),
        ) ?? [],
    })) ?? [],

  /**
   * Extracts example sentences using the translated term
   *
   * @param data - Raw translation data from Google Translate API
   * @returns Array of example sentences
   */
  examples: ({ 3: extra }: Data): TranslationInfo["examples"] =>
    extra?.[2]?.[0]?.map(([, item]) => item) ?? [],

  /**
   * Extracts words with similar meaning to the query
   *
   * @param data - Raw translation data from Google Translate API
   * @returns Array of similar words
   */
  similar: ({ 3: extra }: Data): TranslationInfo["similar"] =>
    extra?.[3]?.[0] ?? [],

  /**
   * Extracts additional translations grouped by type (e.g., noun, verb)
   *
   * Includes word frequency information where 1 is most frequent and 4 is least frequent.
   *
   * @param data - Raw translation data from Google Translate API
   * @returns Array of translation groups with their types and word lists
   */
  translations: ({ 3: extra }: Data): TranslationInfo["extraTranslations"] =>
    extra?.[5]?.[0]?.map(([type, transList]) => ({
      type,
      list:
        transList?.map(([word, article, meanings, frequency]) => ({
          word,
          article: article ?? undefined,
          meanings,
          frequency: 4 - frequency, // turn it around
        })) ?? [],
    })) ?? [],
};

/**
 * Type for objects that can be filtered for undefined values
 */
type GenericObject<T> = { [k: string]: T } | Array<T>;

/**
 * Checks if a value is an object (including arrays)
 *
 * @param value - Value to check
 * @returns Type guard asserting the value is an object or array
 */
const isObject = (
  value: unknown,
): value is GenericObject<object | string | number> =>
  typeof value === "object";

/**
 * Recursively filters out undefined values from an object or array
 *
 * This function helps create cleaner output data by removing all undefined
 * fields that would otherwise clutter the result.
 *
 * @param obj - Object or array to process
 * @returns A new object or array with all undefined values removed
 */
export const undefinedFields = <T extends GenericObject<V | undefined>, V>(
  obj: T,
): T => {
  if (Array.isArray(obj)) {
    return obj
      .filter((item): item is V => !!item)
      .map((item) => (isObject(item) ? undefinedFields(item) : item)) as T;
  }

  const entries = Object.entries(obj)
    .filter((entry): entry is [string, V] => !!entry[1])
    .map(([key, value]) => [
      key,
      isObject(value) ? undefinedFields(value) : value,
    ]);
  return Object.fromEntries(entries);
};
