import type { Data } from "./types.js";
import { mapLingvaCode } from "./language.js";
import type { TranslationInfo } from "./interfaces.js";

/**
 * Type guard to check if value is a non-empty array
 */
const isNonEmptyArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value) && value.length > 0;
};

/**
 * Type guard to check if value is a valid string
 */
const isValidString = (value: unknown): value is string => {
  return typeof value === "string" && value.length > 0;
};

/**
 * Extracts detected language information from translation data
 *
 * @param data - Array containing source, target, detected language, and extra info
 * @returns The detected source language code or undefined if not available
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
 * Extracts typing correction/suggestion from translation data
 *
 * @param source - The source language data array
 * @returns Typing suggestion or undefined if none available
 */
export const typo = ([source]: Data): TranslationInfo["typo"] =>
  source?.[1]?.[0]?.[4] ?? undefined;

/**
 * Functions to extract pronunciation information for both query and translation
 */
export const pronunciation = {
  /**
   * Extracts pronunciation for the original query
   *
   * @param source - The source language data array
   * @returns The query pronunciation or undefined
   */
  query: ([source]: Data): TranslationInfo["pronunciation"]["query"] =>
    source?.[0] ?? undefined,
  /**
   * Extracts pronunciation for the translated text
   *
   * @param target - The target language data array
   * @returns The translation pronunciation or undefined
   */
  translation: ([
    ,
    target,
  ]: Data): TranslationInfo["pronunciation"]["translation"] =>
    target?.[0]?.[0]?.[1] ?? undefined,
};

/**
 * Collection of functions to extract detailed translation components
 * from complex nested data structures
 */
export const list = {
  /**
   * Extracts word definitions with examples, fields, and synonyms
   *
   * @param extra - The extra data object (fourth item in Data array)
   * @returns Array of definition objects grouped by type
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
   * Extracts usage examples for the translated text
   *
   * @param extra - The extra data object (fourth item in Data array)
   * @returns Array of example strings
   */
  examples: ({ 3: extra }: Data): TranslationInfo["examples"] =>
    extra?.[2]?.[0]?.map(([, item]) => item) ?? [],
  /**
   * Extracts words/phrases similar to the query
   *
   * @param extra - The extra data object (fourth item in Data array)
   * @returns Array of similar words/phrases
   */
  similar: ({ 3: extra }: Data): TranslationInfo["similar"] =>
    extra?.[3]?.[0] ?? [],
  /**
   * Extracts additional translations grouped by type with meanings and frequency
   *
   * @param extra - The extra data object (fourth item in Data array)
   * @returns Array of translation objects grouped by type
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

type GenericObject<T> = { [k: string]: T } | Array<T>;

const isObject = (
  value: unknown,
): value is GenericObject<object | string | number> =>
  typeof value === "object";

/**
 * Recursively removes undefined fields from objects and filters out falsy values from arrays
 *
 * @template T - Object or array type with potentially undefined values
 * @template V - The value type contained in the object or array
 * @param obj - Object or array to process
 * @returns New object or array with undefined fields removed
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
