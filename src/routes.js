import Vue from 'vue'
import VueRouter from 'vue-router'
import path from 'path'
import { contextStore } from './store'
import { eq } from './comment_ids'

Vue.use(VueRouter)

const router = new VueRouter({
    mode: 'history',
    base: path.resolve(__dirname, '..'),
})

const routes = [
    {
        name: 'Home',
        path: '/',
    },
    {
        name: 'Sandbox',
        path: '/sandbox-abc',
    },
    {
        name: 'Login',
        path: '/login/steemconnect',
        beforeEnter (to, from, next) {
            localStorage.setItem('accessToken', to.query.access_token)
            localStorage.setItem('accessTokenExpiresAt', Date.now() + to.query.expires_in * 1000)
            localStorage.setItem('username', to.query.username)

            contextStore.dispatch('tryToLogin')

            next(router.beforeLoginPath || '/')
        },
    },
    {
        name: 'Logout',
        path: '/logout',
        beforeEnter (_to, from, next) {
            contextStore.dispatch('logout')

            next(from ? from : '/')
        },
    },
    {
        name: 'Item',
        path: '/@:author/:permlink',
        beforeEnter (to, from, next) {
            const hasQueryParams = route => !!Object.keys(route.query).length
            if (!hasQueryParams(to) && hasQueryParams(from)) {
                next({ ...to, query: from.query })
            } else {
                next()
            }
        },
    },
    {
        name: 'ItemTitleQuote',
        path: '/t/:title/:text?',
    },
    {
        name: 'ItemQuery',
        path: '/:permlinkOrAuthor',
    },
]

router.addRoutes(routes)

router.idToRoute = ({ author, permlink }) => {
    if (author && permlink) {
        return { name: 'Item', params: { author: author, permlink: permlink } }
    } else if (author) {
        return { name: 'ItemQuery', params: { permlinkOrAuthor: `@${author}` } }
    } else if (permlink) {
        return { name: 'ItemQuery', params: { permlinkOrAuthor: permlink } }
    } else {
        return { name: 'Home', params: {} }
    }
}
router.toId = (id, isQuick = false) => {
    const { name, params } = router.currentRoute
    const route = router.idToRoute(id)
    route.params.isQuick = isQuick
    if (!(route.name === name && eq(route.params, params))) {
        router.push(route)
    }
}

export default router
