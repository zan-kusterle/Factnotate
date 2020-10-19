<template>
    <div :class="$style.root">
        <template v-if="view">
            <template v-if="view.type === 'github'" :class="$style.metadataView">
                <a :href="`https://github.com/${view.text}`" target="_blank">
                    <div :class="$style.platformIcon">
                        <i class="fab fa-github-square" />
                    </div>
                    <span>{{ view.text }}</span>
                </a>
            </template>

            <HighlightsOverlay :annotation-comments="annotationComments" :class="$style.youtubeHighlightsOverlay" @open="onOpen" @annotate="$emit('annotate', $event)">
                <div v-if="view.type === 'youtube'" :class="$style.youtubeWrap">
                    <youtube ref="youtube" :video-id="view.key" :resize="true" :fit-parent="true" @ready="onYoutubeReady"></youtube>
                </div>
                <div v-else-if="view.type === 'pdf'" id="pdfEmbed" ref="pdf" :class="$style.pdfEmbed" />
            </HighlightsOverlay>
        </template>
        <div v-else-if="url">
            <div v-if="readableContent" :class="$style.webpageIframeContainer">
                <HighlightsOverlay :annotation-comments="annotationComments" :class="$style.highlightsOverlay" @open="onOpen" @annotate="$emit('annotate', $event)">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div :class="$style.readabilityWrap" v-html="readableContent.content" />
                </HighlightsOverlay>
            </div>
        </div>
    </div>
</template>

<script>
import PDFObject from 'pdfobject'
import HighlightsOverlay from './HighlightsOverlay.vue'

export default {
    components: { HighlightsOverlay },
    props: {
        url: { type: String, required: true },
        view: { type: Object, default: null },
        annotationComments: { type: Array, default: () => [] },
        readableContent: { type: Object, default: null },
        knownPosts: { type: Array, default: () => [] },
    },
    watch: {
        view: {
            immediate: true,
            handler (v, ov) {
                if (this.view && (!ov || !(this.view.type === ov.type && this.view.key === ov.key))) {
                    if (this.view.type === 'pdf') {
                        this.$nextTick(() => {
                            PDFObject.embed(this.url, '#pdfEmbed', {
                                width: '100%',
                                height: '42rem',
                            })
                        })
                    }
                }
            },
        },
    },
    methods: {
        onOpen (node) {
            this.$router.toId(node.id)
        },
        onYoutubeReady () {
            const iframe = this.$el.getElementsByTagName('iframe')[0]
            iframe.youtubeApi = this.$refs.youtube.player
        },
    },
}
</script>

<style lang="less" module>
@import './common.less';

.webpageIframeContainer {
    border-right: none;
    font-size: 16px;
    box-sizing: border-box;
    margin: 0 auto;
    height: 100%;
    min-height: 300px;
}

@media only screen and (max-width: 1000px) {
    .webpageIframeContainer {
        width: 100%;
    }
}

.metadataView {
    display: flex;
    align-items: center;
    font-size: 18px;

    > a {
        display: flex;
        align-items: center;
    }
}

.platformIcon {
    font-size: 42px;
    margin-right: 10px;
    color: #999;
}

.highlightsOverlay {
    position: relative;
    overflow: hidden;
    z-index: 0;
    padding: 0 4px 30px 4px;
}

.pdfEmbed {
    width: 100%;
}

.youtubeHighlightsOverlay {
    background-color: #000;
}
</style>
