<template>
    <div :class="$style.root">
        <div :class="$style.header">
            <div :class="$style.leftWrap">
                <router-link :class="$style.logo" :to="{ name: 'Home' }">
                    <img src="../assets/factnotate.png">
                </router-link>

                <el-dropdown :class="$style.sorts" @command="setPostsSort">
                    <span :class="$style.sortCurrentItem">
                        Sorting by {{ postsSort }} <i class="fas fa-caret-down" />
                    </span>
                    <el-dropdown-menu slot="dropdown">
                        <el-dropdown-item v-for="sortKey in availableSorts" :key="sortKey" :command="sortKey">
                            {{ allSorts[sortKey] }}
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </el-dropdown>
                <!-- <div :class="$style.sorts">
                    <div :class="$style.views">
                        <template v-if="rootNode.results && rootNode.results.choiceVoteNodes">
                            <div v-if="columnsView === 'choice'" key="choice" @click="columnsView = 'links'">
                                <i class="fas fa-yin-yang" />
                            </div>
                            <div v-else-if="columnsView === 'links'" key="links" @click="columnsView = 'choice'">
                                <i class="fas fa-grip-horizontal" />
                            </div>
                        </template>
                    </div>
                </div> -->
            </div>

            <div :class="$style.searchComponent">
                <el-input v-model="searchQuery" size="small" placeholder="Paste a URL to fact-check and discuss any webpage" @paste.native="onPaste" @keydown.enter.native="onSearch">
                    <div slot="suffix" :class="$style.longArrow">
                        <i class="far fa-long-arrow-alt-right" />
                    </div>
                </el-input>
            </div>

            <div :class="$style.rightWrap">
                <div v-if="username" :class="$style.user">
                    <router-link :class="$style.username" :to="{ name: 'ItemQuery', params: { permlinkOrAuthor: `@${username}` } }">
                        <div :class="$style.userImage" :style="{ backgroundImage: `url(https://steemitimages.com/u/${username}/avatar)` }" />
                        {{ username }}
                    </router-link>

                    <router-link :class="$style.logoutButton" :to="{ name: 'Logout' }">
                        <i class="fas fa-power-off" />
                    </router-link>
                </div>
                <a v-else key="login" :href="loginUrl" :class="$style.loginUrl" @mousedown="onLoginDown">
                    Login with SteemConnect
                </a>

                <div :class="$style.showGuide" :style="{ opacity: isGuideShown ? '0' : '1' }" @click="openGuide">
                    <i class="fas fa-question-circle" />
                </div>
            </div>
        </div>

        <div :class="[$style.guideRoot, { [$style.guideRoot_shown]: isGuideShown } ]">
            <div>
                <button :class="$style.guideButton" @click="isEmbedDialogOpen = true">
                    <div :class="$style.guideButtonMain">
                        Embed on your webpage
                        <i class="fab fa-js-square" />
                    </div>
                    <p :class="$style.guideButtonSubtext">
                        Let people discuss your content, earn Steem.
                    </p>
                </button>
            </div>
            <div>
                <a :class="$style.guideButton" :href="bookmarkletHref" @click.prevent>
                    <div :class="$style.guideButtonMain">
                        View on Factnotate
                        <i class="fas fa-bookmark" />
                    </div>
                    <p :class="$style.guideButtonSubtext">
                        <i class="fas fa-expand-arrows-alt" /> Drag &amp; drop to save the bookmarklet.
                    </p>
                </a>
            </div>
            <div>
                <a :class="$style.guideButton" @click="isExtensionInstallDialogOpen = true">
                    <div :class="$style.guideButtonMain">
                        Get the extension
                        <i class="fas fa-browser" />
                    </div>
                    <p :class="$style.guideButtonSubtext">Annotate and comment on any webpage.</p>
                </a>
            </div>

            <p :class="$style.closeGuide" @click="closeGuide">
                <i class="fas fa-times"></i>
            </p>
        </div>

        <!-- <el-dialog v-if="pendingComments.length > 0" :append-to-body="true" :visible.sync="isPendingDialogOpen" :class="$style.dialog" title="Pending comments">
            {{ lastBroadcastError }}
            <Tree :ids="pendingComments" :collapse-after-depth="0" :class="$style.landingContent" />
        </el-dialog> -->

        <el-dialog :append-to-body="true" :visible.sync="isEmbedDialogOpen" :class="$style.dialog" title="Earn Steem when you let people fact check your content">
            <div v-if="username">
                When people annotate or comment the content on your webpage, Steem user <b>@{{ username }}</b> will earn <b :class="$style.rewardsShare">{{ rewardsShareValue }}%</b> (<el-slider v-model="rewardsShareValue" :min="0" :max="50" :class="$style.shareSlider" />)&nbsp; of rewards.
            </div>
            <div v-else>
                Login with a Steem account to earn up to <b>50% of rewards</b> for comments made about your webpage.
            </div>

            Copy &amp; paste the following HTML inside the <span :class="$style.code">&lt;head&gt;</span> tag on your webpage:
            <div :class="$style.codeBlock">
                <template v-if="username">
                    &lt;meta name="steem:author" content="<b>{{ username }}</b>"&gt;<br>
                    &lt;meta name="steem:authorShare" content="<b>{{ rewardsShareValue }}%</b>"&gt;<br>
                </template>
                &lt;script src="https://factnotate.io/embed.js"&gt;&lt;/script&gt;
            </div>

            <a href="/demo.html" target="_blank" :class="$style.viewDemoPage">View demo webpage <i class="far fa-external-link-square-alt" /></a>
        </el-dialog>

        <el-dialog :append-to-body="true" :visible.sync="isExtensionInstallDialogOpen" :class="$style.dialog" title="Install browser extension">
            <div :class="$style.downloadWrap">
                <a :href="`/${extensionFileName}.zip`" download>
                    <el-button type="primary" size="large">
                        Download and Unzip
                    </el-button>
                </a>
                <div>Download the extension and unzip it. Find {{ extensionFileName }} folder.</div>
            </div>
            <div v-for="(step, index) in stepsByBrowsers.chrome" :key="index" :class="$style.extensionStep">
                <div :class="$style.stepNumber">
                    {{ index + 1 }}
                </div>
                <div :class="$style.stepTitle">
                    {{ step.title }}
                </div>
                <div :class="$style.stepContent">
                    {{ step.text }}
                </div>
            </div>

            <div :class="$style.extensionPrivacy">
                <h4>Privacy Policy</h4>
                <p>
                    To get annotations for a specific webpage Factnotate sends the URL of every website that you visit to our servers.
                    This means we can see which websites someone opens. We do not purposefully send any identifiable information to our servers.
                    We have also explicitly configured our server to not store any identifiable information such an IP address or which browser you are using.
                    We only use this information to monitor traffic and fix bugs. We never share this information with anyone.
                </p>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { TEST_USERNAME } from '../constants'

