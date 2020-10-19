<template>
    <div>
        <el-dialog title="Linking comments" :visible.sync="isLinksDialogOpen" :class="$style.dialog">
            <Node
                v-bind="post"
                :hide-commenting-actions="true"
                :class="$style.mainNode"
            />

            <Tree :ids="linkDialogIds" :class="$style.linksTree" @comment="onReply" @view="$emit('view', $event)" />
        </el-dialog>

        <div :class="[$style.columns, $style[`columns_${columnsView}`]]">
            <template v-if="columnsView === 'links'">
                <div>
                    <div :class="$style.commentsHeading">
                        <div :class="$style.linksIcon">
                            <i class="fas fa-poll" />
                        </div>
                    </div>
                </div>
                <div :class="$style.commentsColumn">
                    <div :class="$style.commentsHeading">
                        <div :class="$style.linksIcon">
                            <i class="fas fa-spider-web" />
                        </div>
                    </div>
                </div>
                <div>
                    <div :class="$style.commentsHeading">
                        <div :class="$style.linksIcon">
                            <i class="fas fa-comments" />
                        </div>
                    </div>
                </div>
            </template>
            <template v-else-if="columnsView === 'choice'">
                <div>
                    <div :class="$style.commentsHeading">
                        <div :class="$style.linksIcon">
                            <i class="fas fa-comment-exclamation" />
                        </div>
                    </div>
                </div>
                <div>
                    <div :class="$style.commentsHeading">
                        <div :class="$style.linksIcon">
                            <i class="fas fa-comment-smile" />
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <div :class="[$style.columns, $style[`columns_${columnsView}`]]">
            <template v-if="columnsView === 'links'">
                <div>
                    <div v-if="post.permlink" :class="$style.createNewItem">
                        <!-- <div>
                            <div v-for="(text, index) in activeTags" :key="text" :class="$style.tagWrap" @click="activeTags.splice(index, 1)">
                                <div :class="$style.tag">
                                    <span>{{ text }}</span>
                                    <i class="fas fa-times" />
                                </div>
                            </div>
                            <el-input v-if="post.isTag" v-model="newTag" :class="$style.newTag" size="mini" suffix-icon="fas fa-tag" placeholder="Add tag" @keydown.enter.native.stop="addTag" @blur="addTag" />
                        </div> -->

                        <el-select slot="prepend" ref="unitSelect" v-model="unit" popper-append-to-body :class="$style.unitSelect" size="mini" placeholder="Select unit">
                            <el-option-group v-for="group in unitGroups" :key="group.label" :label="group.label">
                                <el-option v-for="unitItem in group.options" :key="unitItem" :value="unitItem">
                                    &nbsp;{{ unitItem }}
                                </el-option>
                            </el-option-group>
                        </el-select>

                        <el-input ref="pollInput" v-model="pollTitle" :class="$style.titleInput" size="small" placeholder="Enter any estimatable claim or quantity" @keydown.enter.native="onPostPoll">
                            <slot slot="suffix" name="suffix" />
                        </el-input>

                        <div v-if="pollError" :class="$style.error">
                            {{ pollError }}
                        </div>
                    </div>
                    <div v-if="childrenByType.poll.length === 0" :class="$style.noItemsBox">
                        No polls yet.
                    </div>

                    <Tree :class="$style.tree" :ids="childrenByType.poll" :collapse-after-depth="0" @results="resultsDialogCommentId = $event" @vote="onVote" @choose="onChooseChoice" @comment="onReply" @view="$emit('view', $event)">
                        <div
                            v-if="getLinkIds({ parentAuthor: parentNode ? parentNode.author : post.author, parentPermlink: parentNode ? parentNode.permlink : post.permlink, author: node.author, permlink: node.permlink }).length > 0"
                            slot-scope="{ parentNode, node }"
                            @click="linksDialogComment = { parentAuthor: parentNode ? parentNode.author : post.author, parentPermlink: parentNode ? parentNode.permlink : post.permlink, author: node.author, permlink: node.permlink }"
                        >
                            <i class="fas fa-link" />
                        </div>
                    </Tree>
                </div>

                <div :class="$style.commentsColumn">
                    <div v-if="post.permlink" :class="$style.createNewItem">
                        <el-input ref="urlInput" v-model="title" :class="$style.titleInput" size="small" placeholder="Paste any URL to add a source" @keyup.native.enter="onPostUrlSource">
                            <slot slot="suffix" name="suffix" />
                        </el-input>
                        <div v-if="sourceError" :class="$style.error">
                            {{ sourceError }}
                        </div>
                    </div>

                    <div v-if="childrenByType.webpage.length === 0" :class="$style.noItemsBox">
                        No external sources yet.
                    </div>
                    <Tree v-else ref="commentsTree" :class="$style.landingContent" :ids="childrenByType.webpage" :enable-commenting="true" :collapse-after-depth="1" @results="resultsDialogCommentId = $event" @vote="onVote" @choose="onChooseChoice" @comment="onReply" @view="$emit('view', $event)" />
                </div>

                <div>
                    <div v-if="post.permlink" :class="$style.createNewItem">
                        <el-input ref="plainInput" v-model="plainText" :class="$style.titleInput" type="textarea" size="small" placeholder="Write a comment" />
                        <el-button size="small" type="primary" @click="onPostPlain">
                            Post
                        </el-button>
                    </div>
                    <div v-if="childrenByType.plain.length === 0" :class="$style.noItemsBox">
                        Be the first one to comment.
                    </div>
                    <Tree v-else :ids="childrenByType.plain" :class="$style.landingContent" @comment="onReply" @view="$emit('view', $event)" />
                </div>
            </template>
            <template v-else-if="columnsView === 'choice'">
                <div>
                    <div v-if="columns.disagree.length === 0" :class="$style.noItemsBox">
                        No commenters that disagree.
                    </div>

                    <Tree :class="$style.tree" :ids="columns.disagree" :collapse-after-depth="0" @results="resultsDialogCommentId = $event" @vote="onVote" @choose="onChooseChoice" @comment="onReply" @view="$emit('view', $event)" />
                </div>

                <div>
                    <div v-if="columns.agree.length === 0" :class="$style.noItemsBox">
                        No commenters that agree.
                    </div>

                    <Tree :class="$style.tree" :ids="columns.agree" :collapse-after-depth="0" @results="resultsDialogCommentId = $event" @vote="onVote" @choose="onChooseChoice" @comment="onReply" @view="$emit('view', $event)" />
                </div>
            </template>
        </div>

        <div v-if="post.linkedByIds.length > 0">
            <Tree :ids="post.linkedByIds" :class="$style.landingContent" @comment="onReply" @view="$emit('view', $event)" />
        </div>

        <div v-if="otherSources.length > 0" :class="$style.externalSources">
            <span>Also found on:</span>
            <a v-for="source in otherSources" :key="source.name" :href="source.url" :class="$style.externalSource" target="_blank">
                <b>{{ source.name }}</b>
                <img :src="`/sources/${source.icon}`" :class="$style.externalSourceIcon">
            </a>
        </div>

        <div v-if="post.commonPrefixPosts.length > 0" :class="$style.mainRoot">
            <div :class="$style.linksIcon">
                <i class="far fa-spider-web" />
            </div>
            <Tree :ids="post.commonPrefixPosts" :class="$style.landingContent" @comment="onReply" @view="$emit('view', $event)" />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { externalSources, spectrumUnits, quantityUnits } from '../constants'
