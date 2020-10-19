const LOG_COUNTS = false

/* globals GUN_URLS */
import _ from 'lodash'
import Gun from 'gun'
// eslint-disable-next-line
import Sea from 'gun/sea'
import { FORCE_CLEAN, ENABLE_GUN, USE_GUN_SERVERS } from '../../constants'
import { eq, toString } from '../../comment_ids'
// import { parseText } from '.'
// import { isPlainWebpage } from './parse'
import marked from 'marked'

if (FORCE_CLEAN || !ENABLE_GUN) {
    localStorage.removeItem('gun/')
    localStorage.removeItem('gap/gun/')
}
const GunDb = ENABLE_GUN ? new Gun(USE_GUN_SERVERS ? GUN_URLS.map(x => `${x}/gun`) : []) : null
let gunUser = null
const waitForUser = () => {
    return new Promise(resolve => {
        const r = () => {
            if (gunUser) {
                resolve(gunUser)
            } else {
                setTimeout(r, 100)
            }
        }
        r()
    })
}
fetch(GUN_URLS[0]).then(response => {
    if (response.ok) {
        response.text().then(text => {
            gunUser = GunDb.user(text.trim())
        })
    }
})

const nodesByKey = {}
const listenersByKey = {}
function onNodeUpdate (id) {
    const data = nodesByKey[toString(id)]
    if (data && data.base) {
        const node = {
            ...data.base,
            children: _.uniqBy(data.children, x => toString(x)),
            // votes: _.uniqBy(_.sortBy(data.votes, x => {
            //     return -moment(x.time, [DATE_FORMAT_PRECISE, DATE_FORMAT], true).valueOf()
            // }), x => x.voter),
            linkedByIds: data.linkedByIds,
        }

        listenersByKey[toString(id)].forEach(fn => fn(node))

        return node
    }
    return null
}

function getSubpaths (permlink) {
    const segments = permlink.replace('http://', '').replace('https://', '').split('/')
    const prefixes = []
    for (let i = 1; i <= Math.min(Math.max(segments.length - 4, 3), segments.length); i++) {
        prefixes.push(segments.slice(0, i).join('/'))
    }
    return prefixes
}

const mapFromGun = data => {
    return {
        author: data.author,
        permlink: data.permlink,
        parentAuthor: data.parentAuthor && data.parentAuthor.length > 0 ? data.parentAuthor : null,
        parentPermlink: data.parentPermlink,
        authorReputation: data.authorReputation || 0,
        text: data.parentAuthor ? data.text.toString() : data.title,
        totalScore: data.totalScore,
        createdAt: data.createdAt,
        metadata: data.metadata ? data.metadata : {},
        readableContent: data.readableContent ? (data.readableContent.content ? { content: marked(data.readableContent.content) } : data.readableContent) : null,
        votes: data.votes,
    }
}

export async function subscribeComment (id, onPostReceive, onChildrenReceive, onLinkedByPostReceive) {
    const key = toString(id)
    const firstSubscribe = !nodesByKey[key]

    if (LOG_COUNTS) {
        if (firstSubscribe) {
            console.count('subscribeComment')
        } else {
            console.count('subscribeComment [duplicate]')
        }
    }

    if (firstSubscribe) {
        listenersByKey[key] = []
        nodesByKey[key] = {
            base: null,
            children: [],
            votes: [],
            linkedByIds: [],
        }
    }

    const node = nodesByKey[key]
    // listenersByKey[key].push(onUpdate)

    if (firstSubscribe) {
        await waitForUser()
        const gunNode = gunUser.get(key)
        gunNode.on(data => {
            if (data.author && data.permlink && (data.title || data.text) && data.createdAt) {
                const post = mapFromGun(data)
                node.base = post
                onPostReceive(post)

                if (!post.parentAuthor) {
                    gunNode.get('children').map().on(child => {
                        if (child.text && child.author && child.permlink && !eq(post, child)) {
                            const existingIndex = node.children.findIndex(x => x.author === child.author && x.permlink === child.permlink)
                            if (existingIndex >= 0) {
                                node.children.splice(existingIndex, 1)
                            }
                            node.children.push(mapFromGun(child))

                            onNodeUpdate(id)
                            onChildrenReceive(mapFromGun(child))
                        }
                    })

                    gunNode.get('linkedBy').map().on(({ author, permlink }) => {
                        if (author && permlink && !eq(id, { author, permlink })) {
                            const existingIndex = node.linkedByIds.findIndex(x => x.author === author && x.permlink === permlink)
                            if (existingIndex >= 0) {
                                node.linkedByIds.splice(existingIndex, 1)
                            }
                            node.linkedByIds.push({ author, permlink })

                            onLinkedByPostReceive({ author, permlink })

                            onNodeUpdate(id)
                        }
                    })
                }
            }
        })
    }
}

export async function subscribePermlinkAuthors (permlink, onAuthor) {
    if (LOG_COUNTS) {
        console.count('subscribePermlinkAuthors')
    }

    await waitForUser()
    gunUser.get('permlinkAuthors').get(permlink).map().on(data => {
        if (data && data.author) {
            onAuthor(data.author)
        }
    })
}
export async function subscribeTag (permlink, onPost) {
    if (LOG_COUNTS) {
        console.count('subscribeTag')
    }

    await waitForUser()
    gunUser.get('tags').get(permlink).map().on(data => {
        if (data && data.author && data.permlink) {
            onPost(data)
        }
    })
}

export async function subscribeAuthorPermlinks (byAuthor, onPermlink) {
    if (LOG_COUNTS) {
        console.count('subscribeAuthorPermlinks')
    }

    await waitForUser()
    gunUser.get('authorPermlinks').get(byAuthor).map().on(data => {
        if (data) {
            onPermlink(data.permlink)
        }
    })
}

export async function subscribeFuzzyUrlAuthors (byPrefix, onReceive) {
    if (LOG_COUNTS) {
        console.count('subscribeFuzzyUrlAuthors')
    }

    await waitForUser()
    getSubpaths(byPrefix).forEach(subpath => {
        gunUser.get('fuzzyUrls').get(subpath).map().on(data => {
            if (data && data.author && data.permlink) {
                onReceive(data)
            }
        })
    })
}

export async function subscribeReadability (url, onReadability) {
    if (LOG_COUNTS) {
        console.count('subscribeReadability')
    }

    await waitForUser()
    gunUser.get('urls').get(url).on(readability => {
        if (readability.content) {
            onReadability({
                content: readability.content,
                title: readability.title || null,
                wordCount: readability.wordCount || 0,
                sources: readability.sources ? readability.sources : {},
            })
        }
    })
}
