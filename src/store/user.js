import * as steemConnect from './nodes/steem_connect'
import { TEST_USERNAME } from '../constants'

export default {
    state: {
        user: TEST_USERNAME ? { name: TEST_USERNAME } : null,
    },
    getters: {
        loginUrl () {
            return !TEST_USERNAME ? steemConnect.getLoginUrl() : null
        },
        user (state) {
            return state.user
        },
        username (state) {
            const cachedUsername = localStorage.getItem('username')
            return state.user && state.user.name || cachedUsername || null
        },
    },
    actions: {
        initialize ({ dispatch }) {
            return dispatch('tryToLogin')
        },
        tryToLogin ({ commit }) {
            if (!TEST_USERNAME) {
                const accessToken = localStorage.getItem('accessToken')
                if (accessToken) {
                    steemConnect.login(accessToken).then(user => {
                        commit('SET_USER', user)
                    })
                }
            }
        },
        logout ({ commit }) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('accessTokenExpiresAt')
            localStorage.removeItem('username')
            commit('SET_USER', null)
        },
    },
    mutations: {
        SET_USER (state, user) {
            state.user = user
        },
    },
}
