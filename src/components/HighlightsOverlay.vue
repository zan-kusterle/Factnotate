<template>
    <div class="rootWrap">
        <slot />
        <div ref="overlayRoot" class="root" width="100%" height="100%">
            <template v-for="({ rectangles, linkedNodes }, index) in quotesWithRectangles">
                <div
                    v-for="{ x, y, width, height } in rectangles"
                    :key="`${index}-${x}-${y}-${width}-${height}`"
                    class="rectangle"
                    :style="{ transform: `translate(${x}px, ${y - 1}px)`, width: `${width}px`, height: `${height + 2}px` }"
                    @mousedown="linkedNodes.length > 0 && $emit('open', linkedNodes[0])"
                    @mouseover="onMouseOver(index)"
                    @mouseout="onMouseOut"
                />
            </template>

            <template v-for="(video, index) in annotationVideos">
                <div
                    :key="`annotation-${index}`"
                    :style="{ transform: `translate(${video.x}px, ${video.y - 120}px)` }"
                    class="videoAnnotationsWrap"
                    @click="$emit('open', annotation)"
                >
                    <div
                        v-for="(annotation, annotationIndex) in video.annotations"
                        :key="`annotation-${index}-${annotationIndex}`"
                        class="videoAnnotation"
                    >
                        <TextSequence :sequence="[{ name: 'post', value: annotation }]" />
                    </div>
                </div>

                <div
                    v-if="video.time > 0"
                    :key="`button-${index}`"
                    class="annotateVideoButton"
                    :style="{ transform: `translate(${video.x}px, ${video.y + 4}px)` }"
                    @click="commentWithText(`> ${video.timeText}\n`, { x: video.x - 1, y: video.y + 5 })"
                >
                    <Icon name="logo" />
                    <!-- @{{ video.timeText }} -->
                </div>
            </template>

            <div v-if="hoveringQuote" :style="{ transform: `translate(${hoveringQuote.x + 4}px, ${hoveringQuote.y + 6}px)` }" class="linkedNodes" @mouseover="onMouseOver(hoveringIndex)" @mouseout="onMouseOut">
                <TextSequence :sequence="hoveringQuote.textSequence" />
                <div v-for="(linkedNode, index) in hoveringQuote.linkedNodes" :key="index" class="linkedNode" @mousedown="$emit('open', linkedNode)">
                    <TextSequence :sequence="[{ name: 'post', value: linkedNode }]" />
                </div>
            </div>

            <div v-if="canAnnotateSelection" :style="{ transform: `translate(${lastSelection.x}px, ${lastSelection.y + 12}px)`, height: '0' }" @mousedown.stop="commentWithText(quotedText, lastSelection)">
                <div class="annotateIcon">
                    <Icon name="logo" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import _ from 'lodash'
import { toRange } from 'dom-anchor-text-quote'
import TextSequence from './TextSequence.vue'
import Icon from './BaseIcon.vue'
import { MAX_SELECTION_LENGTH } from '../constants'

