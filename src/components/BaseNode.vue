<template>
    <div :class="{ [$style.root]: true, [$style.root_active]: isActive && parentAuthor }">
        <div :class="$style.mainWrap">
            <div v-if="author && !isWebpage" :class="$style.heading">
                <div :class="$style.user">
                    <router-link :to="$router.idToRoute({ author })" :class="$style.username">
                        {{ author }}
                    </router-link>
                    <span v-if="authorRootChoice" :class="$style.choiceBadge" :style="{ backgroundColor: choiceBadgeColor }">{{ authorRootChoiceText }}</span>
                </div>

                <div :class="$style.circle">
                    •
                </div>

                <el-tooltip :open-delay="400" :enterable="false" effect="dark" :content="formattedDate" placement="top">
                    <router-link :class="$style.timeAgo" :to="$router.idToRoute({ author, permlink })">
                        <template v-if="verbWord">
                            {{ verbWord }}
                        </template>
                        {{ timeAgo }}
                    </router-link>
                </el-tooltip>

                <div v-if="!parentAuthor && hideCommentingActions" :class="$style.tagsWrap">
                    <router-link v-for="tag in tagsWithoutRoot" :key="tag" :to="$router.idToRoute({ permlink: tag })">
                        #{{ tag }}
                    </router-link>
                </div>
            </div>
            <div v-if="isWebpage" :class="$style.contentWrap" @mousedown="onTextSequenceClick">
                <TextSequence ref="content" :sequence="richTextSequence" />
            </div>
            <template v-else-if="isContentShown">
                <div :class="$style.resultsAbsoluteWrap">
                    <el-popover placement="bottom-start" width="300" trigger="click">
                        <div v-if="results.unit" slot="reference" :class="$style.results" :style="{ backgroundColor: resultsColor }">
                            <template v-if="!resultsText">
                                No votes yet
                            </template>
                            <template v-else>
                                {{ resultsText }}
                            </template>
                        </div>

                        <div :class="$style.resultsPopover">
                            <div v-if="ownChoiceText" key="d" :class="$style.ownChoiceWrap">
                                <span>Your current vote is <b>{{ ownChoiceText }}</b></span>
                                <div :class="$style.deleteIcon" @click="onChooseChoice(null)">
                                    <i class="fas fa-trash" />
                                </div>
                            </div>

                            <div :class="$style.voteWrap">
                                <ChoiceSelect v-if="results.unit" :type="results.unit.isSpectrum ? 'spectrum' : 'estimate'" :short-unit="results.unit.short" :class="$style.choiceSelect" @choose="onChooseChoice" />
                            </div>
                            <div v-if="!results.choiceVoteNodes || results.choiceVoteNodes.length === 0" :class="$style.noVotes">
                                Be the first one to vote!
                            </div>
                            <template v-else>
                                <div>
                                    <div :class="$style.distributionBars">
                                        <el-tooltip v-for="(lineSegment, index) in lineSegments" :key="index" :open-delay="0" :enterable="false" effect="dark" :content="`${lineSegment.count} (${(lineSegment.ratio * 100).toFixed(1)}%)`" placement="top">
                                            <div :class="$style.lineSection" :style="{ height: `${(lineSegment.ratio * 100).toFixed(2)}%`, backgroundColor: lineSegment.bgColor }" />
                                        </el-tooltip>
                                    </div>
                                </div>

                                <div :class="$style.viewComments" @click="$root.$emit('results', { author, permlink })">
                                    View comments
                                </div>
                            </template>
                        </div>
                    </el-popover>
                </div>
                <div :class="$style.contentWrap" :style="results.unit ? { fontWeight: 'bold' } : {}" @mousedown="onTextSequenceClick">
                    <div v-if="results.unit" :class="$style.resultsRectangle" />
                    <TextSequence ref="content" :sequence="richTextSequence" :class="$style.content" />
                </div>
            </template>
            <div v-else :class="$style.postTooLong" @click="showAnyway = true">
                Content is hidden because it is not compatible with Factnotate. Click to show anyway.
            </div>
        </div>
        <div v-if="isPending" :class="$style.actions">
            Post on Steem
        </div>
        <div v-else :class="$style.actions">
            <div :class="$style.relevanceResults">
                <div :class="$style.thumbsRow">
                    <div :id="`upvote-${author}-${permlink}`" @click="onVote(1)">
                        <span v-if="ownVote && ownVote.ratio > 0" key="01" :class="$style.upvote"><i class="fas fa-thumbs-up" /></span>
                        <span v-else key="02" :class="$style.upvote"><i class="far fa-thumbs-up" /></span>
                        {{ rshares.positive }}
                    </div>

                    <div :name="`downvote-${author}-${permlink}`" @click="onVote(-1)">
                        {{ rshares.negative }}
                        <span v-if="ownVote && ownVote.ratio < 0" key="01" :class="$style.downvote"><i class="fas fa-thumbs-down" /></span>
                        <span v-else key="02" :class="$style.downvote"><i class="far fa-thumbs-down" /></span>
                    </div>
                </div>
                <div :class="$style.relevanceRatioBar">
                    <div v-if="rshares.total > 0" :style="{ width: `${rshares.positive / rshares.total * 100}%` }" :class="$style.ratioBar">
                </div>
            </div>

            <div :class="$style.rightActions">
                <slot />

                <a v-if="isWebpage" :href="text" target="_blank">
                    <i class="fas fa-external-link-square" />
                </a>
            </div>
        </div>

        <div v-if="annotateText">
            {{ annotateText }}
        </div>
    </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { getText, getResultsColor } from '../store/nodes/map_results'
