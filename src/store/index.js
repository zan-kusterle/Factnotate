import Vue from 'vue'
import Vuex from 'vuex'
import context from './context'
import nodes from './nodes'
import root from './root'
import user from './user'

Vue.use(Vuex)

export const contextStore = new Vuex.Store({
    modules: { nodes, context, root, user },
})

export const nodesStore = new Vuex.Store({
    modules: { nodes },
})
