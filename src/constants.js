export const APP_NAME = 'factnotate'
export const APP_VERSION = '0.1.0'

export const DEVELOPER_BENEFICIARY_ACCOUNT = 'factnotate-app'
export const DEVELOPER_BENEFICIARY_SHARE = 0.1

export const STEEM_CONNECT_APP_USERNAME = 'factnotate-app'
export const ENABLE_GUN = true
export const USE_GUN_SERVERS = true
export const FORCE_CLEAN = false
export const TEST_USERNAME = null

export const MAX_PERCENT = 10000
export const DATE_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss'
export const DATE_FORMAT_PRECISE = 'YYYY-MM-DD[T]HH:mm:ss:SSS'

export const MINIMUM_COMMENT_LENGTH = 3
export const MAX_POST_LENGTH = 2000
export const MAX_SELECTION_LENGTH = 500

export const SUPPORTED_FORMATS = ['pdf']

export const superscriptDigits = '⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹'.split(' ')

export const deleteVotesTexts = [
    'I delete votes made before this comment',
    'I delete votes',
    'I delete my votes',
    'Delete my votes',
    'delete my votes for this post',
    'delete all my votes',
]

export const tags = [
    'politics',
    'economics',
    'business',
    'sociology',
    'psychology',
    'physics',
    'entertainment',
]

export const spectrumUnits = [
    'False-True',
    'Unreliable-Reliable',
    'Irrelevant-Relevant',
    'Score',
    // 'Disagree-Agree',
]

export const quantityUnits = [
    'Count',
    'Mass(g)',
    'Year(AD)',
    'Length(m)',
    'Area(m²)',
    'Volume(m³)',
    'Temperature(°C)',
    'Money(USD)',
    'Money(EUR)',
]

export const quantityPrefixes = [
    { label: 'k', value: 1e3 },
    { label: 'M', value: 1e6 },
    { label: 'G', value: 1e9 },
    { label: 'T', value: 1e12 },
    { label: 'P', value: 1e15 },
    { label: 'E', value: 1e18 },

    { label: 'd', value: 1e-1 },
    { label: 'c', value: 1e-2 },
    { label: 'm', value: 1e-3 },
    { label: 'µ', value: 1e-6 },
    { label: 'n', value: 1e-9 },
    { label: 'p', value: 1e-12 },
    { label: 'f', value: 1e-15 },
    { label: 'a', value: 1e-18 },
]

export const externalSources = {
    hn: { name: 'Hacker News', icon: 'hn.png' },
    reddit: { name: 'Reddit', icon: 'reddit.png' },
}