import { APP_NAME } from '../constants'
import { fromString } from '../comment_ids'
import moment from 'moment'
import { getUnitChoiceText, parseToken } from '../store/nodes'
import ChoiceSelect from './ChoiceSelect.vue'

export default {
    name: 'Node',
    components: { ChoiceSelect },
    inheritAttrs: false,
    props: {
        authorReputation: { type: Number, default: null },
        childrenCount: { type: Number, default: 0 },
        createdAtUnix: { type: Number, default: 0 },
        author: { type: [String, Boolean], default: null },
        permlink: { type: String, default: null },
        parentAuthor: { type: String, default: null },
        tags: { type: Array, default: () => [] },
        text: { type: String, required: true },
        textSequence: { type: Array, required: true },
        votes: { type: Array, default: () => [] },
        ownVote: { type: Object, default: null },
        results: { type: Object, default: null },

        isActive: { type: Boolean, default: false },
        verbWord: { type: String, default: null },
        hideCommentingActions: { type: Boolean, default: false },
        isPending: { type: Boolean, default: false },
    },
    data () {
        return {
            showAnyway: false,
            timeAgo: moment.unix(this.createdAtUnix).fromNow(),
        }
    },
    computed: {
        ...mapGetters([
            'commentingOn',
            'commentText',
            'commentTextSequence',
            'units',
            'rootNode',
            'knownPosts',
            'username',
            'getNode',
        ]),
        isCommenting () {
            return !this.hideCommentingActions && this.commentingOn && this.commentingOn.author === this.author && this.commentingOn.permlink === this.permlink
        },
        ownChoiceVote () {
            return this.username && this.results.choiceVoteNodes ? this.results.choiceVoteNodes.find(n => n.author === this.username) : null
        },
        ownChoiceText () {
            return this.results.unit && this.ownChoiceVote && this.ownChoiceVote.choiceValue ? getUnitChoiceText(this.ownChoiceVote.choiceValue, this.results.unit, true) : null
        },
        annotateText () {
            if (this.commentingOn === null && this.commentTextSequence.length === 1 && this.commentTextSequence[0].name === 'quote') {
                return `Annotate at ${this.commentTextSequence[0].value}`
            }
            return null
        },
        rshares () {
            const total = this.votes.reduce((r, x) => r + Math.abs(x.rshares), 0)
            if (total === 0) return { total, positive: 0, negative: 0 }
            // TODO: Revert
            // const positive = Math.ceil(this.votes.filter(x => x.ratio > 0).reduce((r, x) => r + x.rshares, 0) / total * this.votes.length)
            // const negative = Math.ceil(this.votes.filter(x => x.ratio < 0).reduce((r, x) => r - x.rshares, 0) / total * this.votes.length)
            return { total, positive: this.votes.filter(x => x.ratio > 0).length, negative: this.votes.filter(x => x.ratio < 0).length }
        },
        authorRootChoice () {
            return this.rootNode.results && this.rootNode.results.choiceVoteNodes && this.rootNode.results.choiceVoteNodes.find(x => x.author === this.author)
        },
        tagsWithoutRoot () {
            return this.tags ? this.tags.filter(x => x !== APP_NAME) : []
        },
        formattedDate () {
            return `${this.verbWord ? this.verbWord.charAt(0).toUpperCase() + this.verbWord.substring(1) + ' on' : ''}${moment.unix(this.createdAtUnix).format('LLL')}`
        },
        isContentShown () {
            return this.showAnyway || this.text.length <= 2000
        },
        isWebpage () {
            return parseToken(this.text).name === 'webpage'
        },
        richTextSequence () {
            return this.textSequence.map(segment => {
                if (segment.name === 'link') {
                    const linkedPost = this.getNode(segment.value)
                    if (linkedPost) {
                        return { name: 'post', value: linkedPost }
                    }
                }
                return segment
            })
        },
        hasResults () {
            return this.results && (this.results.mean || this.results.mean === 0)
        },
        resultsText () {
            return this.hasResults ? getText(this.results.mean, this.results.unit) : null
        },
        resultsColor () {
            if (this.hasResults && this.results.unit.isSpectrum)
                return getResultsColor(this.results.mean)
            return null
        },
        lineSegments () {
            if (!this.hasResults) return []
            return this.results.percentiles.map(percentile => {
                const count = percentile.voteNodes.length
                const ratio = (percentile.totalRshares + count) / (this.results.totalRshares + this.results.choiceVoteNodes.length)
                let bgColor = '#333'
                if (this.results.unit.isSpectrum)
                    bgColor = getResultsColor(percentile.index / this.results.percentiles.length)
                return { ratio, count, bgColor }
            })
        },
        authorRootChoiceText () {
            return getUnitChoiceText(this.authorRootChoice.choiceValue, this.rootNode.unit, true)
        },
        choiceBadgeColor () {
            if (this.rootNode && this.rootNode.results && this.rootNode.results.unit.isSpectrum) {
                return getResultsColor(this.authorRootChoice.choiceValue)
            } else {
                return '#ddd'
            }
        },
    },
    created () {
        this.intervalId = setInterval(() => {
            const timeAgo = moment.unix(this.createdAtUnix).fromNow()
            if (this.timeAgo !== timeAgo) {
                this.timeAgo = timeAgo
            }
        }, 5000)
    },
    beforeDestroy () {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
    },
    methods: {
        ...mapActions([
            'startCommenting',
            'closeComment',
        ]),
        onVote (ratio) {
            this.$emit('vote', { author: this.author, permlink: this.permlink, ratio })
        },
        onChooseChoice (choice) {
            if (this.results.unit) {
                this.$emit('choose', { author: this.author, permlink: this.permlink, unit: this.results.unit, choice })
            }
        },
        onTextSequenceClick (ev) {
            const getPostKey = el => {
                if (!el || !el.getAttribute) {
                    return null
                }
                const key = el.getAttribute('post-key')
                if (!key) {
                    return getPostKey(el.parentNode)
                }
                return key
            }

            const key = getPostKey(ev.target)
            if (key) {
                this.$emit('view', fromString(key))
            } else {
                this.$emit('view', { author: this.author, permlink: this.permlink })
            }
            ev.stopPropagation()
            ev.preventDefault()
        },
    },
}
</script>

