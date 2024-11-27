# illyria scraper

## Installation

Just install the package using NPM

```shell
npm i --save illyria-scraper
```

Or using Yarn

```shell
yarn add illyria-scraper
```

And import it directly using CommonJS

```javascript
const { getTranslationInfo } = require("illyria-scraper");
```

Or with the ES6 syntax

```javascript
import { getTranslationInfo } from "illyria-scraper";
```

The package doesn't provide a default export, but you can alternatively use the wildcard import syntax

```javascript
import * as IllyriaScraper from "illyria-scraper";
```

## Usage

### Main API

#### Translation text

```typescript
getTranslationText(source: LangCode<"source">, target: LangCode<"target">, query: string): Promise<string | null>
```

Retrieves the translated text given a pair of languages and a query text.

```typescript
import { getTranslationText } from "illyria-scraper";

const translation = await getTranslationText("auto", "es", "win");
```

#### Translation information

```typescript
getTranslationInfo(source: LangCode<"source">, target: LangCode<"target">, query: string): Promise<TranslationInfo | null>
```

Retrieves the full translation information, optionally including the detected source, typos, pronunciation representations, definitions, examples, similar words or extra translations.

```typescript
import { getTranslationInfo } from "illyria-scraper";

const info = await getTranslationInfo("zh", "en", "早安");
```

#### Text to speech

```typescript
getAudio(lang: LangCode<"target">, text: string, isSlow?: boolean): Promise<number[] | null>
```

Retrieves an audio buffer in the form of a `Uint8Array`, and represented as a `number[]` in order to be serializable.

```typescript
import { getAudio } from "illyria-scraper";

const audio = await getAudio("ca", "gerd");
```

### Utilities

There are also some utility constants and functions exported in order to ease the use of the package.

+ `LanguageType`

An enumeration representing the two language types (*source* and *target*) and very used among the rest of utilities.

```typescript
import { LanguageType } from "illyria-scraper";

LanguageType.SOURCE // "source"
LanguageType.TARGET // "target"
```

+ `languageList`

An object that includes the whole list of languages used in this package, as well as two other properties with the language list filtered by type.

```typescript
import { languageList } from "illyria-scraper";

languageList.all // whole list
languageList.source // i.e. languageList[LanguageType.SOURCE]
languageList.target // i.e. languageList[LanguageType.TARGET]
```

+ `isValidCode()`

A function that checks whether a string is a valid language code, optionally differentiating it based on a certain language type.

```typescript
import { isValidCode } from "illyria-scraper";

const isValidLang = isValidCode(str);
const isValidSource = isValidCode(str, LanguageType.SOURCE);
```

+ `replaceExceptedCode()`

A function that checks whether a language code is valid regarding a language type, and changes it with a suitable replacement if not.

```typescript
import { replaceExceptedCode } from "illyria-scraper";

const targetLang = replaceExceptedCode(LanguageType.TARGET, lang);
```

+ `mapGoogleCode()`

A function that maps the given *illyria* language code with a valid *Google* one, in case they're different.

```typescript
import { mapGoogleCode } from "illyria-scraper";

const googleLang = mapGoogleCode(lang);
```

+ `mapillyriaCode()`

A function that maps the given *Google* language code with a valid *illyria* one, in case they're different.

```typescript
import { mapillyriaCode } from "illyria-scraper";

const lang = mapillyriaCode(googleLang);
```
