<template>
	<div class="cell">
		<div @click="switchToSequence()" :class="cellClass">
			<canvas class="instrument__canvas"></canvas>
		</div>
	</div>
</template>

<script type="text/javascript">

import { eventBus } from '../eventbus.js';

export default {
	name: 'cell',
	props: ['index', 'sequenceSetId', 'sequenceId'],
	data() {
		return {
			shapeExists: false
		}
	},
	computed: {
		cellClass() {
			let className = 'circle';
			if (this.shapeExists) {
				className += ' circle--active';
			}
			return className;
		}
	},
	methods: {
		sequenceExists() {
			let manager = this.$store.state.sequenceSetManager;
			return manager.sequenceExists(this.sequenceSetId, this.index);
		},
		shapeExists() {
			let manager = this.$store.state.sequenceSetManager;
			return manager.shapeExists(this.sequenceSetId, this.index);
		},
		switchToSequence() {
			let manager = this.$store.state.sequenceSetManager;
			manager.handleClickedSequence(this.sequenceSetId, this.index, this.$store);
			this.switchToInstrument();
		},
		switchToInstrument() {
			this.$store.commit('switchMode', 'INSTRUMENT');
		},
	},
	mounted() {
		let canvas = this.$el.children[0].children[0],
			topic = eventBus.topicMap.newSurface,
			index = this.index,
			sequenceSetId = this.sequenceSetId,
			self = this;
		eventBus.publish(topic, {
			element: canvas,
			values: {
				type: 'ARRANGEMENT',
				index,
				sequenceSetId
			}
		});
		eventBus.subscribe(eventBus.topicMap.newShapeReady, function(data) {
			if (data.sequenceId !== self.sequenceId) return;
			if (data.shape === undefined) {
				self.shapeExists = false;
			} else {
				self.shapeExists = true;
			}
		});
	}
}
</script>

<style type="text/css">
	@import '../style/_style.scss';
</style>

<style scoped>

canvas {
	width: 100%;
	height: 100%;
	border-radius: 50%;
}

.cell {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 50px;
	width: 50px;
}
</style>