import { eq } from '../comment_ids'
import Tree from './BaseTree.vue'
import Node from './BaseNode.vue'

export default {
    components: { Tree, Node },
    props: {
        post: { type: Object, required: true },
    },
    data () {
        return {
            linksDialogComment: null,
            areCommentGuidelinesHidden: localStorage.getItem('commentGuidelinesHidden') === '1',
            columnsView: 'links', // links, choice
            unit: null,
            activeTags: [],
            newTag: '',
            ownChoice: null,
            title: '',
            sourceError: null,
            pollTitle: '',
            pollError: null,
        }
    },
    computed: {
        ...mapGetters([
            'getNode',
            'getNodes',
            'isSortAscending',
            'linkablePosts',
            'postCommentText',
            'transformSteemUrl',
        ]),
        isLinksDialogOpen: {
            get () {
                return this.linksDialogComment !== null
            },
            set (v) {
                if (!v) {
                    this.linksDialogComment = null
                }
            },
        },
        plainText: {
            get () {
                return this.postCommentText
            },
            set (v) {
                this.setPostCommentText(v)
            },
        },
        columns () {
            if (this.columnsView === 'links') {
                return {
                    links: this.post.linkedNodes,
                    comments: this.post.visibleChildrenIds,
                    linkedBy: this.post.linkedByIds,
                }
            } else if (this.columnsView === 'choice') {
                const agree = [], disagree = []
                this.post.linkedNodes.concat(this.post.visibleChildrenIds).forEach(({ author, permlink }) => {
                    const authorChoiceComment = this.post.results && this.post.results.choiceVoteNodes && this.post.results.choiceVoteNodes.find(x => x.author === author)
                    if (authorChoiceComment) {
                        if (authorChoiceComment.choiceValue < 0.5) {
                            disagree.push({ author, permlink })
                        } else {
                            agree.push({ author, permlink })
                        }
                    }
                })
                return { agree, disagree }
            }
            return null
        },
        otherSources () {
            const isRootNodeWebpage = this.rootNode && this.rootNode.isWebpage ? new URL(this.rootNode.text).pathname.trim().length > 1 : false
            const hasWebpageContent = this.rootNode && (this.rootNode.author || this.rootNode.isWebpage) && this.rootNode.permlink && isRootNodeWebpage && !this.rootNode.parentAuthor
            if (this.rootNode && hasWebpageContent) {
                const sources = this.rootNode.readableContent && this.rootNode.readableContent.sources
                if (sources) {
                    return Object.keys(sources).map(id => {
                        const sourceData = externalSources[id]
                        return { id, name: sourceData ? sourceData.name : id, icon: sourceData ? sourceData.icon : `${id}.png`, url: sources[id] }
                    }).filter(x => x.url)
                }
            }
            return []
        },
        linkDialogIds () {
            return this.linksDialogComment ? this.getLinkIds(this.linksDialogComment) : []
        },
        childrenByType () {
            const getType = comment => {
                if (comment.results && comment.results.unit) {
                    return 'poll'
                } else if (comment.isWebpage) {
                    return 'webpage'
                } else if (typeof comment.choiceValue === 'undefined' && comment.linkedIds.length === 0 && !comment.textSequence.some(x => x.name === 'link')) {
                    return 'plain'
                } else {
                    return 'hidden'
                }
            }

            const res = { poll: [], webpage: [], plain: [], hidden: [] }
            this.post.children.forEach(comment => {
                res[getType(comment)].push(comment)
            })
            return res
        },
    },
    beforeCreate () {
        this.unitGroups = [{ label: 'Spectrum', options: spectrumUnits }, { label: 'Estimate', options: quantityUnits }]
    },
    methods: {
        ...mapActions([
            'setPostCommentText',
        ]),
        focusPlainComment () {
            this.$refs.plainInput.focus()
        },
        expandNode (key) {
            if (this.$refs.commentsTree) {
                this.$refs.commentsTree.expandNode(key)
            }
        },
        hideCommentGuidelines () {
            this.areCommentGuidelinesHidden = true
            localStorage.setItem('commentGuidelinesHidden', '1')
        },
        onReply ({ parentAuthor, parentPermlink, text }) {
            this.$emit('comment', { parentAuthor, parentPermlink, text })
        },
        onVote ({ author, permlink, ratio }) {
            this.$emit('vote', { author, permlink, ratio })
        },
        onChooseChoice ({ author, permlink, unit, choice }) {
            this.$emit('choose', { author, permlink, unit, choice })
        },
        onPostUrlSource () {
            const title = this.title.trim()
            if (title.startsWith('http://') || title.startsWith('https://')) {
                if (title.indexOf(' ') === -1) {
                    this.$emit('comment', { parentAuthor: this.post.author, parentPermlink: this.post.permlink, text: this.transformSteemUrl(title) })
                    this.title = ''
                    this.sourceError = null
                } else {
                    this.sourceError = 'URLs must contain no spaces'
                }
            } else {
                this.sourceError = 'URLs must begin with https:// or http://'
            }
        },
        onPostPoll () {
            const title = this.pollTitle.trim()
            if (title.length > 3) {
                if (this.unit) {
                    const metadata = { unit: this.unit, tags: this.activeTags }
                    this.$emit('comment', { parentAuthor: this.post.author, parentPermlink: this.post.permlink, text: title, metadata })
                    this.unit = null
                    this.activeTags = []
                    this.pollTitle = ''
                    this.pollError = null
                } else {
                    this.pollError = 'Choose the unit'
                }
            } else {
                this.pollError = 'Enter a claim or estimatable quantity'
            }
        },
        onPostPlain () {
            const text = this.plainText.trim()
            this.$emit('comment', { parentAuthor: this.post.author, parentPermlink: this.post.permlink, text })
            this.plainText = ''
        },
        getLinkIds ({ parentAuthor, parentPermlink, author, permlink }) {
            const parent = this.getNode({ author: parentAuthor, permlink: parentPermlink })
            if (!parent) {
                return []
            }
            return this.getNodes(parent.childrenIds).filter(x =>
                x.textSequence.some(y => y.name === 'link' && eq(y.value, { author, permlink })))
        },
        addTag () {
            const cleanText = this.newTag.trim()
            if (cleanText.length > 0) {
                if (!this.activeTags.includes(cleanText)) {
                    this.activeTags.push(cleanText)
                }
                this.newTag = ''
            }
        },
    },
}
</script>

