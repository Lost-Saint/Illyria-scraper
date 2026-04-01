import { mapGoogleCode, type LangCode } from "./utils/language.js";
import request, { Endpoint } from "./utils/request.js";

/**
 * Retrieves an audio buffer of the given text in the given language
 * @param lang - The code of the language to be used as the TTS voice
 * @param text - The text to be converted into speech
 * @param isSlow - Whether the audio should be slowed down or not (default: false)
 * @returns An array of numbers representing the Uint8Array of the audio buffer, or null if failed
 */
export const getAudio = async (
  lang: LangCode<"target">,
  text: string,
  isSlow: boolean = false,
): Promise<number[] | null> => {
  const parsedLang = mapGoogleCode(lang);

  // slice text if too long for Google TTS
  const lastSpace = text.lastIndexOf(" ", 200);
  const slicedText = text.slice(
    0,
    text.length > 200 && lastSpace !== -1 ? lastSpace : 200,
  );

  const textLength = slicedText.length;
  const speed = isSlow ? 0.1 : 1;

  return request(Endpoint.AUDIO)
    .with({ lang: parsedLang, text: slicedText, textLength, speed })
    .doing((data) => {
      // data is guaranteed to be ArrayBuffer
      return Array.from(new Uint8Array(data));
    });
};
