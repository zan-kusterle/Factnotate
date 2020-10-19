/* globals ROOT_URL */
import { Client } from 'steemconnect'
import { APP_NAME, MAX_PERCENT, TEST_USERNAME, STEEM_CONNECT_APP_USERNAME } from '../../constants'
import { oneWayEncodePermlink } from '../../comment_ids'

const SteemConnect = TEST_USERNAME ? null : new Client({
    app: STEEM_CONNECT_APP_USERNAME,
    callbackURL: `${ROOT_URL}/login/steemconnect`,
    accessToken: 'access_token',
    scope: ['vote', 'comment', 'comment_options'],
})

export function getLoginUrl() {
    return SteemConnect.getLoginURL()
}

export function login(accessToken) {
    SteemConnect.setAccessToken(accessToken)
    return new Promise(resolve => {
        SteemConnect.me((err, res) => {
            if (res) {
                resolve(res)
            }
        })
    })
}

export function broadcastComment ({ author, permlink }, { parentAuthor, parentPermlink, text, metadata, beneficiaries = [], allowVotes = true }) {
    return new Promise((resolve, reject) => {
        const commentOp = {
            parent_author: parentAuthor,
            parent_permlink: oneWayEncodePermlink(parentPermlink).toLowerCase(),
            author: author,
            permlink: oneWayEncodePermlink(permlink).toLowerCase(),
            title: text,
            body: text,
            json_metadata: JSON.stringify({ ...(metadata || {}), app: APP_NAME }),
        }
        const commentOptionsOp = {
            author: author,
            permlink: oneWayEncodePermlink(permlink).toLowerCase(),
            max_accepted_payout: '1000000.000 SBD',
            percent_steem_dollars: 10000,
            allow_votes: allowVotes,
            allow_curation_rewards: true,
            extensions: [],
        }
        if (beneficiaries.length > 0) {
            beneficiaries = beneficiaries.map(x => ({ account: x.account, weight: x.weight * MAX_PERCENT }))
            commentOptionsOp.extensions.push([0, { beneficiaries }])
        }

        return SteemConnect.broadcast([['comment', commentOp], ['comment_options', commentOptionsOp]], (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve({
                    ...res.result,
                    author,
                    permlink,
                    tags: metadata && metadata.tags || [],
                })
            }
        })
    })
}

export function broadcastVote ({ author, permlink }, username, ratio) {
    return new Promise((resolve, reject) => {
        SteemConnect.vote(username, author, oneWayEncodePermlink(permlink).toLowerCase(), Math.round(ratio * MAX_PERCENT), (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res.result)
            }
        })
    })
}
