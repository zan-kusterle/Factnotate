<template>
    <Sandbox v-if="$route.name === 'Sandbox'" />
    <div v-else id="app" :class="$style.root">
        <div id="youtubePlayer" />

        <div v-if="quickViewNode" :class="[$style.quickView, { [$style.quickView_mini]: quickViewNode.view }]" @click="onCloseQuickView">
            <div :class="[$style.quickViewContent, { [$style.quickViewContent_loading]: !quickViewNode.readableContent }]" @click.stop>
                <webpage-content
                    v-if="quickViewNode.readableContent"
                    :url="quickViewNode.text"
                    :known-posts="knownPosts"
                    :annotation-comments="quickViewNode.annotationComments"
                    :view="quickViewNode.view"
                    :readable-content="quickViewNode.readableContent"
                    @annotate="onAnnotate"
                />
            </div>
        </div>

        <el-dialog v-if="resultsDialogNode" title="Average choice" :visible.sync="isResultsDialogOpen" :class="$style.dialog">
            <Tree :ids="resultsDialogComments" :class="$style.landingContent" @comment="onReply" @view="onView" />
        </el-dialog>

        <Header />

        <div v-if="!rootNode" :class="$style.mainRoot">
            <div key="loading" :class="$style.mainLoading" />
        </div>
        <template v-else>
            <div v-if="rootNode.author && rootNode.permlink" :key="rootNode.key" :class="$style.mainPostWrap">
                <router-link v-if="rootPost" :to="$router.idToRoute(rootPost)" :class="$style.viewPost">
                    View in context
                </router-link>
                <Node
                    v-bind="rootNode"
                    :hide-commenting-actions="true"
                    :class="$style.mainNode"
                    @vote="onVote"
                    @choose="onChooseChoice"
                    @view="onView(true)"
                />
            </div>
            <div v-else :key="`a-${rootNode.key}`" :class="$style.mainPostWrap">
                <div :class="$style.mainNode">
                    {{ rootNode.key }}
                </div>
            </div>

            <comments
                ref="comments"
                :key="`comments-${rootNode.key}`"
                :post="rootNode"
                @vote="onVote"
                @comment="onReply"
                @choose="onChooseChoice"
                @view="onView"
            />
        </template>
    </div>
</template>

<script>
/* globals GUN_URLS */
import { mapGetters, mapActions } from 'vuex'
import Header from './Header.vue'
import Node from './BaseNode.vue'
import Tree from './BaseTree.vue'
import WebpageContent from './WebpageContent.vue'
import { APP_NAME } from '../constants'
import { eq } from '../comment_ids'
import Comments from './Comments.vue'
import Sandbox from './Sandbox'

const getViewItem = route => {
    if (route.name === 'Home') {
        return { permlink: APP_NAME }
    } else if (route.name === 'Item') {
        const { author, permlink } = route.params
        if (author && permlink) {
            return { author, permlink }
        }
    } else if (route.name === 'ItemQuery') {
        const permlinkOrAuthor = (route.params.permlinkOrAuthor || '').trim()
        if (permlinkOrAuthor.length > 0) {
            if (permlinkOrAuthor.startsWith('@')) {
                return { author: permlinkOrAuthor.substring(1), permlink: null }
            } else {
                return { author: null, permlink: permlinkOrAuthor }
            }
        }
    } else if (route.name === 'ItemTitleQuote') {
        let title = route.params.title
        while (title.endsWith('/')) {
            title = title.substring(0, title.length - 1)
        }
        return { title }
    }
}

