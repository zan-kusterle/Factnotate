import { fromString } from '../../comment_ids'
import { spectrumUnits, quantityUnits, superscriptDigits  } from '../../constants'

export function isNodeValid (node) {
    return !!(node && (node.isTag || node.isUser || (node.title || node.text) && node.createdAt && node.author && node.permlink))
}

export function parseUnit (text) {
    if (text.trim().toLowerCase() === 'score') {
        return { long: '0-1', short: 'score', positive: '1', negative: '0', isSpectrum: true }
    } else if (text.trim().toLowerCase() === 'count') {
        return { long: 'count', short: '', isSpectrum: false }
    }
    const spectrumRegex = /(.+)-(.+)/g
    const spectrumMatch = spectrumRegex.exec(text)
    if (spectrumMatch !== null) {
        const [negative, positive] = [spectrumMatch[1].trim(), spectrumMatch[2].trim()]
        return { long: `${negative}-${positive}`, short: positive.toLowerCase(), positive, negative, isSpectrum: true }
    }
    const quantityRegex = /(.+):?\s*\((.+)\)/g
    const quantityMatch = quantityRegex.exec(text)
    if (quantityMatch !== null) {
        const [name, unit] = [quantityMatch[1].trim(), quantityMatch[2].trim()]
        return { long: `${name} (${unit})`, short: unit, name, unit, isSpectrum: false }
    }

    return { long: text.trim(), short: text.trim(), isSpectrum: true }
}

export function parseToken (word) {
    const id = fromString(word)
    if (id && id.author && id.permlink)
        return { name: 'link', value: id }

    const isWebpage = word.startsWith('http://') || word.startsWith('https://')
    if (isWebpage)
        return { name: 'webpage', value: word.trim() }

    return { name: 'text', value: word }
}

export function parseText (text) {
    const seq = []
    const lines = text.split('\n').map(x => x.trim()).filter(x => x.length > 0)

    lines.forEach((line, lineIndex) => {
        if (line.startsWith('>')) {
            seq.push({
                name: 'quote',
                value: line,
            })
        } else {
            let cursor = 0
            while (cursor < line.length) {
                const remainingText = line.substring(cursor)
                const nextSpaceIndex = remainingText.indexOf(' ')
                const nextRemainingIndex = nextSpaceIndex === -1 ? remainingText.length : nextSpaceIndex + 1
                const currentToken = remainingText.substring(0, nextRemainingIndex)

                const { name, value } = parseToken(currentToken)

                if (name === 'text' && seq.length > 0 && seq[seq.length - 1].name === 'text') {
                    seq[seq.length - 1].value += currentToken
                } else {
                    seq.push({ name, value })
                }

                cursor += nextRemainingIndex
            }
        }

        if (lineIndex < lines.length - 1 && seq.length > 0 && seq[seq.length - 1].name !== 'newline') {
            seq.push({ name: 'newline', value: null })
        }
    })

    return seq
}

export function parseLine (line) {
    const lineRegex = /(.+)\((.+)\)/g
    let matches = lineRegex.exec(line)
    while (matches) {
        const [title, unitText] = [matches[1], matches[2]]

        let choiceValue = parseFloat(unitText)
        if (!isNaN(choiceValue)) {
            let unitString = unitText.replace(choiceValue.toString(), '').toLowerCase().trim()
            if (unitString.startsWith('%')) {
                choiceValue /= 100
                unitString = unitString.replace('%', '').trim()
            }
            const getUnit = units => {
                return units.find(unitText => {
                    const unit = parseUnit(unitText)
                    if (unit.isSpectrum) {
                        return unit.positive.toLowerCase() === unitString
                    } else {
                        let shortUnit = unit.short
                        superscriptDigits.forEach((digit, index) => {
                            shortUnit = shortUnit.replace(new RegExp(digit, 'g'), index.toString())
                        })
                        return shortUnit.toLowerCase() === unitString
                    }
                })
            }

            const unit = getUnit(spectrumUnits) || getUnit(quantityUnits)
            if (unit) {
                const tags = title.split(' ').filter(x => x.startsWith('#') && x.trim().length > 3).map(x => x.substring(1).trim())
                const titleWithoutTags = tags.reduce((acc, tag) => acc.replace(`#${tag}`, ''), title).replace(/\s\s+/g, ' ').trim()
                return { title: titleWithoutTags, tags, unit: parseUnit(unit), choiceValue }
            }
        }

        matches = lineRegex.exec(line)
    }

    if (parseToken(line).name === 'webpage') {
        const tags = line.split(' ').filter(x => x.startsWith('#') && x.trim().length > 3).map(x => x.substring(1).trim())
        const titleWithoutTags = tags.reduce((acc, tag) => acc.replace(`#${tag}`, ''), line).replace(/\s\s+/g, ' ').trim()
        return { title: titleWithoutTags, tags }
    }

    return {}
}

export function isPlainWebpage (text) {
    return parseToken(text).name === 'webpage'
}
