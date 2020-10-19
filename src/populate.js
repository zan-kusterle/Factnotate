/* globals POPULATE_TEXT_LINES */
import { toString, oneWayEncodePermlink } from './comment_ids'
import { parseLine } from './store/nodes'
import { ENABLE_GUN } from './constants'

const FORCE_DISABLE = true

const canPopulate = () => {
    if (POPULATE_TEXT_LINES && POPULATE_TEXT_LINES.length > 0) {
        if (!ENABLE_GUN) {
            return true
        } else if (localStorage.getItem('populatePostsDone') !== '1') {
            localStorage.setItem('populatePostsDone', '1')
            return true
        }
    }
    return false
}

export default function (store) {
    if (!FORCE_DISABLE && store.getters.username && canPopulate()) {
        const handleLine = ({ text, title, tags, unit, choiceValue }, parentLine) => {
            if (text) {
                if (parentLine) {
                    store.dispatch('broadcastComment', { parentAuthor: parentLine.author, parentPermlink: parentLine.permlink, text })
                }
            } else {
                store.dispatch('broadcastPost', { text: title.replace(/\\n/g, '\n'), metadata: unit ? { tags, unit: unit.long } : { tags } }).then(comment => {
                    if (choiceValue || choiceValue === 0) {
                        store.dispatch('broadcastChoice', { parentAuthor: comment.author, parentPermlink: comment.permlink, unit, choice: choiceValue })
                    }

                    if (parentLine) {
                        store.dispatch('broadcastComment', { parentAuthor: parentLine.author, parentPermlink: parentLine.permlink, text: toString(comment) })
                    }
                })
            }
        }

        let lastRoot = null
        const byTitle = {}
        POPULATE_TEXT_LINES.forEach(line => {
            if (!line.startsWith('#')) {
                const data = parseLine(line)
                if (data.title) {
                    if (!line.startsWith(' ')) {
                        handleLine(data)
                        lastRoot = { author: store.getters.username, permlink: oneWayEncodePermlink(data.title).substring(0, 250) }
                        byTitle[data.title] = lastRoot
                    } else {
                        handleLine(data, lastRoot)
                    }
                } else if (line.startsWith(' ')) {
                    let text = line.trim().replace(/\\n/g, '\n')
                    Object.keys(byTitle).forEach(title => {
                        text = text.replace(title, toString(byTitle[title]))
                    })
                    handleLine({ text }, lastRoot)
                }
            }
        })
    }
}
