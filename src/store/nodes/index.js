import Vue from 'vue'
import _ from 'lodash'
import moment from 'moment'
import { isNodeValid, parseToken, parseText, parseUnit, parseLine, isPlainWebpage } from './parse'
import { default as mapComment, mapVotes, getUnitChoiceText, mapResults as getResults } from './map'
import * as ids from '../../comment_ids'
import * as gun from './gun'
import { ENABLE_GUN, APP_NAME, SUPPORTED_FORMATS, DATE_FORMAT_PRECISE, deleteVotesTexts, DEVELOPER_BENEFICIARY_ACCOUNT, DEVELOPER_BENEFICIARY_SHARE, DATE_FORMAT } from '../../constants'
import steemConnect from './steem_connect'

// let nodesToCommit = []
class DefaultDict {
    constructor (defaultInit) {
        return new Proxy({}, {
            get: (target, name) => name in target ?
                target[name] :
                (target[name] = typeof defaultInit === 'function' ?
                    new defaultInit().valueOf() :
                    defaultInit),
        })
    }
}

export { ids, isNodeValid, parseToken, parseText, parseUnit, parseLine, isPlainWebpage, getUnitChoiceText, getResults, mapVotes }

export default {
    state: {
        stateId: 0,
        readabilityByUrl: {},
        flagsByKey: {},
        nodesByKey: {},
        accountByAuthor: {},
        pendingComments: [],
        pendingVotes: [],
        knownPostIds: [],
        lastBroadcastError: null,
    },
    getters: {
        nodesByKey: state => state.nodesByKey,
        readabilityByUrl: state => state.readabilityByUrl,
        knownPosts (state, getters) {
            return state.knownPostIds.map(getters.getPost)
        },
        pendingBroadcastsCount (state) {
            return state.pendingComments.length + state.pendingVotes.length
        },
        pendingComments: state => state.pendingComments,
        lastBroadcastError: state => state.lastBroadcastError,
        getNode (state, getters) {
            return id => {
                return mapComment(state.nodesByKey, id, node => {
                    const newId = { author: node.author, permlink: node.permlink }

                    let readableContent = node.readableContent
                    if (!readableContent && parseToken(node.text).name === 'webpage') {
                        readableContent = getters.readabilityByUrl[node.text]
                    }
                    readableContent = readableContent || null

                    return {
                        ownVote: getters.username && node.votes.find(v => v.voter === getters.username) || null,
                        id: newId,
                        isActive: ids.eq(getters.rootId, newId),
                        authorReputation: state.accountByAuthor[id.author] ? state.accountByAuthor[id.author].authorReputation : null,
                        isWebpage: parseToken(node.text).name === 'webpage',
                        readableContent,
                        view: getters.getViewForTitle(node.text),
                        isPending: state.pendingComments.some(x => ids.eq(x, newId)),
                    }
                })
            }

        },
        getNodes (_state, getters) {
            return xs => {
                const nodes = _.uniqBy(xs, ids.toString).map(x => getters.getNode(x)).filter(x => x)
                return getters.sortNodes(nodes)
            }
        },
        sortNodes (_state, getters) {
            const byName = {
                votes: (x) => -x.totalRshares,
                choice: (x) => -x.choiceValue,
                age: (x) => -x.createdAtUnix,
                reputation: (x) => -x.authorReputation,
            }

            return (nodes, sortBy, isSortAscending) => {
                const sortMult = isSortAscending || getters.isSortAscending ? 1 : -1
                const sortFn = byName[sortBy || getters.repliesSort || 'votes']
                return _.sortBy(nodes, x => {
                    if (x.isPending) {
                        return Number.MIN_SAFE_INTEGER
                    }
                    return sortFn ? sortFn(x) * sortMult : 0
                })
            }
        },
        getNodeWithChildren (_state, getters) {
            return ({ permlink, author }) => {
                const comment = getters.getNode({ permlink, author })
                if (!comment) return null

                const children = getters.getNodes(comment.childrenIds)

                const linkedChildren = getters.getNodes(comment.linkedIds).map(linkedNode => {
                    const linkNodes = getters.getNodes(comment.childrenIds).filter(x => x.textSequence.some(y => y.name === 'link' && ids.eq(y.value, linkedNode)))
                    const relevanceResults = mapVotes(linkNodes.flatMap(x => x.votes))
                    return { ...linkedNode, linkNodes, relevanceResults }
                })
                linkedChildren.forEach(linkedChild => {
                    if (!children.some(x => x.key === linkedChild.key)) {
                        children.push(linkedChild)
                    }
                })

                const linkingCommentsByUrl = new DefaultDict(Array)
                children.forEach(child => {
                    if (child.isWebpage) {
                        linkingCommentsByUrl[child.text].push(child)
                    }
                })
                const webpages = Object.keys(linkingCommentsByUrl).map(url => {
                    const linkingComments = linkingCommentsByUrl[url]
                    const webpageNode = getters.getPostByPermlink(url) || linkingComments[0]
                    return { ...webpageNode, linkingComments }
                })
                webpages.forEach(webpage => {
                    if (!children.some(x => x.key === webpage.key)) {
                        children.push(webpage)
                    }
                })

                return { ...comment, children: getters.sortNodes(children) }
            }
        },
        getByAuthor (state, getters) {
            return author => getters.getNodes(Object.values(state.nodesByKey).filter(x => x.parentPermlink && x.author === author))
        },
        getByTag (state, getters) {
            return permlink => getters.getNodes(Object.values(state.nodesByKey).filter(x => !x.parentAuthor && x.parentPermlink === permlink))
        },
        getPost (state, getters) {
            return ({ permlink, author }) => {
                const get = id => {
                    if (id) {
                        const node = getters.getNode(id)
                        if (node) {
                            if (node.parentAuthor) {
                                return get({ author: node.parentAuthor, permlink: node.parentPermlink })
                            }
                            return node
                        }
                    }
                    return null
                }
                return get({ author, permlink })
            }
        },
        getPostByPermlink (state, getters) {
            return param => {
                const permlink = ids.oneWayEncodePermlink(param)
                const node = Object.values(state.nodesByKey).find(node => !node.parentAuthor && node.permlink === permlink)
                return node ? getters.getPost({ author: node.author, permlink }) : null
            }
        },
        getPostsByFuzzyUrl (state, getters) {
            return param => {
                const permlink = ids.oneWayEncodePermlink(param)
                const nodes = Object.values(state.nodesByKey).filter(node => !node.parentAuthor && node.permlink.startsWith(permlink))
                return nodes.map(node => getters.getPost(node))
            }
        },
    },
    actions: {
        initialize ({ commit, dispatch }) {
            const pendingCommentsData = localStorage.getItem('pendingComments')
            const pendingComments = pendingCommentsData ? JSON.parse(pendingCommentsData) : []
            pendingComments.forEach(comment => commit('ADD_COMMENT', comment))

            const pendingVotesData = localStorage.getItem('pendingVotes')
            const pendingVotes = pendingVotesData ? JSON.parse(pendingVotesData) : []
            pendingVotes.forEach(vote => commit('ADD_VOTE', vote))

            const knownPostIdsData = localStorage.getItem('knownPostIds')
            const knownPostIds = knownPostIdsData ? JSON.parse(knownPostIdsData) : []
            knownPostIds.forEach(id => dispatch('loadNode', id))
        },
        loadReadability ({ state, commit }, url) {
            if (!state.readabilityByUrl[url]) {
                if (ENABLE_GUN) {
                    gun.subscribeReadability(url, readability => {
                        if (!state.readabilityByUrl[url]) {
                            commit('SET_URL_READABILITY', { url, readability })
                        }
                    })
                }
            }
        },
        loadNode ({ state, getters, commit, dispatch }, { author, permlink, forceRefresh = false, depth = 0 }) {
            if (!author && !permlink || depth < 0) {
                return Promise.resolve(null)
            }

            const id = { author, permlink: ids.oneWayEncodePermlink(permlink) }
            const key = ids.toString(id)

            if (!state.flagsByKey[key] && (forceRefresh || !state.nodesByKey[key])) {
                commit('FLAG_NODE', id)

                const loadAnother = id => dispatch('loadNode', { ...id, depth: depth - 1 })

                const addNode = node => {
                    if (isNodeValid(node) && !state.nodesByKey[ids.toString(node)]) {
                        commit('SET_NODE', node)
                    }

                    parseText(node.text).filter(x => x.name === 'link').map(x => x.value).forEach(loadAnother)

                    if (node.parentAuthor && node.parentPermlink) {
                        dispatch('loadNode', { author: node.parentAuthor, permlink: node.parentPermlink })
                    }

                    if (node.linkedByIds) {
                        node.linkedByIds.forEach(loadAnother)
                    }
                    getters.getNode(node).linkedIds.forEach(loadAnother)

                    // if (node.childrenIds) {
                    //     node.childrenIds.forEach(loadAnother)
                    // }

                    // if (ENABLE_GUN) {
                    //     if (author === true) {
                    //         if (parseToken(node.text).name === 'webpage') {
                    //             const permlink = ids.oneWayEncodePermlink(node.text)
                    //             gun.subscribePermlinkAuthors(permlink, authors => {
                    //                 authors.forEach(author => loadAnother({ author, permlink }))
                    //             })
                    //         }
                    //     }
                    // }
                }

                if (ENABLE_GUN) {
                    const ownStateId = state.stateId
                    if (id.author && id.permlink) {
                        if (id.author === true) {
                            gun.subscribePermlinkAuthors(id.permlink, author => {
                                if (ownStateId === state.stateId) {
                                    dispatch('loadNode', { author, permlink: id.permlink })
                                }
                            })
                        } else {
                            const onCommentOrPostReceive = node => {
                                if (ownStateId === state.stateId) {
                                    if (isNodeValid(node)) {
                                        addNode(node)
                                    }
                                }
                            }
                            gun.subscribeComment(id, onCommentOrPostReceive, onCommentOrPostReceive, loadAnother, depth === 0 ? 'choiceChildren' : 'children')
                        }
                    } else if (id.author) {
                        gun.subscribeAuthorPermlinks(id.author, permlink => {
                            if (ownStateId === state.stateId) {
                                dispatch('loadNode', { author: id.author, permlink })
                            }
                        })
                    } else if (id.permlink) {
                        gun.subscribeTag(id.permlink, id => {
                            if (ownStateId === state.stateId) {
                                dispatch('loadNode', id)
                            }
                        })
                    }
                }
            }

            return new Promise(resolve => {
                const f = (id, i = 0) => {
                    if (state.nodesByKey[ids.toString(id)]) {
                        resolve(getters.getNode(id))
                    } else {
                        setTimeout(() => f(id, i + 1), 2 ** i * 100)
                    }
                }
                f(id)
            })
        },
        loadByFuzzyUrl ({ dispatch }, title) {
            if (ENABLE_GUN) {
                gun.subscribeFuzzyUrlAuthors(title, id => {
                    dispatch('loadNode', { ...id, depth: 2 })
                })
            }
        },
        broadcastPost ({ dispatch }, { text, metadata = {} }) {
            let metadataType = null
            if (metadata && metadata.unit) {
                metadataType = parseUnit(metadata.unit).isSpectrum ? 'claim' : 'estimate'
            } else if (SUPPORTED_FORMATS.some(x => text.endsWith(`.${x}`))) {
                metadataType = 'document'
            } else if (isPlainWebpage(text)) {
                metadataType = 'webpage'
            }
            metadata.type = metadataType
            return dispatch('broadcastComment', { parentAuthor: '', parentPermlink: metadata && metadata.tags && metadata.tags[0] || APP_NAME, text, metadata })
        },
        broadcastChoice ({ dispatch }, { parentAuthor, parentPermlink, choice }) {
            if (choice === null) {
                dispatch('broadcastComment', { parentAuthor, parentPermlink, text: deleteVotesTexts[0] })
            } else {
                dispatch('broadcastComment', { parentAuthor, parentPermlink, text: choice.toString() })
            }
        },
        broadcastComment ({ getters, commit }, { parentAuthor, parentPermlink, text, metadata = {}, beneficiaries = [] }) {
            if (!getters.username) {
                window.location.href = getters.loginUrl
                return null
            }

            const permlink = (parentAuthor ? Math.random().toString(36).substring(2) : ids.oneWayEncodePermlink(text).substring(0, 250)).toLowerCase()

            const comment = {
                steemFetchDatetime: moment().format(DATE_FORMAT),
                author: getters.username,
                authorReputation: getters.user && getters.user.account ? getters.user.account.reputation : 0,
                permlink,
                parentAuthor,
                parentPermlink: parentPermlink.trim().toLowerCase(),
                text,
                totalScore: 0,
                createdAt: moment().format(DATE_FORMAT_PRECISE),
                votes: [],
                children: [],
                metadata,
                beneficiaries: beneficiaries.filter(x => x.account !== DEVELOPER_BENEFICIARY_ACCOUNT).concat([{ account: DEVELOPER_BENEFICIARY_ACCOUNT, weight: DEVELOPER_BENEFICIARY_SHARE }]),
            }

            commit('ADD_COMMENT', comment)

            return steemConnect.broadcastComment({ author: getters.username, permlink }, comment).then(() => {
                dispatch('loadNode', comment)
            }).catch(err => {
                const errorText = err.error_description || err.message || ''
                commit('SET_LAST_BROADCAST_ERROR', errorText)
            })
        },
        broadcastVote ({ getters, commit }, { author, permlink, ratio }) {
            if (!getters.username) {
                window.location.href = getters.loginUrl
                return null
            }

            const vote = {
                author,
                permlink: permlink.toLowerCase(),
                voter: getters.username,
                ratio,
                time: moment().format(DATE_FORMAT_PRECISE),
                rshares: Math.sign(ratio),
                weight: 1,
            }

            commit('ADD_VOTE', vote)

            return Promise.resolve(vote)
        },
    },
    mutations: {
        FLAG_NODE (state, id) {
            if (!state.flagsByKey[ids.toString(id)]) {
                Vue.set(state.flagsByKey, ids.toString(id), true)
            }
        },
        SET_NODE (state, node) {
            Vue.set(state.nodesByKey, ids.toString(node), JSON.parse(JSON.stringify(node)))
            Vue.delete(state.flagsByKey, ids.toString(node))

            if (!node.parentAuthor) {
                const existingKnownIndex = state.knownPostIds.findIndex(x => ids.eq(x, node))
                if (existingKnownIndex >= 0) {
                    state.knownPostIds.splice(existingKnownIndex, 1)
                }
                state.knownPostIds.push({ author: node.author, permlink: node.permlink })
            }
        },
        SET_NODES (state, nodes) {
            nodes.forEach(node => {
                Vue.set(state.nodesByKey, ids.toString(node), JSON.parse(JSON.stringify(node)))
                Vue.delete(state.flagsByKey, ids.toString(node))

                if (!node.parentAuthor) {
                    const existingKnownIndex = state.knownPostIds.findIndex(x => ids.eq(x, node))
                    if (existingKnownIndex >= 0) {
                        state.knownPostIds.splice(existingKnownIndex, 1)
                    }
                    state.knownPostIds.push({ author: node.author, permlink: node.permlink })
                }
            })

            localStorage.setItem('knownPostIds', JSON.stringify(state.knownPostIds))
        },
        ADD_COMMENT (state, comment) {
            const existingCommentIndex = state.pendingComments.findIndex(x => ids.eq(x, comment) || x.parentAuthor === comment.parentAuthor && x.parentPermlink === comment.parentPermlink && x.author === comment.author && x.text === comment.text)
            if (existingCommentIndex >= 0) {
                state.pendingComments.splice(existingCommentIndex, 1)
            }
            state.pendingComments.push(comment)
            localStorage.setItem('pendingComments', JSON.stringify(state.pendingComments))

            Vue.set(state.nodesByKey, ids.toString(comment), JSON.parse(JSON.stringify(comment)))
        },
        ADD_VOTE (state, vote) {
            const existingNode = state.nodesByKey[ids.toString(vote)]
            if (existingNode) {
                const votes = existingNode.votes
                const existingVoterIndex = votes.findIndex(x => x.voter === vote.voter)
                if (existingVoterIndex >= 0) {
                    votes.splice(existingVoterIndex, 1)
                }
                votes.push(vote)
                Vue.set(state.nodesByKey, existingNode.key, { ...existingNode, votes })
            }

            const existingVoteIndex = state.pendingVotes.findIndex(x => ids.eq(x, vote))
            if (existingVoteIndex >= 0) {
                state.pendingVotes.splice(existingVoteIndex, 1)
            }
            state.pendingVotes.push(vote)
            localStorage.setItem('pendingVotes', JSON.stringify(state.pendingVotes))
        },
        SET_ACCOUNT (state, { username, account }) {
            Vue.set(state.accountByAuthor, username, account)
        },
        CLEAR_NODES (state) {
            Object.keys(state.nodesByKey).forEach(key => Vue.delete(state.nodesByKey, key))
            state.nodesByKey = {}
            state.stateId = Math.round(Math.random() * 1e10)
        },
        SET_URL_READABILITY (state, { url, readability, error }) {
            if (error) {
                Vue.set(state.readabilityByUrl, url, { error })
            } else {
                Vue.set(state.readabilityByUrl, url, readability)
            }
        },
        REMOVE_PENDING_COMMENT (state, { author, permlink }) {
            const index = state.pendingComments.findIndex(x => ids.eq(x, { author, permlink }))
            if (index >= 0) {
                state.pendingComments.splice(index, 1)
                localStorage.setItem('pendingComments', JSON.stringify(state.pendingComments))
            }
        },
        POSTPONE_PENDING_COMMENT (state, { author, permlink }) {
            const index = state.pendingComments.findIndex(x => ids.eq(x, { author, permlink }))
            if (index >= 0) {
                const comment = state.pendingComments[index]
                state.pendingComments.splice(index, 1)
                state.pendingComments.push(comment)
                localStorage.setItem('pendingComments', JSON.stringify(state.pendingComments))
            }
        },
        REMOVE_PENDING_VOTE (state, { author, permlink }) {
            const index = state.pendingVotes.findIndex(x => ids.eq(x, { author, permlink }))
            if (index >= 0) {
                state.pendingVotes.splice(index, 1)
                localStorage.setItem('pendingVotes', JSON.stringify(state.pendingVotes))
            }
        },
        POSTPONE_PENDING_VOTE (state, { author, permlink }) {
            const index = state.pendingVotes.findIndex(x => ids.eq(x, { author, permlink }))
            if (index >= 0) {
                const vote = state.pendingVotes[index]
                state.pendingVotes.splice(index, 1)
                state.pendingVotes.push(vote)
                localStorage.setItem('pendingVotes', JSON.stringify(state.pendingVotes))
            }
        },
        SET_LAST_BROADCAST_ERROR (state, payload) {
            state.lastBroadcastError = payload
        },
    },
}