export default {
    components: { Sandbox, WebpageContent, Comments, Header, Node, Tree },
    data () {
        return {
            resultsDialogCommentId: null,
            scrollHeight: 0,
            quickViewId: null,
        }
    },
    computed: {
        ...mapGetters([
            'rootNode',
            'rootPost',
            'getNode',
            'getNodes',
            'knownPosts',
            'repliesSort',
            'postsSort',
            'postCommentText',
            'maxPostLength',
        ]),
        isResultsDialogOpen: {
            get () {
                return this.resultsDialogCommentId !== null
            },
            set (v) {
                if (!v) {
                    this.resultsDialogCommentId = null
                }
            },
        },
        linkedByIds () {
            return this.rootNode ? this.rootNode.linkedByIds : []
        },
        resultsDialogNode () {
            return this.resultsDialogCommentId ? this.getNode(this.resultsDialogCommentId) : null
        },
        resultsDialogComments () {
            if (this.resultsDialogNode) {
                return this.resultsDialogNode.results.choiceVoteNodes
            }
            return []
        },
        quickViewNode () {
            if (this.quickViewId) {
                const res = this.quickViewId === true ? this.rootNode : this.getNode(this.quickViewId)
                if (res) {
                    res.annotationComments = this.getNodes(res.childrenIds).filter(x => x.textSequence.some(y => y.name === 'quote'))
                    return res
                }
            }
            return null
        },
    },
    watch: {
        '$route': {
            immediate: true,
            handler (v, ov) {
                if (this.$route.name !== 'Sandbox') {
                    const viewItem = getViewItem(v)
                    if (!ov || !eq(viewItem, getViewItem(ov))) {
                        if (!v.params.isQuick) {
                            this.setViewItem(viewItem)
                            this.onCloseQuickView()
                        }
                    }

                    if (v.name === 'ItemTitleQuote') {
                        const text = v.params.text
                        if (text) {
                            setTimeout(() => {
                                this.onAnnotate(text)
                            }, 200)
                        }
                    }
                }
            },
        },
        rootNode (v) {
            if (v && v.author && v.author !== true && v.permlink && this.$route.name === 'ItemTitleQuote') {
                this.$router.replace({ name: 'Item', params: { author: v.author, permlink: v.permlink } })
            }
        },
    },
    mounted () {
        setInterval(() => {
            this.scrollHeight = window.scrollHeight
        }, 100)

        this.$root.$on('results', id => {
            this.resultsDialogCommentId = id
        })
    },
    methods: {
        ...mapActions([
            'broadcastPost',
            'broadcastChoice',
            'broadcastComment',
            'broadcastVote',
            'setRepliesSort',
            'setPostsSort',
            'startCommenting',
            'setPostCommentText',
            'setViewItem',
            'postNew',
            'onVote',
            'appReply',
        ]),
        onView (id) {
            const node = id === true ? this.rootNode : this.getNode(id)
            if (node.isWebpage) {
                fetch(`${GUN_URLS[0]}/${node.text}`)
                this.$store.dispatch('loadReadability', node.text)
                document.body.style.overflowY = 'hidden'
                this.quickViewId = id
            }

            if (id !== true) {
                this.$router.toId(id, node.isWebpage)
            }
        },
        onCloseQuickView () {
            if (this.quickViewId) {
                if (this.quickViewId !== true && this.rootNode) {
                    this.$router.toId(this.rootNode.id)
                }
                document.body.style.overflowY = ''
                this.quickViewId = null
            }
        },
        onChooseNode (node) {
            this.$router.toId(node.id)
        },
        onAnnotate (text) {
            this.onCloseQuickView()
            this.startCommenting(this.rootNode.id)
            this.setPostCommentText(text)
            setTimeout(() => {
                this.$refs.comments.focusPlainComment()
            }, 150)
        },
        onPostNode ({ title, metadata, ownChoice, isWebpage }) {
            this.postNew({ title, metadata, ownChoice, isWebpage })
        },
        onChooseChoice ({ author, permlink, unit, choice }) {
            this.broadcastChoice({ parentAuthor: author, parentPermlink: permlink, unit, choice })
        },
        onReply ({ parentAuthor, parentPermlink, text, metadata, ownChoice }) {
            this.appReply({ parentAuthor, parentPermlink, text, metadata, beneficiaries: this.getContextBeneficiaries() }).then(comment => {
                if (ownChoice || ownChoice === 0) {
                    this.broadcastChoice({ parentAuthor: comment.author, parentPermlink: comment.permlink, unit: metadata.unit, choice: ownChoice })
                }
                setTimeout(() => {
                    if (this.$refs.comments) {
                        this.$refs.comments.expandNode(toString(comment))
                    }
                }, 50)
            })
        },
        getContextBeneficiaries () {
            const { beneficiary, beneficiaryShare } = this.$route.query
            if (beneficiary && beneficiaryShare) {
                const username = beneficiary.trim().toLowerCase()
                const beneficiaryWeight = parseInt(beneficiaryShare)
                if (username.length > 0 && !isNaN(beneficiaryWeight) && beneficiaryWeight > 0 && beneficiaryWeight <= 50) {
                    return [
                        { account: username, weight: beneficiaryWeight / 100 },
                    ]
                }
            }
            return []
        },
    },
}
</script>

<style lang="less">
// * {
//     outline: 1px dotted black;
// }

@import './common';

html, body {
	margin: 0;
	font-family: @font-family;
	background: #fff;
	color: #222;
	height: 100%;
    font-size: 17px;
}
body {
    overflow-y: scroll;
}

a {
	color: #0987b9;
	text-decoration: none;
}

.slide-left-enter, .slide-right-leave-active {
	opacity: 0;
	transform: translate(0, -20px);
}

.slide-left-leave-active, .slide-right-enter {
	opacity: 0;
	transform: translate(0, 20px);
}

.el-dialog__header {
    display: none;
}
.el-dialog__body {
    padding: 30px 20px;
}
</style>

<style lang="less" module>
@import './common';

.root {
    margin-bottom: 60px;
}

.mainRoot {
    width: 700px;
    margin: 0 auto;
    margin-top: 30px;
}

.mainWrap {
	width: 100%;
    display: flex;
    align-items: center;
}

.mainPost {
    .mainWrap();
    .landingContent();
}

.landingContent {
    background-color: #eee;
    margin: 10px 0;
    width: 100%;
    box-sizing: border-box;
}

.goToComments {
    font-size: 24px;
    margin-right: 8px;
    cursor: pointer;
    color: #2e93e0;

    > i {
        margin-left: 4px;
    }
}

.fakeResults {
    width: 100px;
    background-color: #eeee;
    line-height: 30px;
    text-align: center;
    display: inline-block;
    margin-left: 8px;
}

.tooLongTitle {
    padding: 16px;
    font-size: 26px;
}

.tooLongGuidelines {
    padding: 16px;
    font-size: 16px;
    line-height: 24px;
}

.mainPostWrap {
    .mainRoot();
    position: sticky;
    top: 54px;
    z-index: 90;
    border: 4px solid @white;
}

.mainNode {
    padding: 10px;
    background-color: #eee;
    width: 100%;
    box-sizing: border-box;
}

.viewPost {
    font-size: 13px;
    margin-left: 6px;
    margin-bottom: 6px;
    display: block;
    font-weight: bold;
}

.quickView {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100%;
    z-index: 200;
    background-color: #112e;
    overflow-y: scroll;
    max-height: 100%;

    &_mini {
        display: flex;
        align-items: center;

        > div {
            min-height: auto;
        }
    }
}
.quickViewContent {
    width: 60%;
    margin: 0 auto;
    padding: 80px 50px;
    background-color: white;
    min-height: 100vh;

    &_loading {
        .loadingBg();
    }
}
</style>
