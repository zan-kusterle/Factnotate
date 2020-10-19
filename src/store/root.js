/* globals ROOT_URL, GUN_URLS */
import moment from 'moment'
import * as ids from '../comment_ids'
import { parseToken, parseText } from './nodes'
import router from '../routes'
import { toString } from '../comment_ids'
import { DATE_FORMAT_PRECISE, spectrumUnits, quantityUnits  } from '../constants'

function parseUrl (url) {
    const { pathname } = new URL(url)
    const pathnameParts = pathname.split('/').filter(x => x.length > 0)
    if (pathnameParts.length >= 3 && pathnameParts[1].startsWith('@') && pathnameParts[2].length >= 8) {
        return { author: pathnameParts[1].substring(1), permlink: pathnameParts[2] }
    } else if (pathnameParts.length === 2 && pathnameParts[0].startsWith('@') && pathnameParts[1].length >= 8) {
        return { author: pathnameParts[0].substring(1), permlink: pathnameParts[1] }
    } else {
        return { url }
    }
}

export default {
    state: {
        rootId: null,
        temporaryTitle: '',
    },
    getters: {
        transformSteemUrl () {
            return url => {
                const params = parseUrl(url)
                return params.url ? url : toString(params)
            }
        },
        getViewForTitle () {
            return title => {
                if (title.startsWith('https://')) {
                    const url = new URL(title)
                    const hostname = url.hostname.replace('www.', '')
                    if (hostname === 'youtu.be') {
                        return { type: 'youtube', key: url.pathname.substring(1) }
                    } else if (hostname.startsWith('youtube.')) {
                        const params = new URLSearchParams(url.search)
                        if (params.has('v')) {
                            return { type: 'youtube', key: params.get('v') }
                        }
                    }
                }

                if (title.endsWith('.pdf')) {
                    return { type: 'pdf' }
                }
            }
        },
        units () {
            return {
                spectrum: spectrumUnits,
                quantity: quantityUnits,
            }
        },
        linkablePosts (state, getters) {
            return state.rootId ? getters.knownPosts.filter(x => !ids.eq(x.id, state.rootId)) : getters.knownPosts
        },
        rootId (state) {
            return state.rootId
        },
        rootPost (state, getters) {
            if (getters.rootNode.parentAuthor) {
                return getters.getPost(getters.rootNode)
            }
            return null
        },
        rootNode (state, getters) {
            const basePost = {
                author: null,
                parentAuthor: null,
                parentPermlink: null,
                totalScore: 0,
                votes: [],
                results: {},
                linkedIds: [],
                linkedByIds: [],
                createdAt: moment().format(DATE_FORMAT_PRECISE),
            }

            let post = null
            if (state.temporaryTitle && parseToken(state.temporaryTitle).name === 'webpage') {
                const permlink = ids.oneWayEncodePermlink(state.temporaryTitle)
                post = getters.getPostByPermlink(permlink)
                if (!post) {
                    post = {
                        ...basePost,
                        permlink: permlink,
                        key: state.temporaryTitle,
                        id: { author: null, permlink: permlink },
                        childrenIds: [],
                        visibleChildrenIds: [],
                        children: [],
                        isTemporary: true,
                        author: true,
                        isWebpage: true,
                        readableContent: getters.readabilityByUrl[state.temporaryTitle],
                        text: state.temporaryTitle,
                        view: getters.getViewForTitle(state.temporaryTitle),
                        textSequence: [{ name: 'webpage', value: state.temporaryTitle }],
                        isPending: true,
                    }
                }
            } else if (state.rootId) {
                const { author, permlink } = state.rootId
                if (author && permlink) {
                    post = getters.getNodeWithChildren(state.rootId)
                } else if (author) {
                    const children = getters.getByAuthor(author)
                    const visibleChildrenIds = children.filter(x => !x.parentAuthor).map(({ author, permlink }) => ({ author, permlink }))
                    post = {
                        ...basePost,
                        isUser: true,
                        author,
                        id: { author, permlink: null },
                        key: `@${author}`,
                        childrenIds: children.map(({ author, permlink }) => ({ author, permlink })),
                        visibleChildrenIds,
                        children,
                        text: author,
                        textSequence: parseText(author),
                    }
                } else if (permlink) {
                    const children = getters.getByTag(permlink)
                    const childrenIds = children.map(({ author, permlink }) => ({ author, permlink }))
                    post = {
                        ...basePost,
                        isTag: true,
                        permlink: permlink,
                        key: `#${permlink}`,
                        id: { author: null, permlink: permlink },
                        childrenIds,
                        visibleChildrenIds: childrenIds,
                        children,
                        text: permlink,
                        textSequence: parseText(permlink),
                    }
                }
            }
            if (!post) {
                return null
            }

            let commonPrefixPosts = []
            if (post.permlink) {
                const commonPrefixIds = Object.values(getters.nodesByKey).filter(x => x.permlink).filter(x => {
                    return x.permlink.length < post.permlink.length && post.permlink.startsWith(x.permlink) ||
                        post.permlink.length < x.permlink.length && x.permlink.startsWith(post.permlink)
                })
                commonPrefixPosts = commonPrefixIds.map(getters.getPost)
            }

            return { ...post, commonPrefixPosts }
        },
    },
    actions: {
        setViewItem ({ state, commit, dispatch }, { author, permlink, title }) {
            const setActiveNode = id => {
                if (!ids.eq(id, state.rootId)) {
                    commit('SET_ROOT_ID', id)

                    fetch(`${GUN_URLS[0]}/${ids.toString(id)}`)

                    return dispatch('loadNode', { ...id, depth: 1, forceRefresh: true }).then(node => {
                        document.title = `Factnotate - ${node.text}`
                        if (node && parseToken(node.text).name === 'webpage') {
                            dispatch('loadReadability', node.text)
                            dispatch('loadByFuzzyUrl', id.permlink)
                        }
                        return node
                    })
                }
            }

            if (title) {
                if (parseToken(title).name === 'webpage') {
                    fetch(`${GUN_URLS[0]}/${title}`)
                    dispatch('loadReadability', title)
                    dispatch('loadByFuzzyUrl', title)
                }

                document.title = `Factnotate - ${title}`

                commit('SET_TEMPORARY_TITLE', title)
            } else {
                commit('SET_TEMPORARY_TITLE', null)

                if (author && permlink) {
                    setActiveNode({ author, permlink })
                } else if (author) {
                    setActiveNode({ author, permlink: null })
                } else if (permlink) {
                    setActiveNode({ author: null, permlink })
                }
            }
        },
        clearViewItem ({ commit }) {
            commit('CLEAR_ROOT_ID')
        },
        postNew ({ dispatch }, { title, metadata, ownChoice, isWebpage }) {
            if (isWebpage) {
                dispatch('viewUrl', title)
            } else {
                dispatch('broadcastPost', { text: title, metadata }).then(node => {
                    if (node) {
                        if (ownChoice || ownChoice === 0) {
                            dispatch('broadcastChoice', { parentAuthor: node.author, parentPermlink: node.permlink, unit: metadata.unit, choice: ownChoice })
                        }
                        router.toId({ author: node.author, permlink: node.permlink })
                    }
                })
            }
        },
        viewUrl (_, url) {
            const params = parseUrl(url)
            if (params.url) {
                router.push({ name: 'ItemTitleQuote', params: { title: url } })
            } else {
                router.push({ name: 'Item', params })
            }
        },
        onVote ({ dispatch, getters }, payload) {
            dispatch('handleTemporaryNode', getters.rootNode).then(node => {
                if (payload.author === true) {
                    payload.author = node.author
                }

                // if (payload.ratio === currentRatio)
                //     payload.ratio = null
                // else
                dispatch('broadcastVote', payload)
            })
        },
        appReply ({ dispatch, getters }, { parentAuthor, parentPermlink, text, metadata, beneficiaries }) {
            return dispatch('handleTemporaryNode', getters.rootNode).then(node => {
                return dispatch('broadcastComment', { parentAuthor: parentAuthor === true ? node.author : parentAuthor, parentPermlink, text, metadata, beneficiaries }).then(() => {
                    localStorage.removeItem('postCommentText')
                })
            })
        },
        handleTemporaryNode ({ dispatch, getters }, node) {
            return new Promise(resolve => {
                if (node.isTemporary) {
                    dispatch('broadcastPost', { text: node.text }).then(node => {
                        if (node) {
                            router.toId(node)
                        }
                    })
                    resolve({ author: getters.username, permlink: node.permlink })
                } else {
                    resolve(node)
                }
            })
        },
        onShare ({ getters }, title) {
            if (navigator.share) {
                navigator.share({
                    title,
                    url: `${ROOT_URL}/${toString({ author: getters.rootNode.author, permlink: getters.rootNode.permlink })}`,
                })
            } else {
                // copy url
            }
        },
    },
    mutations: {
        SET_TEMPORARY_TITLE (state, title) {
            state.temporaryTitle = title
        },
        SET_ROOT_ID (state, { author, permlink }) {
            state.rootId = { author, permlink }
        },
        CLEAR_ROOT_ID (state) {
            state.rootId = null
        },
    },
}
