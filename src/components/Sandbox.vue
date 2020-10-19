<template>
    <div :class="$style.root">
        <div :class="$style.heading">
            <div />
            <div>Steem</div>
            <div>Factnotate</div>
        </div>
        <div v-for="(example, index) in examples" :key="index" :class="$style.example">
            <div>{{ example.name }}</div>
            <template v-if="example.type === 'choice'">
                <div>{{ example.text }}</div>
                <div>
                    <div :class="$style.results">
                        {{ example.text }}
                    </div>
                </div>
            </template>
            <template v-else>
                <div>
                    <div v-for="(p, jindex) in example.text.split('\n')" :key="jindex">
                        {{ p }}
                    </div>
                </div>
                <div>
                    <text-sequence :sequence="example.sequence" />
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import TextSequence from './TextSequence.vue'
import { parseText, parseUnit } from '../store/nodes'
import { toString } from '../comment_ids'

export default {
    components: { TextSequence },
    beforeCreate () {
        const posts = {
            '@zank/human-activity-is-causing-global-warming': { results: { unit: parseUnit('Reliable-Unreliable'), mean: 0.85 }, textSequence: parseText('Human activity is causing global warming') },
        }
        this.examples = [
            { name: 'Fresh poll', text: 'Human activity is causing global warming' },
            {
                name: 'Poll vote',
                text: '23%',
                sequence: [{ name: 'post', value: { results: { unit: parseUnit('Reliable-Unreliable'), mean: 0.23 }, textSequence: [] } }],
            },
            { name: 'Link to poll', text: '@zank/human-activity-is-causing-global-warming' },
            { name: 'Webpage annotation', text: '> Something somewhere\n @zank/human-activity-is-causing-global-warming' },
        ].map(example => {
            const initialSequence = example.sequence ? example.sequence : parseText(example.text)
            const sequence = initialSequence.map(segment => {
                if (segment.name === 'link') {
                    return { name: 'post', value: posts[toString(segment.value)] }
                }
                return segment
            })
            return { ...example, sequence }
        })
    },
    methods: { parseText },
}
</script>

<style lang="less" module>
p {
    margin: 0;
}

.root {
    margin-top: -25px;
}

.example {
    display: flex;
    margin: 20px;

    > div {
        font-size: 16px;
        padding: 20px 40px;

        &:nth-child(1) {
            padding-left: 0;
            display: flex;
            align-items: center;
            min-width: 180px;
            text-transform: uppercase;
            justify-content: flex-end;
            font-size: 14px;
            font-weight: bold;
        }

        &:nth-child(2) {
            background-color: #ddd;
            width: 40%;
        }

        &:nth-child(3) {
            width: 40%;
            background-color: #eee;
        }
    }
}

.heading {
    .example();

    opacity: 0.8;
    text-transform: uppercase;

    > div {
        font-size: 20px;
        background-color: transparent !important;
        padding-bottom: 0;
    }
}

.results {
    background-color: rgb(140, 232, 140);
    display: inline-block;
    padding: 2px 6px;
    margin-right: 10px;
}
</style>