export default {
    data () {
        return {
            rewardsShareValue: 30,
            isPendingDialogOpen: false,
            isEmbedDialogOpen: false,
            isExtensionInstallDialogOpen: false,
            isGuideShown: localStorage.getItem('isGuideShown') !== '0',
            searchQuery: '',
        }
    },
    computed: {
        ...mapGetters([
            'loginUrl',
            'username',
            'pendingBroadcastsCount',
            'pendingComments',
            'lastBroadcastError',
            'bookmarkletHref',
            'linkablePosts',
            'rootNode',
            'postsSort',
        ]),
        availableSorts () {
            if (this.rootNode) {
                if (this.rootNode.author && this.rootNode.permlink) {
                    const res = ['age', 'votes', 'reputation']
                    if (this.rootNode.results && this.rootNode.results.unit) {
                        res.push('choice')
                    }
                    return res
                } else if (this.rootNode.author) {
                    return ['age', 'votes']
                } else if (this.rootNode.permlink) {
                    return ['age', 'hot', 'trending']
                }
            }
            return []
        },
    },
    beforeCreate () {
        this.isTestUsername = !!TEST_USERNAME
        this.allSorts = {
            age: 'New',
            votes: 'Best',
            reputation: 'Reputation',
            choice: 'Choice',
            trending: 'Trending',
            hot: 'Hot',
        }
        this.extensionFileName = 'factnotate-web-extension'
        this.stepsByBrowsers = {
            chrome: [
                {
                    title: 'Navigate to the Extensions Page',
                    text: 'Go to chrome://extensions in the URL bar.',
                },
                {
                    title: 'Turn on "Developer Mode"',
                    text: 'In the top right corner of the extensions page, toggle "Developer Mode" on.',
                },
                {
                    title: 'Click "Load Unpacked"',
                    text: 'Click on the "Load Unpacked" button in the top left of the extensions page.',
                },
                {
                    title: 'Select the Folder',
                    text: `After clicking "Load Unpacked", the file opener opens, select the extension's entire folder "${this.extensionFileName}" then click "Select".`,
                },
                {
                    title: 'Turn off "Developer Mode"',
                    text: 'In the top right corner of the extensions page, toggle "Developer Mode" off.',
                },
                {
                    title: 'Find the extension in the Navigation Bar',
                    text: 'The Factnotate "checkmark" logo should appear in the navigation bar.',
                },
                {
                    title: 'Use the extension',
                    text: 'If you have any questions, suggestions, ideas, or bugs to report, please reach out to hello@factnotate.io or view our GitHub issues page.',
                },
            ],
        }
    },
    methods: {
        ...mapActions([
            'logout',
            'viewUrl',
            'setPostsSort',
        ]),
        closeGuide () {
            localStorage.setItem('isGuideShown', '0')
            this.isGuideShown = false
        },
        openGuide () {
            localStorage.setItem('isGuideShown', '1')
            this.isGuideShown = true
        },
        onChooseNode (node) {
            this.$router.toId(node.id)
        },
        onPaste () {
            setTimeout(() => {
                this.onSearch()
            }, 50)
        },
        onSearch () {
            const query = this.searchQuery.trim()
            if (query.startsWith('http://') || query.startsWith('https://')) {
                this.viewUrl(this.searchQuery)
            }
        },
        onLoginDown () {
            this.$router.beforeLoginPath = this.$route
        },
    },
}
</script>

