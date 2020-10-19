/* globals ROOT_URL */
import { parseText } from './nodes'
import { tags, MAX_POST_LENGTH } from '../constants'

export default {
    state: {
        commentText: '',
        postCommentText: localStorage.getItem('postCommentText') || '',
        searchText: '',
        commentingOn: null,
        language: 'en-US',
        postsSort: localStorage.getItem('postsSort') || 'trending',
        repliesSort: localStorage.getItem('repliesSort') || 'votes',
        videoTime: null,
        isSortAscending: true,
        minimumLength: 6,
    },
    getters: {
        isShareAvailable () {
            return !!navigator.share
        },
        maxPostLength () {
            return MAX_POST_LENGTH
        },
        bookmarkletHref () {
            return `javascript:void function(){window.location.href=\`${ROOT_URL}/t/\${encodeURIComponent(window.location.href)}\`}();`
        },
        isSortAscending: state => state.isSortAscending,
        commentingOn (state) {
            return state.commentingOn
        },
        commentText (state) {
            return state.commentText
        },
        postCommentText (state) {
            return state.postCommentText
        },
        commentTextSequence (state) {
            return state.commentText ? parseText(state.commentText) : []
        },
        tags () {
            return tags
        },
        postsSort (state) {
            return state.postsSort
        },
        repliesSort (state) {
            return state.repliesSort
        },
        minimumLength: state => state.minimumLength,
    },
    actions: {
        startCommenting ({ commit }, { author, permlink }) {
            commit('SET_COMMENT_ON', { author, permlink })
        },
        setCommentText ({ commit },  text) {
            commit('SET_COMMENT_TEXT', text)
        },
        setPostCommentText ({ commit }, text) {
            commit('SET_POST_COMMENT_TEXT', text)
        },
        closeComment ({ commit }) {
            commit('CLOSE_COMMENT')
        },
        setPostsSort ({ commit }, sort) {
            commit('SET_POSTS_SORT', sort)
        },
        setRepliesSort ({ commit }, sort) {
            commit('SET_REPLIES_SORT', sort)
        },
        setVideoTime ({ state, commit }, { time }) {
            const minutes = Math.floor(time / 60)
            const seconds = Math.floor(time - minutes * 60)
            const text = `${minutes}:${('00' + seconds).slice(-2)}`

            commit('SET_VIDEO_TIME', time)
            if (!state.commentingOn) {
                commit('SET_COMMENT_TEXT', `> ${text}`)
            }
        },
    },
    mutations: {
        SET_COMMENT_TEXT (state, text) {
            state.commentText = text
        },
        SET_POST_COMMENT_TEXT (state, text) {
            state.postCommentText = text
            localStorage.setItem('postCommentText', text)
        },
        SET_COMMENT_ON (state, { author, permlink }) {
            state.commentingOn = { author, permlink }
        },
        CLOSE_COMMENT (state) {
            state.commentingOn = null
            state.commentText = ''
        },
        SET_POSTS_SORT (state, sort) {
            state.postsSort = sort
            localStorage.setItem('postsSort', sort)
        },
        SET_REPLIES_SORT (state, sort) {
            state.repliesSort = sort
            localStorage.setItem('repliesSort', sort)
        },
        SET_VIDEO_TIME (state, time) {
            state.videoTime = time
        },
    },
}
