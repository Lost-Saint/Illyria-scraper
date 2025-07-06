import * as cheerio from 'cheerio'
import { mapGoogleCode, type LangCode } from './utils/language.js'
import request, { Endpoint } from './utils/request.js'

/**
 * Translates text from source language to target language using Google Translate
 *
 * @param source - Source language code
 * @param target - Target language code
 * @param query - Text to translate
 * @returns Promise resolving to translated text or null if translation failed or text is too long
 */
export const getTranslationText = async (
	source: LangCode<'source'>,
	target: LangCode<'target'>,
	query: string
): Promise<string | null> => {
	const parsedSource = mapGoogleCode(source)
	const parsedTarget = mapGoogleCode(target)

	const encodedQuery = encodeURIComponent(query)

	if (encodedQuery.length > 7500) {
		return null
	}

	return request(Endpoint.TEXT)
		.with({ source: parsedSource, target: parsedTarget, query: encodedQuery })
		.doing(({ data }) => {
			if (!data) {
				return
			}

			const $ = cheerio.load(data)
			const translation = $('.result-container').text()?.trim()
			return translation && !translation.includes('#af-error-page')
				? translation
				: null
		})
}
