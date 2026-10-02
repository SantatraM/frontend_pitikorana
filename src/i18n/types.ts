import fr from './fr'

export type Language = 'fr' | 'mg'

type TranslationShape<Value> = Value extends string
  ? string
  : Value extends Record<string, unknown>
    ? { [Key in keyof Value]: TranslationShape<Value[Key]> }
    : never

export type TranslationDictionary = TranslationShape<typeof fr>

type NestedTranslationKey<Value> = {
  [Key in keyof Value & string]: Value[Key] extends string
    ? Key
    : Value[Key] extends Record<string, unknown>
      ? `${Key}.${NestedTranslationKey<Value[Key]>}`
      : never
}[keyof Value & string]

export type TranslationKey = NestedTranslationKey<TranslationDictionary>
export type Translator = (key: TranslationKey) => string