export default {
    components: { TextSequence, Icon },
    props: {
        annotationComments: { type: Array, required: true },
        enableAnnotateButton: { type: Boolean, default: true },
    },
    data () {
        return {
            hoveringIndex: null,

            selection: null,
            lastSelection: null,
            quotedText: null,
            youtubeVideos: [],

            commentPosition: null,
            commentText: null,

            quotesWithRectangles: [],
        }
    },
    computed: {
        textQuotes () {
            const quotesWithContent = this.annotationComments.flatMap(comment => {
                return comment.textSequence.filter(x => x.name === 'quote').map(quote => {
                    return { exact: quote.value.substring(1).trim(), textSequence: comment.textSequence }
                })
            })

            const nestedContentByQuotes = _.groupBy(quotesWithContent, x => x.exact.toLowerCase())

            return Object.keys(nestedContentByQuotes).map(quote => {
                const textSequence = nestedContentByQuotes[quote].flatMap(x => x.textSequence.filter(y => y.name === 'text'))
                const linkedIds = _.uniqBy(nestedContentByQuotes[quote].flatMap(x =>
                    x.textSequence.filter(y => y.name === 'link').map(y => y.value)), x => `${x.author}-${x.permlink}`)
                const linkedNodes = this.$store.getters.getNodes(linkedIds)
                return {
                    exact: nestedContentByQuotes[quote][0].exact,
                    textSequence,
                    linkedNodes,
                }
            }).filter(x => x.textSequence.length > 0 || x.linkedNodes.length > 0)
        },
        annotationVideos () {
            return this.youtubeVideos.map(({ iframe, time, x, y }) => {
                const minutes = Math.floor(time / 60)
                const remainingSeconds = Math.floor(time - minutes * 60)
                const timeText = minutes === 0 ? `${remainingSeconds}s` : `${minutes}:${remainingSeconds.toString().padStart(2, '0')}s`

                const VIDEO_NODE_SHOW_DURATION = 10

                const nodesWithTime = []
                for (const textQuote of this.textQuotes) {
                    if (textQuote.exact) {
                        const parts = textQuote.exact.replace(/s/g, '').split(':')
                        let quoteTime = 0
                        if (parts.length === 1) {
                            const seconds = parseInt(parts[0])
                            quoteTime = isNaN(seconds) ? null : seconds
                        } else if (parts.length === 2) {
                            const minutes = parseInt(parts[0])
                            const seconds = parseInt(parts[1])
                            quoteTime = isNaN(minutes) || isNaN(seconds) ? null : minutes * 60 + seconds
                        }

                        if (quoteTime >= 0) {
                            const delta = time - quoteTime
                            if (delta >= 0 && delta < VIDEO_NODE_SHOW_DURATION) {
                                textQuote.linkedNodes.forEach(node => {
                                    nodesWithTime.push({ delta, node })
                                })
                            }
                        }
                    }
                }
                const annotations = _.sortBy(nodesWithTime, x => x.delta).map(x => x.node).slice(0, 4)

                return { element: iframe, time, timeText, x, y, annotations }
            })
        },
        hoveringQuote () {
            if (this.hoveringIndex === null || this.hoveringIndex >= this.quotesWithRectangles.length) {
                return null
            }

            const { rectangles, linkedNodes, textSequence } = this.quotesWithRectangles[this.hoveringIndex]
            let minX = 800, maxX = 0, maxY = 0
            rectangles.forEach(({ x, y, width, height }) => {
                if (x < minX) minX = x
                if (x + width > maxX) maxX = x + width
                if (y + height > maxY) maxY = y + height
            })

            return {
                textSequence,
                linkedNodes,
                y: maxY,
                x: minX,
                width: maxX - minX,
            }
        },
        selectionPopup () {
            return this.selection || this.lastSelection
        },
        canAnnotateSelection () {
            return this.enableAnnotateButton && this.lastSelection && this.lastSelection.text.length < MAX_SELECTION_LENGTH
        },
    },
    beforeCreate () {
        this.rangesByText = {}

        this.scrollY = 0

        this.youtubeVideoIframes = []
    },
    mounted () {
        const self = this

        let lastTime = Date.now()
        let count = 0
        const requestFrame = () => {
            const now = Date.now()
            if (now - lastTime > 50) {
                if (count >= 10) {
                    count = 0
                    self.onUpdate()
                } else {
                    self.onUpdateSelection()
                    count++
                }
                lastTime = now
            }
            window.requestAnimationFrame(requestFrame)
        }
        this.$nextTick(() => requestFrame())

        const onMouseDown = _.debounce(function () {
            // Popup must prevent mousedown event from propagating to keep lastSelection
            onMouseUp.cancel()
        }, 100)
        const onMouseUp = _.debounce(function () {
            onMouseDown.cancel()
        }, 100)

        window.addEventListener('mousedown', ev => {
            onMouseDown(ev)
        })
        window.addEventListener('mouseup', onMouseUp)

        let lastRange = null // eslint-disable-line
        this.intervalId = setInterval(() => {
            const iframes = [...document.getElementsByTagName('iframe')]
            const videos = [...document.getElementsByTagName('video')] // eslint-disable-line
            const youtubeVideoIframes = iframes.filter(x => x.src.startsWith('https://www.youtube.com') && x.youtubeApi)
            // const allVideos = [...document.getElementsByTagName('video'), ...iframes.flatMap(iframe => iframe.contentWindow.document.getElementsByTagName('video'))]
            this.youtubeVideoIframes = youtubeVideoIframes
        }, 50)

        setInterval(async () => {
            const youtubeVideos = this.youtubeVideoIframes.map(async iframe => {
                const time = await iframe.youtubeApi.getCurrentTime()
                const { bottom, left } = iframe.getBoundingClientRect()
                return { iframe, time, x: left, y: bottom + window.scrollY - 100 }
            })
            this.youtubeVideos = await Promise.all(youtubeVideos)
        }, 500)
    },
    beforeDestroy () {
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
        if (this.outTimeoutId) {
            clearTimeout(this.outTimeoutId)
        }
    },
    methods: {
        onUpdate () {
            function combineRectangles (rectangles) {
                const res = []
                rectangles.filter(r => r.width >= 0 && r.height >= 0).forEach(r => {
                    const sameRowExisting = res.filter(x => x.y === r.y && x.height === r.height)
                    const existingIndex = sameRowExisting.findIndex(er => er.x + er.width >= r.x)
                    if (existingIndex >= 0) {
                        const newToX = r.x + r.width
                        res[existingIndex].width = newToX - res[existingIndex].x
                    } else {
                        res.push(r)
                    }
                })
                return res
            }

            function getRange (scanElement, exact) {
                for (const child of scanElement.children) {
                    if (!['script'].includes(child.tagName.toLowerCase())) {
                        const range = toRange(child, { exact })
                        if (range) {
                            return range
                        }
                    }
                }
                return null
            }

            if (this.$el && this.$refs.overlayRoot) {
                const rect = this.$refs.overlayRoot.getBoundingClientRect()

                const newQuotes = this.textQuotes.map(({ exact, textSequence, linkedNodes }) => {
                    const scanElement = this.$slots.default ? this.$el.parentNode : document.body
                    const range = getRange(scanElement, exact)
                    if (range && typeof range === 'object') {
                        const rectanglesDuplicates = combineRectangles([...range.getClientRects()].map(r => ({ x: Math.floor(r.x - rect.x), y: Math.ceil(r.y - rect.y), width: Math.ceil(r.width), height: r.height })))
                        const rectangles = _.uniqBy(rectanglesDuplicates.filter(x => x.width > 0 && x.height > 0), r => `${r.x}-${r.width}-${r.y}`)
                        if (rectangles.length > 0) {
                            return { exact, textSequence, linkedNodes, rectangles }
                        }
                    }
                    return null
                }).filter(x => x)

                const newQuotesKey = _.sortBy(newQuotes, q => q.exact).map(q => `${q.exact}/${q.rectangles.map(r => `${r.x}-${r.width}-${r.y}`).join(',')}`).join('/')
                if (newQuotesKey !== this.quotesKey) {
                    this.quotesKey = newQuotesKey
                    this.quotesWithRectangles = newQuotes
                }
            }
        },
        onUpdateSelection () {
            if (this.$el && this.$refs.overlayRoot) {
                const rect = this.$refs.overlayRoot.getBoundingClientRect()

                const selection = window.getSelection()
                this.selection = null // Reset selection but not lastSelection
                if (selection && selection.rangeCount > 0) {
                    const text = selection.toString().trim()
                    const selectionRange = selection.getRangeAt(0)
                    if (text.length >= 5 && !selectionRange.collapsed) {
                        const boundingRects = [...selectionRange.getClientRects()]
                        if (boundingRects.length > 0) {
                            const minX = Math.min(...boundingRects.map(x => x.left - rect.x))
                            const maxY = Math.max(...boundingRects.map(x => x.bottom - rect.y))
                            const selectionPosition = { x: minX, y: maxY, text }

                            const newQuotedText = text ? `> ${text}` : ''
                            if (this.quotedText !== newQuotedText) {
                                this.quotedText = newQuotedText
                            }
                            this.lastSelection = selectionPosition
                            this.selection = selectionPosition
                        }
                    }
                }
            }

            if (this.selection === null) {
                if (!this.clearLastSelectionTimeoutId) {
                    this.clearLastSelectionTimeoutId = setTimeout(() => {
                        this.lastSelection = null
                    }, 50)
                }
            } else {
                if (this.clearLastSelectionTimeoutId) {
                    clearTimeout(this.clearLastSelectionTimeoutId)
                    this.clearLastSelectionTimeoutId = null
                }
            }
        },
        onPostAnnotation (text) {
            if (text) {
                this.$emit('annotate', text)
                this.closeComment()
            }
        },
        onMouseOver (index) {
            this.cancelMouseOut()
            this.hoveringIndex = index
        },
        onMouseOut () {
            this.cancelMouseOut()
            this.outTimeoutId = setTimeout(() => {
                this.hoveringIndex = null
                this.outTimeoutId = null
            }, 150)
        },
        cancelMouseOut () {
            if (this.outTimeoutId) {
                clearTimeout(this.outTimeoutId)
                this.outTimeoutId = null
            }
        },
        commentWithText (text) {
            this.$emit('annotate', text)
        },
        closeComment () {
            this.selection = null
            this.lastSelection = null
            this.quotedText = null
        },
    },
}
</script>

<style lang="less">
@import './HighlightsOverlay';
</style>
