import _ from 'lodash'
import moment from 'moment'
// import marked from 'marked'
import { isNodeValid, parseText } from '.'
import { eq, toString } from '../../comment_ids'
import { isPlainWebpage } from './parse'
import mapResults, { getUnitChoiceText, getUnit } from './map_results'
import { MINIMUM_COMMENT_LENGTH, deleteVotesTexts, DATE_FORMAT_PRECISE, DATE_FORMAT } from '../../constants'
export { mapResults, getUnitChoiceText }

function parseChoice (text) {
    const regex = /^([0-9]+(\.[0-9]+)?)(%)?$/ig
    const matches = regex.exec(text)
    if (matches) {
        const [choiceValueString, isPercent] = [matches[1], !!matches[3]]

        let choiceValue = parseFloat(choiceValueString)
        if (!isNaN(choiceValue)) {
            if (isPercent) {
                choiceValue /= 100
            }
            return choiceValue
        }
    }

    if (deleteVotesTexts.some(deleteText => text.toLowerCase().startsWith(deleteText.toLowerCase()))) {
        return false
    }
    return null
}

function mapMetadata (metadata) {
    if (!metadata) {
        return {}
    }
    const max = metadata.maxValue ? Math.abs(metadata.maxValue) : 1000
    const min = metadata.allowNegative ? -max : 0
    const unit = getUnit(metadata.unit, { min, max })
    return { ...metadata, unit }
}

export function mapVotes (votes) {
    let totalRshares = 0, absoluteRshares = 0

    const ADD_SMOOTHING = 1
    votes.forEach(vote => {
        const rshares = vote.rshares ? vote.rshares : 0
        totalRshares += rshares + ADD_SMOOTHING
        absoluteRshares += Math.abs(rshares) + ADD_SMOOTHING
    })

    return { votes, totalRshares, absoluteRshares }
}

function mapSimple (node, customFn = null) {
    const textSequence = parseText(node.text)

    let choiceValue = undefined
    if (textSequence.length === 1 && textSequence[0].name === 'text') {
        choiceValue = parseChoice(textSequence[0].value)
    }
    choiceValue = choiceValue === false ? null : choiceValue

    const momentCreatedAt = moment(node.createdAt, [DATE_FORMAT_PRECISE, DATE_FORMAT], true)
    const createdAtUnix = momentCreatedAt.unix()

    const id = { author: node.author, permlink: node.permlink }
    const res = {
        id,
        key: toString(id),
        ...node,
        ...mapVotes(node.votes ? node.votes : []),
        createdAt: node.createdAt,
        createdAtUnix,
        text: node.text.trim(),
        textSequence,
        choiceValue,
    }
    return customFn ? { ...res, ...customFn(res) } : res
}

function getChildrenWithCount (id, nodesByKey) {
    const getChildrenIds = id => {
        return Object.values(nodesByKey).filter(x => {
            if (id.permlink)
                return eq({ author: x.parentAuthor, permlink: x.parentPermlink }, id)
            return x.author === id.author
        }).map(({ author, permlink }) => ({ author, permlink }))
    }

    const getChildrenCount = id => {
        return getChildrenIds(id).reduce((total, childId) => 1 + total + getChildrenCount(childId), 0)
    }

    return { childrenIds: getChildrenIds(id), childrenCount: getChildrenCount(id) }
}

export default function (nodesByKey, { author = null, permlink }, customFn = null) {
    if (!permlink) {
        return null
    } else if (!author) {
        const permlinkNode = Object.values(nodesByKey).find(x => x.permlink === permlink)
        if (!permlinkNode || !permlinkNode.author) {
            return null
        }
        author = permlinkNode.author
    }

    const node = nodesByKey[toString({ author, permlink })]
    if (!isNodeValid(node)) {
        return null
    }

    const simpleNode = mapSimple(node, customFn)
    const metadata = mapMetadata(node.metadata || {})

    const { childrenIds, childrenCount } = getChildrenWithCount(simpleNode, nodesByKey)
    const stateChildren = childrenIds.map(id => nodesByKey[toString(id)]).filter(x => x).map(x => mapSimple(x, customFn))
    const results = metadata.unit ? mapResults(stateChildren, metadata.unit) : {}
    const visibleChildrenIds = stateChildren.filter(({ text, textSequence }) => {
        return text.length >= MINIMUM_COMMENT_LENGTH && !textSequence.every(x => ['quote', 'link', 'newline'].includes(x.name) ||
            x.name === 'text' && (x.value.match(/^\[\d+\]\s?$/) || parseChoice(x.value) !== null))
    })

    const linkedIds = _.uniqBy(stateChildren.flatMap(x => x.textSequence.filter(x => x.name === 'link' && !eq(node, x.value)).map(x => x.value)), toString)
    const linkedByIds = node.linkedByIds ? _.uniqWith(node.linkedByIds.map(({ author, permlink }) => ({ author, permlink })).filter(x => !eq(x, simpleNode.id)), eq) : []

    return {
        ...simpleNode,
        metadata,
        tags: metadata.tags || [],
        unit: metadata.unit || null,
        isWebpage: isPlainWebpage(node.text),
        childrenCount,
        childrenIds,
        visibleChildrenIds,
        linkedIds,
        results,
        linkedByIds,
    }
}