<style lang="less" module>
@import './common';

.root {
    padding: 10px;

    &_active {
        // adjust only blue because red and green colors are not neutral
        background-color: #d2dfe4;
    }

    &:hover, &:active {
        .relevanceResults {
            opacity: 1;
        }
    }
}

.mainWrap {
    width: 100%;
}

.contentWrap {
    .readabilityWrap();
    display: inline;
    cursor: pointer;
    min-height: 22px;

    p {
        display: inline;
    }

    &_withResults {
        display: flex;
        align-items: center;
    }
}

.results {
    margin-right: 10px;
    user-select: none;
    cursor: pointer;
    position: relative;
    width: 110px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    font-size: 12px;
    background-color: @base-results-bg-color;
}

.content {
    margin: 10px 0;
    display: inline-block !important;
    width: 100%;
}

.actions {
    display: flex;
    font-size: 14px;
    margin-top: 6px;
    justify-content: space-between;
    align-items: center;

    > div {
        cursor: pointer;
        margin-bottom: 4px;
        display: flex;

        > span {
            cursor: pointer;
            margin-bottom: 2px;
        }
    }
}

.rightActions {
    > * {
        margin-left: 8px;
    }
}

.heading {
    font-size: 14px;
    display: flex;
    align-items: center;
    color: #000;
    transition: opacity 300ms ease;
    user-select: none;
    margin-bottom: 5px;
}

