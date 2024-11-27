import * as cheerio from 'cheerio'
import { mapGoogleCode, type LangCode } from './utils/language.js'
import request, { Endpoint } from './utils/request.js'

/**
 * Retrieves the translation given a pair of languages and a query
 * @param source - The code of the language to translate from
 * @param target - The code of the language to translate to
 * @param query - The text to be translated
 * @returns A single {@link string} with the translated text
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
