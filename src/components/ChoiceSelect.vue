<template>
    <div :class="$style.choiceWrap" class="choiceWrap">
        <template v-if="isInline">
            <div :class="$style.choiceInput">
                <el-slider v-if="type === 'spectrum'" v-model="spectrumValue" :class="$style.choiceSlider" />
                <div v-else-if="type === 'estimate'" :class="$style.quantityChoiceWrap">
                    <el-input v-model="estimateValue" size="mini" :class="$style.choiceInputNumber" @keyup.delete.stop.native="() => {}" />
                    <span v-if="shortUnit" :class="$style.shortUnit">{{ shortUnit }}</span>
                </div>
                <el-date-picker
                    v-else-if="type === 'time'"
                    v-model="timeValue"
                    type="datetime"
                    placeholder="Select date and time"
                    :picker-options="datePickerOptions"
                />
            </div>
            <div key="circle" :class="$style.confirmVote" @click="onChoiceVote">
                <i class="fas fa-check" />
            </div>
        </template>
        <template v-else>
            <div v-if="type === 'definition'">
                DEFINE WORD
            </div>
        </template>
    </div>
</template>

<script>
export default {
    props: {
        type: { type: String, required: true },
        shortUnit: { type: String, default: null },
        initialChoiceValue: { type: Object, default: null },
    },
    data () {
        return {
            spectrumValue: this.initialChoiceValue === null ? 50 : this.initialChoiceValue * 100,
            estimateValue: this.initialChoiceValue === null ? 0 : this.initialChoiceValue,
            timeValue: '',
        }
    },
    computed: {
        isInline () {
            return ['spectrum', 'estimate'].includes(this.type)
        },
    },
    beforeCreate () {
        this.datePickerOptions = {
            shortcuts: [{
                text: 'Today',
                onClick (picker) {
                    picker.$emit('pick', new Date())
                },
            }, {
                text: 'Yesterday',
                onClick (picker) {
                    const date = new Date()
                    date.setTime(date.getTime() - 3600 * 1000 * 24)
                    picker.$emit('pick', date)
                },
            }, {
                text: 'A week ago',
                onClick (picker) {
                    const date = new Date()
                    date.setTime(date.getTime() - 3600 * 1000 * 24 * 7)
                    picker.$emit('pick', date)
                },
            }],
        }
    },
    methods: {
        onChoiceVote () {
            const choice = this.type === 'spectrum' ? this.spectrumValue / 100 : parseFloat(this.estimateValue)
            this.$emit('choose', choice)
        },
        onRemoveChoice () {
            this.$emit('choose', null)
        },
    },
}
</script>

<style lang="less" module>

.closeVoteButton {
    color: rgba(0, 0, 0, 0.7);
    font-size: 12px;
    cursor: pointer;
}

.choiceInput {
    display: flex;
    align-items: center;
    width: 100%;
}
.choiceInputNumber {
    width: 100%;
    margin-right: 2px;
}
.choiceSlider {
    height: 20px;
    width: 100%;
    margin-right: 8px;
}
.choiceSlider > div {
    margin: 8px 0 7px 0;
    background-color: white;
}
.confirmVote {
    font-size: 12px;
}

.quantityChoiceWrap {
    display: flex;
    align-items: center;
    padding-right: 8px;
    width: 100%;

    > span {
        font-size: 12px;
    }
}

.choiceWrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 36px;
    width: 100%;
    box-sizing: border-box;
}

.shortUnit {
    width: 30px;
}
</style>

<style lang="less">
.choiceWrap {
    .el-slider {
        &__runway {
            height: 4px;
        }

        &__bar {
            height: 4px;
        }

        &__button-wrapper {
            width: 34px;
            height: 34px;
        }

        &__button {
            width: 10px;
            height: 10px;
            border-width: 1px;
        }
    }

    .el-input {
        &__inner {
            padding: 0 8px;
        }
    }
}
</style>
