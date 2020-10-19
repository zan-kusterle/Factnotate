/* globals ROOT_URL */
import Vue from 'vue'
import Vuex from 'vuex'
import GlobalEvents from 'vue-global-events'
import { toString } from './comment_ids'
import HighlightsOverlay from './components/HighlightsOverlay.vue'
import { nodesStore } from './store'
import '@fortawesome/fontawesome-pro/css/all.css'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import HighlightsOverlayCss from '!css-loader!less-loader!./components/HighlightsOverlay.less'
import TextSequenceCss from '!css-loader!less-loader!./components/TextSequence.less'

const getFactnotateMetaValue = () => {
    const tag = document.querySelector('meta[name=factnotate]')
    return tag ? tag.getAttribute('content') : null
}

window.onload = () => {
    if (!getFactnotateMetaValue()) {
        Vue.component('fa-icon', FontAwesomeIcon)

        Vue.use(Vuex)
        Vue.component('GlobalEvents', GlobalEvents)

        const overlayElement = document.createElement('div')
        overlayElement.id = 'highlights-overlay'
        document.body.appendChild(overlayElement)

        let container = overlayElement
        if (document.head.createShadowRoot || document.head.attachShadow) {
            container.attachShadow({ mode: 'open' })
            container = container.shadowRoot
        }

        const rawCss = [HighlightsOverlayCss, TextSequenceCss].map(f => f[0][1]).join(' \n')
        const style = document.createElement('style')
        style.innerHTML = rawCss
        container.appendChild(style)

        const firstChildElement = document.createElement('div')
        container.appendChild(firstChildElement)

        nodesStore.dispatch('initialize')

        const overlayVm = new Vue({
            el: firstChildElement,
            store: nodesStore,
            data () {
                return {
                    pageUrls: [],
                    blockedAuthors: [],
                }
            },
            computed: {
                annotationComments () {
                    return this.pageUrls.flatMap(pageUrl =>
                        this.$store.getters.getPostsByFuzzyUrl(pageUrl).flatMap(pageNode =>
                            this.$store.getters.getNodes(pageNode.childrenIds).filter(x => x.textSequence.some(y => y.name === 'quote'))))
                },
                allNodes () {
                    return []
                },
            },
            created () {
                setInterval(() => {
                    const pageUrls = []
                    const canonicalLinkElement = document.querySelector('link[rel=canonical]')
                    if (canonicalLinkElement) {
                        pageUrls.push(canonicalLinkElement.getAttribute('href'))
                    }
                    pageUrls.push(decodeURIComponent(window.location.href))

                    if (this.pageUrls.length !== pageUrls.length || this.pageUrls.some((x, i) => x !== pageUrls[i])) {
                        this.pageUrls = pageUrls
                        this.pageUrls.forEach(pageUrl => {
                            this.$store.dispatch('loadByFuzzyUrl', pageUrl)
                        })

                        const steemAuthorMetaElement = document.querySelector('meta[name="steem:author"]')
                        if (steemAuthorMetaElement) {
                            this.webpageAuthor = steemAuthorMetaElement.getAttribute('content')
                        }

                        const steemAuthorShareMetaElement = document.querySelector('meta[name="steem:authorShare"]')
                        if (steemAuthorShareMetaElement) {
                            this.webpageAuthorShare = steemAuthorShareMetaElement.getAttribute('content')
                        }

                        const steemBlockedAuthorsMetaElement = document.querySelector('meta[name="steem:blockedAuthors"]')
                        if (steemBlockedAuthorsMetaElement) {
                            this.blockedAuthors = steemBlockedAuthorsMetaElement.getAttribute('content').split(',').map(x => x.trim()).filter(x => x.length > 0)
                        }
                    }
                }, 50)
            },
            methods: {
                onAnnotate (text) {
                    window.open(`${ROOT_URL}/t/${encodeURIComponent(this.pageUrls[0])}/${encodeURIComponent(text)}${this.webpageAuthor ? `?beneficiary=${this.webpageAuthor}&beneficiaryShare=${this.webpageAuthorShare ? this.webpageAuthorShare.replace('%', '') : '20'}` : ''}`)
                },
                onOpen (linkedNode) {
                    window.open(`${ROOT_URL}/${toString(linkedNode)}`, '_blank')
                },
            },
            render (h) {
                const props = { annotationComments: this.annotationComments }
                return h(HighlightsOverlay, { props, on: { annotate: this.onAnnotate, open: this.onOpen }, domProps: { style: { position: 'relative', overflow: 'hidden' } } })
            },
        })

        window.__factnotateEmbedVm__ = overlayVm
        const element = document.createElement('meta')
        element.setAttribute('name', 'factnotate')
        element.setAttribute('content', 'embed')
        document.head.appendChild(element)
    }
}
