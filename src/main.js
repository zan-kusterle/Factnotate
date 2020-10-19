import GlobalEvents from 'vue-global-events'
import Vue from 'vue'
import Vuex from 'vuex'
import VueYoutube from 'vue-youtube'
import '@fortawesome/fontawesome-pro/css/all.css'

import { Button, Dialog, Popover, Tooltip, Slider, Input, Select, Option, OptionGroup, Dropdown, DropdownMenu, DropdownItem } from 'element-ui'
Vue.component(Button.name, Button)
Vue.component(Dialog.name, Dialog)
Vue.component(Popover.name, Popover)
Vue.component(Tooltip.name, Tooltip)
Vue.component(Slider.name, Slider)
Vue.component(Input.name, Input)
Vue.component(Select.name, Select)
Vue.component(Option.name, Option)
Vue.component(OptionGroup.name, OptionGroup)
Vue.component(Dropdown.name, Dropdown)
Vue.component(DropdownMenu.name, DropdownMenu)
Vue.component(DropdownItem.name, DropdownItem)

import TextSequence from './components/TextSequence.vue'
Vue.component('TextSequence', TextSequence)

import App from './components/App.vue'
import router from './routes'
import { contextStore } from './store'
import populatePosts from './populate'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TEST_USERNAME } from './constants'

Vue.component('fa-icon', FontAwesomeIcon)

Vue.use(Vuex)
Vue.use(VueYoutube)
Vue.component('GlobalEvents', GlobalEvents)

Vue.directive('focus', {
    inserted (el, binding) {
        const element = binding.value || el
        element.focus()
        if (element === document.activeElement) {
            element.focusDone = true
        }
    },
    update (el, binding) {
        const element = binding.value || el
        if (!element.focusDone) {
            element.focus()
            if (element === document.activeElement) {
                element.focusDone = true
            }
        }
    },
})

const store = contextStore

store.dispatch('initialize')

const vm = new Vue({
    router,
    store,
    el: '#app',
    ...App,
})

window.__factnotateVm__ = vm
const existingElement = document.querySelector('meta[name=factnotate]')
if (existingElement) {
    existingElement.remove()
}
const element = document.createElement('meta')
element.setAttribute('name', 'factnotate')
element.setAttribute('content', 'main')
document.head.appendChild(element)

populatePosts(store)

if (TEST_USERNAME) {
    window.setTestUsername = name => store.commit('SET_USER', { name })
}
