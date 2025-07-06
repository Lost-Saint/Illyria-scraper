import { describe, it, expect } from 'vitest'
import {
	isValidCode,
	mapGoogleCode,
	mapLingvaCode,
	replaceExceptedCode,
	LanguageType,
	languageList,
	type LangCode
} from '../utils/language.js'

describe('language utilities integration', () => {
	describe('language code validation', () => {
		it('should validate common language codes', () => {
			expect(isValidCode('en')).toBe(true)
			expect(isValidCode('es')).toBe(true)
			expect(isValidCode('zh')).toBe(true)
			expect(isValidCode('invalid_code')).toBe(false)
			expect(isValidCode(null)).toBe(false)
			expect(isValidCode(undefined)).toBe(false)
		})

		it('should validate source-specific language codes', () => {
			expect(isValidCode('auto', LanguageType.SOURCE)).toBe(true)
			expect(isValidCode('en', LanguageType.SOURCE)).toBe(true)

			// zh_HANT should not be a valid source code as it's excepted to zh
			expect('zh_HANT' in languageList.source).toBe(false)
		})

		it('should validate target-specific language codes', () => {
			expect(isValidCode('en', LanguageType.TARGET)).toBe(true)
			expect(isValidCode('zh_HANT', LanguageType.TARGET)).toBe(true)

			// auto should not be a valid target code as it's excepted to en
			expect('auto' in languageList.target).toBe(false)
		})
	})

	describe('exception handling', () => {
		it('should replace excepted source language codes', () => {
			expect(replaceExceptedCode(LanguageType.SOURCE, 'zh_HANT' as LangCode)).toBe('zh')
			expect(replaceExceptedCode(LanguageType.SOURCE, 'en' as LangCode)).toBe('en')
		})

		it('should replace excepted target language codes', () => {
			expect(replaceExceptedCode(LanguageType.TARGET, 'auto' as LangCode)).toBe('en')
			expect(replaceExceptedCode(LanguageType.TARGET, 'es' as LangCode)).toBe('es')
		})
	})

	describe('code mapping', () => {
		it('should map internal codes to Google codes', () => {
			expect(mapGoogleCode('zh' as LangCode)).toBe('zh-CN')
			expect(mapGoogleCode('zh_HANT' as LangCode)).toBe('zh-TW')
			expect(mapGoogleCode('en' as LangCode)).toBe('en')
		})

		it('should map Google codes back to internal codes', () => {
			expect(mapLingvaCode('zh-CN')).toBe('zh')
			expect(mapLingvaCode('zh-TW')).toBe('zh')
			expect(mapLingvaCode('en')).toBe('en')
		})
	})

	describe('language list filtering', () => {
		it('should have different language lists for source and target', () => {
			// Check that auto exists in all and source, but not target
			expect('auto' in languageList.all).toBe(true)
			expect('auto' in languageList.source).toBe(true)
			expect('auto' in languageList.target).toBe(false)

			// Check that zh_HANT exists in all and target, but not source
			expect('zh_HANT' in languageList.all).toBe(true)
			expect('zh_HANT' in languageList.source).toBe(false)
			expect('zh_HANT' in languageList.target).toBe(true)
		})
	})
})
