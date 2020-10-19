<template>
    <div v-if="nodes.length > 0" :class="[$style.root, { [$style.root_real]: depth === 0 }]">
        <div v-for="node in nodes" :key="node.key" :class="[$style.nodeWrap, { [$style.nodeWrap_root]: depth === 0, [$style.nodeWrap_hidden]: areChildrenHiddenByKeys[node.key], [$style.nodeWrap_grey]: node.isHidden }]">
            <Node :class="[$style.node, { [$style.node_root]: depth === 0 }]" v-bind="{ ...node, ...props, ...rootProps }" @vote="$emit('vote', $event)" @choose="$emit('choose', $event)" @view="$emit('view', $event)">
                <div v-if="node.visibleChildrenIds.length > 0 && areChildrenHiddenByKeys[node.key]" key="b" :class="$style.expandChildren" @click="$set(areChildrenHiddenByKeys, node.key, false)">
                    <span :class="$style.count">{{ node.visibleChildrenIds.length }}</span>
                    <i class="fas fa-plus-circle" />
                </div>
                <template v-else-if="enableCommenting">
                    <div v-if="node.isCommenting" key="a" @click="onCloseComment">
                        <span :class="$style.count">{{ node.visibleChildrenIds.length }}</span>
                        <i class="fas fa-comment" />
                    </div>
                    <div v-else key="c" @click="onStartCommenting(node)">
                        <span :class="$style.count">{{ node.visibleChildrenIds.length }}</span>
                        <i class="far fa-comment" />
                    </div>
                </template>

                <slot :node="node" />
            </Node>

            <div v-if="node.isCommenting" :class="$style.commentWrap">
                <el-input v-model="commentText" :class="$style.titleInput" size="small" placeholder="Write a comment" @keyup.native.enter="onComment(node)" />
            </div>

            <div v-if="areChildrenHiddenByKeys[node.key] !== true" :class="$style.children">
                <div :class="{ [$style.sideLine]: true, [$style.sideLine_hiddenWebpage]: node.isWebpage && areChildrenHiddenByKeys[node.key] === true }" @click="collapseNode(node.key)">
                    <div :class="$style.collapseLine" />
                </div>

                <Tree v-if="depth < maxDepth" ref="trees" :ids="node.visibleChildrenIds" :depth="depth + 1" :props="props" :collapse-after-depth="collapseAfterDepth" :enable-commenting="enableCommenting" @comment="$emit('comment', $event)" @vote="$emit('vote', $event)" @choose="$emit('choose', $event)" @view="$emit('view', $event)">
                    <template slot-scope="scope">
                        <slot :node="scope.node" :parent-node="node" />
                    </template>
                </tree>
            </div>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { toString, eq } from '../comment_ids'
import Node from './BaseNode.vue'

export default {
    name: 'Tree',
    components: { Node, Tree: this },
    props: {
        ids: { type: Array, required: true },
        depth: { type: Number, default: 0 },
        props: { type: Object, default: () => ({}) },
        rootProps: { type: Object, default: () => ({}) },
        collapseAfterDepth: { type: Number, default: 2 },
        maxDepth: { type: Number, default: 5 },
        enableCommenting: { type: Boolean, default: false },
    },
    data () {
        return {
            areChildrenHiddenByKeys: {},
            commentingKey: null,
            commentText: '',
        }
    },
    computed: {
        ...mapGetters ([
            'getNodes',
            'knownPosts',
            'rootNode',
        ]),
        nodes () {
            return this.getNodes(this.ids).map(node => {
                const isCommenting = this.commentingKey === node.key
                const linkablePosts = this.knownPosts.filter(x => !eq(x.id, this))
                const visibleChildrenIds = [...node.linkedIds, ...node.visibleChildrenIds].filter(x => !eq(x, this.rootNode.id))
                return { ...node, isCommenting, linkablePosts, visibleChildrenIds }
            })
        },
    },
    watch: {
        ids: {
            immediate: true,
            handler (v, ov) {
                const newIds = !ov ? v : v.filter(x => !ov.includes(x))
                newIds.forEach(newId => {
                    if (this.depth >= this.collapseAfterDepth) {
                        this.collapseNode(toString(newId))
                    }
                })
            },
        },
    },
    methods: {
        expandNode (key) {
            if (this.nodes.find(x => x.key === key)) {
                this.$set(this.areChildrenHiddenByKeys, key, false)
                return true
            }

            if (this.$refs.trees) {
                let anyExpanded = false
                for (const childComponent of this.$refs.trees) {
                    if (childComponent.expandNode(key)) {
                        anyExpanded = true
                    }
                }
                return anyExpanded
            }

            return false
        },
        collapseNode (key) {
            this.commentingKey = null
            this.$set(this.areChildrenHiddenByKeys, key, true)
        },
        onStartCommenting (node) {
            this.commentingKey = node.key
            this.expandNode(node.key)
        },
        onCloseComment () {
            this.commentingKey = null
        },
        onComment (node) {
            this.$emit('comment', { parentAuthor: node.author, parentPermlink: node.permlink, text: this.commentText })
            this.commentText = ''
        },
        onPoll (node, { title, metadata, ownChoice }) {
            this.$emit('comment', { parentAuthor: node.author, parentPermlink: node.permlink, text: title, metadata, ownChoice })
        },
        onAnnotate (node, text) {
            this.$store.dispatch('startCommenting', node.id)
            this.$store.dispatch('setCommentText', text)
        },
    },
}
</script>

<style lang="less" module>
@import './common';

.root {
    background-color: #eee;

    &_real {
        padding: 4px 16px;
    }
}

.nodeWrap {
    position: relative;
    margin-left: 14px;
    padding: 8px 0;

    &_grey {
        opacity: 0.5;
    }

    &_root {
        margin-left: 0;
    }
}

.node {
    box-sizing: border-box;
    position: relative;
    padding: 0 0px !important;

    &_root {
        background-color: #eee;
    }
}

.children {
    position: relative;
}

.sideLine {
    height: calc(~'100% - 20px');
    margin: 12px 0;
    width: 15px;
    position: absolute;
    left: 0;
    top: 0;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    justify-content: flex-start;
    z-index: 1;

    &_hiddenWebpage {
        margin-top: 18px;
    }
}
.sideLine:hover > .collapseLine {
    background-color: #3339;
}

.collapseLine {
    width: 2px;
    height: 100%;
    background-color: #3333;
    margin: auto 0;
    transition: background-color 200ms ease-out;
}

.comment {
    margin-left: 15px;
    border: 1px solid #ddd;
}

.commentWrap {
    padding-bottom: 10px;
    padding-top: 14px;
}

.count {
    margin-right: 4px;
    font-size: 12px;
}

.expandChildren {
    width: max-content;
}
</style>