<style lang="less" module>
@import './common';

.createNewItem {
    width: 100%;
    background-color: #eee;
    margin-bottom: 16px;
    padding: 8px;
    box-sizing: border-box;

    & > div:not(:last-child) {
        margin-bottom: 4px;
    }
}

.mainRoot {
    width: calc(~'50% - 90px');
    margin: 0 auto;
    margin-top: 40px;
}
.mainWrap {
	width: 100%;
    display: flex;
    align-items: center;
}

.mainPost {
    .mainWrap();
    .landingContent();
    margin-top: 0;
}

.mainLoading {
    .mainWrap();
    margin-top: 20px;
    .loadingBg();
    height: 80px;
}

.landingContent {
    background-color: #eee;
    margin-bottom: 10px;
    width: 100%;
    box-sizing: border-box;
}

.mainNode {
    .landingContent();
    margin-bottom: 30px;
    width: 80%;
    margin-left: auto;
}

.linksTree {
}

.comment {
    background-color: #eee;
    margin-top: 0px;
    margin-bottom: 20px;
}

.columns {
    width: 90%;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    flex-wrap: wrap;

    &_links {
        > div {
            width: 31%;
        }
    }

    &_choice {
        > div {
            width: 49%;
        }
    }
}

.sorts {
    margin: 0 68px + 10px 0 68px;
    font-size: 13px;
    line-height: 18px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sort {
	cursor: pointer;
    color: #666;
    display: inline-block;

	&:hover {
		color: black;
	}

	&_active {
		color: black;
        text-decoration: underline;
	}
}

.linksIcon {
    opacity: 0.8;
    font-size: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.linksArrow {
    font-size: 20px;
    margin-left: 16px;
}

.commentsHeading {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
}

.externalSources {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 14px;
    margin-top: 20px;
    width: 100% !important;
}

.externalSource {
    display: flex;
    align-items: center;
    margin-left: 12px;
    background-color: #eee;
    padding: 4px 8px;
    cursor: pointer;

    &:hover {
        background-color: #ddd;
    }
}

.externalSourceIcon {
    width: 20px;
    margin-left: 8px;
}

.views {
    display: flex;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;

    > div {
        margin: 0 10px;
    }
}

.firstRow {
    display: flex;
    margin-bottom: 20px;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
}

.sortCurrentItem {
    cursor: pointer;
}

.guidelinesButton {
    cursor: default;
    outline: none;
    font-size: 11px;
    color: #666;
}

.guidelinesWrap {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    border: 1px solid transparent;
    width: 100%;
}

.guidelines {
    font-size: 11px;
    color: #666;
    padding: 10px 20px;
}
.guidelines > b {
    font-weight: normal;
    font-size: 16px;
    color: #333;
    text-decoration: underline;
    margin-bottom: 5px;
    display: block;
}

.noItemsBox {
    .mainPost();
    justify-content: center;
    height: 86px;
}

.error {
    color: #c00;
    font-size: 13px;
    margin: 2px;
}

.tagWrap {
    display: inline-block;
    padding: 3px 6px;
    margin-right: 10px;
    background-color: #bbb;
}

.tag {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}
.tag:hover > i {
    color: @almost-black;
}

.tag > span {
    font-size: 12px;
    line-height: 12px;
}

.tag > i {
    color: @medium-gray;
    margin-left: 4px;
    font-size: 10px;
}

.newTag {
    width: 150px;
}

@media only screen and (max-width: 1000px) {
    .mainRoot, .comment {
        width: 100%;
    }

    .columns {
        > div {
            width: 100%;
        }
    }
}
</style>