.username {
    font-weight: bold;
    color: #000c;
    cursor: pointer;
}

.circle {
    margin: 0 10px;
    color: #0008;
}

.user {
    display: flex;
    align-items: center;
}

.timeAgo {
    color: #0008;
    white-space: nowrap;
}

.postTooLong {
    font-size: 12px;
    cursor: default;

    > a {
        font-weight: bold;
    }
}

.tagsWrap {
    display: flex;
    margin-left: 10px;
    font-size: 13px;
    line-height: 14px;
    padding: 1px 0 3px 0;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;

    > a {
        margin-left: 6px;
    }
}

.resultsPopover {
    padding: 10px;
}

.voteWrap {
    display: flex;
    align-items: center;
}

.deleteIcon {
    display: inline-flex;
    margin-left: 10px;
}

.distributionView {
    background: @base-results-bg-color;
    min-height: 36px;
    display: flex;
    align-items: center;
    width: 100%;

    > div {
        width: 100%;
    }
}

.distributionBars {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    height: 20px;
    border-bottom: 1px solid #ddd;
    margin-bottom: 1px;
}

.lineSection {
    font-size: 10px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 14px;
    overflow: hidden;
    outline: none;

    &:hover {
        opacity: 0.7;
    }
}

.resultsRectangle {
    width: 110px;
    height: 18px;
    margin-right: 4px;
    margin-bottom: 2px;
    float: left;
}

.resultsAbsoluteWrap {
    position: absolute;
}

.viewComments {
    font-size: 11px;
    color: #999;
    margin-top: 20px;
    text-align: center;
    cursor: pointer;
}

.choiceBadge {
    margin-left: 8px;
    padding: 0 4px;
    text-align: center;
    font-size: 12px;
    line-height: 16px;
}

.relevanceResults {
    display: inline-flex;
    font-size: 13px;
    flex-direction: column;
    transition: opacity 200ms ease-out;
}

.thumbsRow {
    display: flex;
    justify-content: space-between;

    > div {
        cursor: pointer;
    }
}

.relevanceRatioBar {
    display: flex;
    width: 80px;
    background-color: #ca0404;
    border-radius: 1px;
    height: 3px;

    > div {
        height: 100%;
        border-radius: 1px;
    }
}

.ratioBar {
    background-color: #56bb56;
}

.noVotes {
    text-align: center;
    margin-top: 10px;
    font-size: 16px;
}

.upvote {
    transform: translateY(-1px);
}

.downvote {
    transform: scaleX(-1) translateY(1px);
}
</style>
