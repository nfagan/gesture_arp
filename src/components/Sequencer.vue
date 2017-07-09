<template>
	<div id="sequencer">
		<instrument v-show="modeIsInstrument"></instrument>
		<arrangement v-show="!modeIsInstrument"></arrangement>
	</div>
</template>

<script>
import Instrument from './Instrument';
import Arrangement from './Arrangement';
import { eventBus } from '../eventbus.js';

export default {
	name: 'sequencer',
	components: { Instrument, Arrangement },
	mounted() {
		let el = this.$el;
		function resizer() {
			el.style.width = window.innerWidth.toString() + 'px';
			el.style.height = window.innerHeight.toString() + 'px';
		}
		window.addEventListener('resize', resizer);
		resizer();
	},
	computed: {
		modeIsInstrument() {
			return this.$store.state.mode === 'INSTRUMENT';
		}
	},
	methods: {
		soundsAreLoaded() {
			return this.$store.state.soundsAreLoaded
		}
	}
}
</script>

<style>

#sequencer {
	height: 100vh;
	width: 100vw;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
