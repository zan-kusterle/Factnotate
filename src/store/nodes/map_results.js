import _ from 'lodash'
import { superscriptDigits, quantityPrefixes } from '../../constants'
import { parseUnit } from '.'

function formatNumber (number, withoutPrefix = false) {
    const TEN = 10
    const numTargetDigits = 3

    const ensureTargetDigits = x => {
        const numDigits = Math.max(0, Math.ceil(Math.log10(x)))
        return x.toFixed(Math.max(0, numTargetDigits - numDigits)).replace(/^0+|\.?0+$/g, '')
    }

    if (number < 0) {
        return `-${formatNumber(-number, withoutPrefix)}`
    }

    const numDigits = Math.max(0, Math.ceil(Math.log10(number)))

    if (numDigits <= numTargetDigits) {
        return ensureTargetDigits(number)
    } else {
        if (!withoutPrefix) {
            const definedPrefix = _.maxBy(quantityPrefixes.filter(x => x.value > 1 && x.value <= number), x => x.value - number)
            if (definedPrefix) {
                const wholeNumber = Math.round(number / definedPrefix.value * 10) / 10
                return `${wholeNumber}${definedPrefix.label}`
            }
        } else {
            return Math.round(number).toString()
        }

        const exponent = numDigits
        const power = Math.pow(TEN, exponent)
        const whole = number / power

        const adjustedExponent = exponent + numTargetDigits
        const superscriptExponent = adjustedExponent.toString().split('').map(c => superscriptDigits[parseInt(c)]).join('')
        const wholePart = Math.round(whole * Math.pow(TEN, numTargetDigits))
        if (wholePart === 1) {
            return `${TEN}${superscriptExponent}`
        } else if (wholePart === -1) return `-${TEN}${superscriptExponent}`
        return `${wholePart.toFixed(0)}×${TEN}${superscriptExponent}`
    }
}

export function getText (mean, unit = null) {
    if (unit && unit.isSpectrum) {
        return `${Math.round(mean * 100)}%${unit.positive && unit.short !== 'score' ? ` ${unit.positive.toLowerCase()}` : ''}`
    } else if (unit) {
        const text = formatNumber(mean)
        return unit ? `${text}${unit.short}` : text
    } else {
        return formatNumber(mean)
    }
}

export function getResultsColor (mean) {
    if (!mean && mean !== 0)
        return null

    const offset = 0.25
    if (mean < offset)
        return "rgb(255, 164, 164)"
    else if (mean > 1 - offset)
        return "rgb(140, 232, 140)"
    else
        return "rgb(249, 226, 110)"
}

function median (values) {
    values.slice().sort(function (a, b) {
        return a - b
    })

    if (values.length === 0) return 0

    var half = Math.floor(values.length / 2)

    if (values.length % 2)
        return values[half]
    else
        return (values[half - 1] + values[half]) / 2.0
}

function fromChoiceNodes (choiceNodes) {
    const choicesByAuthor = _.groupBy(choiceNodes, x => x.author)
    const latestChoices = Object.values(choicesByAuthor).map(authorChoiceNodes => {
        return _.maxBy(authorChoiceNodes, x => x.createdAtUnix)
    })
    const choiceVoteNodes = _.sortBy(latestChoices.filter(x => x.choiceValue || x.choiceValue === 0), x => -x.totalScore)

    let totalRshares = 0, absoluteRshares = 0
    choiceVoteNodes.forEach(node => {
        if (node.rshares > 0) {
            totalRshares += node.choiceValue * node.rshares
            absoluteRshares += node.rshares
        }
    })
    if (absoluteRshares === 0) {
        totalRshares = choiceVoteNodes.reduce((r, x) => r + x.choiceValue, 0)
        absoluteRshares = choiceVoteNodes.length
    }
    const meanValue =  absoluteRshares > 0 ? totalRshares / absoluteRshares : null

    const medianValue = median(latestChoices.map(x => x.choiceValue))

    const color = getResultsColor(meanValue)

    const numSteps = 20
    const step = 1 / numSteps
    const percentiles = []
    for (let i = 0; i < numSteps; i++) {
        const percentileVoteNodes = choiceVoteNodes.filter(x => x.choiceValue >= i * step && x.choiceValue <= (i + 1) * step)
        percentiles.push({
            index: i,
            voteNodes: percentileVoteNodes,
            totalRshares: percentileVoteNodes.reduce((r, x) => r + x.totalRshares, 0),
            absoluteRshares: percentileVoteNodes.reduce((r, x) => r + x.absoluteRshares, 0),
        })
    }

    return { choiceVoteNodes, meanValue, medianValue, percentiles, color, totalRshares, absoluteRshares }
}

function mapResults (choiceChildren, unit) {
    const data = fromChoiceNodes(choiceChildren)

    const color = unit && unit.isSpectrum ? data.color : null

    return { ...data, unit, mean: data.meanValue, color }
}

function sumVoteRshares (simpleNodes) {
    return simpleNodes.reduce((r, x) => {
        return {
            totalRshares: r.totalRshares + x.totalRshares,
            absoluteRshares: r.absoluteRshares + x.absoluteRshares,
        }
    }, { totalRshares: 0, absoluteRshares: 0 })
}

export function getUnit (text, bounds = null) {
    if (!text || text.trim().length === 0) {
        return null
    }

    const unit = parseUnit(text)
    if (!unit.isSpectrum) {
        let quantityPrefix = quantityPrefixes[0]
        if (bounds) {
            quantityPrefix = _.minBy(quantityPrefixes, x => Math.abs(x.value - bounds.max))
        }
        unit.prefix = quantityPrefix
    }

    return unit
}

export function getUnitChoiceText (choiceValue, unit, isPlain = false) {
    const text = formatNumber(choiceValue)
    return unit.isSpectrum ? `${Math.round(choiceValue * 100)}%${isPlain ? '' : ` ${unit.short }`}` : `${text}${isPlain ? unit.short : ` ${unit.long}`}`
}

export default function (nodes, unit) {
    if (unit) {
        const choiceChildren = nodes.filter(x => x.choiceValue === null || typeof x.choiceValue === 'number')
        return mapResults(choiceChildren, unit)
    }
    return sumVoteRshares(nodes)
}
