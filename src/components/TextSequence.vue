<script>
import { ids } from '../store/nodes'
import { getText, getResultsColor } from '../store/nodes/map_results'

export function getHtmlSequence (segments, classNames, segmentFn = null) {
    segments = segments.map((x, index) => ({ ...x, index }))

    const getInlineStyle = obj => Object.keys(obj).map(k => `${k}: ${obj[k]};`).join(' ')
    const h = (tag, opts, content) => {
        const htmlContent = Array.isArray(content) ? content.join('') : content
        return `<${tag}${opts.style ? ` style="${getInlineStyle(opts.style)}"` : ''}${opts.attrs && opts.attrs.href ? ` href="${opts.attrs.href}" target="_blank"` : ''}>${htmlContent}</${tag}>`
    }

    const getSegmentTextHtml = (text, index) => segmentFn ? segmentFn({ text, index }) : text
    const $style = {
        prefix: {
            'font-style': 'italic',
        },
        securePrefix: {
            'color': '#59a114',
            'font-style': 'italic',
        },
        resultsBox: {
            'display': 'inline',
            'white-space': 'nowrap',
            'padding': '0px 6px',
            'line-height': '16px',
            'user-select': 'none',
            'color': '#333',
            'font-size': '12px',
        },
    }

    return segments.flatMap(segment => {
        const res = []
        if (segment.name === 'webpage') {
            const protocol = segment.value.substring(0, segment.value.indexOf('://') + 3)
            res.push(h('span', { style: protocol === 'https://' ? $style.securePrefix : $style.prefix }, protocol))
            res.push(h('span', { class: classNames.webpageUrl }, `${segment.value.replace(protocol, '')} `))
        } else if (segment.name === 'quote') {
            res.push(h('span', { style: { 'background-color': 'yellow' } }, getSegmentTextHtml(segment.value, segment.index)))
            res.push(' ')
        } else if (segment.name === 'choice') {
            res.push(h('span', { style: { fontWeight: 'bold' } }, segment.value ? `${segment.value} ` : 'PREVIOUS VOTES DENOUNCED '))
        } else if (segment.name === 'text') {
            res.push(h('span', {}, getSegmentTextHtml(segment.value, segment.index)))
        } else if (segment.name === 'post') {
            const seq = []
            if (segment.value.results && segment.value.results.mean) {
                seq.push(h('span', { style: { ...$style.resultsBox, 'background-color': segment.value.results.unit.isSpectrum ? getResultsColor(segment.value.results.mean) : '#aaa5' } }, getText(segment.value.results.mean, segment.value.results.unit)))
                seq.push('&nbsp;')
            }
            seq.push(...getHtmlSequence(segment.value.textSequence, classNames, segmentFn))
            res.push(`<span post-key="${ids.toString(segment.value)}">${seq.join('')}</span>`)
        } else if (segment.name === 'link') {
            res.push(ids.toString(segment.value))
        } else if (segment.name === 'newline') {
            res.push('<br />')
        }
        return res
    })
}

export default {
    name: 'TextSequence',
    functional: true,
    props: {
        sequence: { type: Array, required: true },
        isRight: { type: Boolean, default: false },
    },
    render (h, context) {
        let sequence = context.props.sequence
        if (context.props.isRight) {
            sequence.reverse()
        }

        const resSequence = []
        let line = []
        sequence.forEach(item => {
            if (item.name === 'newline') {
                if (line.length > 0) {
                    resSequence.push(line)
                    line = []
                }
            } else {
                line.push(item)
            }
        })
        if (line.length > 0) {
            resSequence.push(line)
        }
        sequence = resSequence

        return sequence.map(lineSegments => {
            return h('div', { class: 'line', domProps: { innerHTML: getHtmlSequence(lineSegments, { webpageUrl: 'webpageUrl' }).join('') } })
        })
    },
}
</script>

<style lang="less">
@import './TextSequence';
</style>
