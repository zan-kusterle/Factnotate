import speakingurlSlug from 'speakingurl'

export function toString ({ author, permlink }) {
    if (author && permlink) {
        return `@${author}/${permlink}`
    } else if (author) {
        return `@${author}`
    } else if (permlink) {
        return permlink
    }
    return null
}

export function fromString (s) {
    const regex = /(@([^/]+))?(\/)?(.+)/
    const match = regex.exec(s)
    if (match) {
        const author = match[2] ? match[2].trim() : null
        let permlink = match[4] ? match[4].trim() : null
        if (permlink.startsWith('http://') || permlink.startsWith('https://')) {
            permlink = oneWayEncodePermlink(decodeURIComponent(permlink))
        }
        if (author && permlink) {
            if (match[3]) {
                return { author, permlink }
            }
        } else if (author) {
            return { author, permlink: null }
        } else if (permlink) {
            return { author: null, permlink }
        }
    }
    return { author: null, permlink: null }
}

export function eq (a, b) {
    return a && b && toString(a) === toString(b)
}

const STEEM_MAX_PERMLINK_LENGTH = 255
function normalizePermlink (permlink) {
    if (permlink.length > STEEM_MAX_PERMLINK_LENGTH) {
        permlink = permlink.substring(permlink.length - STEEM_MAX_PERMLINK_LENGTH, permlink.length)
    }
    return permlink.toLowerCase().replace(/[^a-z0-9-]+/g, '')
}

export function oneWayEncodePermlink (text) {
    if (!text) return null

    let permlink = normalizePermlink(speakingurlSlug(text.replace(/[<>]/g, ''), { truncate: 128 }))
    if (permlink.startsWith('https-')) {
        permlink = permlink.replace('https-', '')
    }
    else if (permlink.startsWith('http-')) {
        permlink = permlink.replace('http-', '')
    }
    if (permlink.startsWith('www-')) {
        permlink = permlink.replace('www-', '')
    }
    return permlink
}