<style lang="less" module>
@import './common';

.root {
    z-index: 100;
    position: sticky;
    top: 0;
    border-bottom: 2px solid #93c01e;
}

.header {
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(~'100% - 90px');
    padding: 8px 45px;
}

.logo {
    cursor: pointer;
    font-size: 0;

    > img {
        width: 180px;
    }
}

.searchComponent {
    flex: 1;
    z-index: 100;
    margin: 0 45px;
    display: flex;
    justify-content: center;
    > div {
        max-width: 400px;
    }
    input {
        background-color: #fff8;
    }
}

.longArrow {
    display: flex;
    align-items: center;
    height: 100%;
    padding-right: 6px;
    color: #333;
    font-weight: bold;
}

.loginUrl {
    font-size: 14px;
}

.user {
    margin-right: 40px;
	display: flex;
    align-items: center;
    justify-content: flex-start;

    > a {
        color: #333;
    }
}

.sorts {
    font-size: 12px;
    margin-left: 40px;
    cursor: default;
}

.username {
    display: flex;
    align-items: center;
}

.userImage {
    border: 1px solid #aaa;
	display: inline-block;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: 50% 50%;
    border-radius: 50%;
    width: 26px;
    height: 26px;
	margin-right: 8px;
    background-color: #ccc;
}

.logoutButton {
    display: flex;
	font-size: 12px;
	color: #666;
	margin-left: 16px;
	cursor: pointer;
}

.steemBroadcastLoading {
    margin-left: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 32px;
    height: 32px;
    transition: opacity 200ms ease-out;
    cursor: pointer;

    > span {
        width: 32px;
        top: 0;
        left: 0;
        line-height: 32px;
        color: #444;
        position: absolute;
        text-align: center;
    }
}

.pendingSpinner {
    font-size: 32px;
    animation: spin 1000ms linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.guideRoot {
    background-color: #09669c;
    padding: 0 6%;
    display: flex;
    justify-content: center;
    position: relative;
    overflow: hidden;
    height: 0px;
    transition: opacity 180ms ease-out, height 180ms ease-out;
    opacity: 0;
    word-break: break-word;
    &_shown {
        opacity: 1;
        height: 120px;
    }

    > div {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        font-size: 13px;
        color: #fff;

        > p {
            margin: 0;
            margin-bottom: 12px;
        }
    }
}

.closeGuide {
    margin: 0;
    position: absolute;
    right: 44px;
    top: 12px;
    color: @white;
    font-size: 28px;
    cursor: pointer;
}

.showGuide {
    color: #777;
    cursor: pointer;
    transition: opacity ease-out 200ms;
}

.guideButton {
    width: 80%;
    color: #fff;
    border: none;
    background: none;
    cursor: pointer;
    padding: 20px 10px;
    border-radius: 4px;
    transition: transform 200ms ease-out, background-color 200ms ease-out;
    background-color: #74a6ca22;

    &:hover {
        background-color: #0004;
        transform: scale(1.1);
    }

}

.guideButtonMain {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;

    > i {
        margin-left: 8px;
        font-size: 28px;
    }
}

.guideButtonSubtext {
    font-size: 12px;
    margin: 0;
    text-align: center;
    margin-top: 4px;
}

.code {
    color: #666;
    font-family: 'Courier New', Courier, monospace;
    background-color: #eee;
}
.codeBlock {
    .code();
    margin-top: 20px;
    padding: 16px 20px;
}

.viewDemoPage {
    font-size: 15px;
    display: block;
    width: 100%;
    text-align: center;
    margin-top: 20px;
    color: #2078b7;

    &:hover {
        color: #2590dc;
    }
}

.shareSlider {
    display: inline-block;
    > div {
        display: inline-block;
    }
    width: 40%;
    margin: 0 auto;
}

.extensionStep {
    position: relative;
    margin-bottom: 20px;
    padding-left: 44px;
}

.extensionPrivacy {
    background-color: #eee;
    padding: 20px;
    text-align: justify;

    > h4 {
        margin: 0;
        margin-bottom: 10px;
        font-size: 16px;

    }
}

.stepNumber {
    width: 32px;
    height: 32px;
    position: absolute;
    left: 0px;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    border-radius: 50%;
    background-color: #444;
    text-align: center;
    color: white;
}
.stepTitle {
    font-size: 18px;
}

.rightWrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.leftWrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-start;
}

.downloadWrap {
    margin-bottom: 20px;
    background-color: #eee;
    padding: 20px 46px;
    text-align: center;

    button {
        font-size: 18px;
        margin-bottom: 5px;
    }

    > div {
        font-size: 13px;
    }
}

.rewardsShare {
    width: 32px;
    display: inline-block;
}

@media only screen and (max-width: 1000px) {
    .header {
        padding: 8px 0;
        width: 100%;
    }

    .logo {
        display: none;
    }

    .searchComponent {
        margin-left: 0;
    }

    .user {
        flex: none;
    }
}
</style>
