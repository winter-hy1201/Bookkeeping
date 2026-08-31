<template>
	<view class="uni-numbox" :class="{ 'uni-numbox--disabled': disabled, 'uni-numbox--focused': focused }"
		:style="{background}">
		<view @click="_calcValue('minus')" class="uni-numbox__minus uni-numbox-btns"
			:class="{ 'uni-numbox-btns--disabled': inputValue <= min || disabled }"
			:style="{background, color}" role="button" aria-label="减少"
			:aria-disabled="inputValue <= min || disabled">
			<HejiIcon name="Minus" :size="16" />
		</view>
		<input :disabled="disabled" @focus="_onFocus" @blur="_onBlur" class="uni-numbox__value"
			:type="step<1?'digit':'number'" v-model="inputValue" :style="{background, color, width:widthWithPx}" />
		<view @click="_calcValue('plus')" class="uni-numbox__plus uni-numbox-btns"
			:class="{ 'uni-numbox-btns--disabled': inputValue >= max || disabled }"
			:style="{background, color}" role="button" aria-label="增加"
			:aria-disabled="inputValue >= max || disabled">
			<HejiIcon name="Plus" :size="16" />
		</view>
	</view>
</template>
<script>
	import HejiIcon from "../../../../components/HejiIcon.vue";

	/**
	 * NumberBox 数字输入框
	 * @description 带加减按钮的数字输入框
	 * @tutorial https://ext.dcloud.net.cn/plugin?id=31
	 * @property {Number} value 输入框当前值
	 * @property {Number} min 最小值
	 * @property {Number} max 最大值
	 * @property {Number} step 每次点击改变的间隔大小
	 * @property {String} background 背景色
	 * @property {String} color 字体颜色（前景色）
	 * @property {Number} width 输入框宽度(单位:px)
	 * @property {Boolean} disabled = [true|false] 是否为禁用状态
	 * @event {Function} change 输入框值改变时触发的事件，参数为输入框当前的 value
	 * @event {Function} focus 输入框聚焦时触发的事件，参数为 event 对象
	 * @event {Function} blur 输入框失焦时触发的事件，参数为 event 对象
	 */

	export default {
		name: "UniNumberBox",
		components: {
			HejiIcon
		},
		emits: ['change', 'input', 'update:modelValue', 'blur', 'focus'],
		props: {
			value: {
				type: [Number, String],
				default: 1
			},
			modelValue: {
				type: [Number, String],
				default: 1
			},
			min: {
				type: Number,
				default: 0
			},
			max: {
				type: Number,
				default: 100
			},
			step: {
				type: Number,
				default: 1
			},
			background: {
				type: String,
				default: 'var(--hej-color-control)'
			},
			color: {
				type: String,
				default: 'var(--hej-color-text)'
			},
			disabled: {
				type: Boolean,
				default: false
			},
			width: {
				type: Number,
				default: 40,
			}
		},
		data() {
			return {
				inputValue: 0,
				focused: false
			};
		},
		watch: {
			value(val) {
				this.inputValue = +val;
			},
			modelValue(val) {
				this.inputValue = +val;
			}
		},
		computed: {
			widthWithPx() {
				return this.width + 'px';
			}
		},
		created() {
			if (this.value === 1) {
				this.inputValue = +this.modelValue;
			}
			if (this.modelValue === 1) {
				this.inputValue = +this.value;
			}
		},
		methods: {
			_calcValue(type) {
				if (this.disabled) {
					return;
				}
				const scale = this._getDecimalScale();
				let value = this.inputValue * scale;
				let step = this.step * scale;
				if (type === "minus") {
					value -= step;
					if (value < (this.min * scale)) {
						return;
					}
					if (value > (this.max * scale)) {
						value = this.max * scale
					}
				}

				if (type === "plus") {
					value += step;
					if (value > (this.max * scale)) {
						return;
					}
					if (value < (this.min * scale)) {
						value = this.min * scale
					}
				}

				this.inputValue = (value / scale).toFixed(String(scale).length - 1);
				// TODO vue2 兼容
				this.$emit("input", +this.inputValue);
				// TODO vue3 兼容
				this.$emit("update:modelValue", +this.inputValue);
				this.$emit("change", +this.inputValue);
			},
			_getDecimalScale() {

				let scale = 1;
				// 浮点型
				if (~~this.step !== this.step) {
					scale = Math.pow(10, String(this.step).split(".")[1].length);
				}
				return scale;
			},
			_onBlur(event) {
				this.focused = false;
				this.$emit('blur', event)
				let value = event.detail.value;
				if (isNaN(value)) {
					this.inputValue = this.value;
					return;
				}
				value = +value;
				if (value > this.max) {
					value = this.max;
				} else if (value < this.min) {
					value = this.min;
				}
				const scale = this._getDecimalScale();
				this.inputValue = value.toFixed(String(scale).length - 1);
				this.$emit("input", +this.inputValue);
				this.$emit("update:modelValue", +this.inputValue);
				this.$emit("change", +this.inputValue);
			},
			_onFocus(event) {
				this.focused = true;
				this.$emit('focus', event)
			}
		}
	};
</script>
<style lang="scss">
	.uni-numbox {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		width: 100%;
		height: 72rpx;
		padding: 0 $hej-space-3;
		border: 1rpx solid $hej-color-border;
		border-radius: $hej-radius-control;
		background-color: $hej-color-control;
	}

	.uni-numbox-btns {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		align-items: center;
		justify-content: center;
		flex: 0 0 40rpx;
		box-sizing: border-box;
		width: 40rpx;
		height: 40rpx;
		padding: 0;
		border: 1rpx solid $hej-color-border-strong;
		border-radius: 50%;
		background-color: $hej-color-control;
		color: $hej-color-text;
		font-size: 0;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */
	}

	.uni-numbox__value {
		flex: 1 1 auto;
		min-width: 0;
		height: 72rpx;
		margin: 0 $hej-space-3;
		padding: 0;
		box-sizing: border-box;
		background-color: transparent;
		text-align: center;
		font-size: $hej-font-body;
		font-weight: 600;
		border-width: 0;
		color: $hej-color-text;
	}

	.uni-numbox--focused {
		border-color: $hej-color-accent;
	}

	.uni-numbox--disabled {
		background-color: $hej-color-control-disabled !important;
		border-color: $hej-color-border !important;
	}

	.uni-numbox--disabled .uni-numbox__value {
		background: transparent !important;
		color: $hej-color-text-tertiary !important;
	}

	.uni-numbox--disabled .uni-numbox-btns {
		background-color: $hej-color-control-disabled !important;
	}

	.uni-numbox-btns--disabled {
		border-color: $hej-color-border !important;
		color: $hej-color-text-tertiary !important;
		cursor: not-allowed !important;
	}

	.uni-numbox-btns:not(.uni-numbox-btns--disabled):active {
		border-color: $hej-color-accent;
		background-color: $hej-color-accent-soft !important;
	}

</style>
