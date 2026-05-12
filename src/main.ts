import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import 'primeicons/primeicons.css';
import PrimeVue from 'primevue/config'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const JobTrendPreset = definePreset(Aura, {
	semantic: {
		primary: {
			50: '{blue.50}',
			100: '{blue.100}',
			200: '{blue.200}',
			300: '{blue.300}',
			400: '{blue.400}',
			500: '{blue.500}',
			600: '{blue.600}',
			700: '{blue.700}',
			800: '{blue.800}',
			900: '{blue.900}',
			950: '{blue.950}'
		},
		colorScheme: {
			light: {
				surface: {
					0: '#ffffff',
					50: '{slate.50}',
					100: '{slate.100}',
					200: '{slate.200}',
					300: '{slate.300}',
					400: '{slate.400}',
					500: '{slate.500}',
					600: '{slate.600}',
					700: '{slate.700}',
					800: '{slate.800}',
					900: '{slate.900}',
					950: '{slate.950}'
				},
				formField: {
					background: '{surface.0}',
					disabledBackground: '{surface.100}',
					borderColor: '{surface.200}',
					hoverBorderColor: '{primary.300}',
					color: '{surface.900}',
					placeholderColor: '{surface.500}'
				},
				primary: {
					color: '{primary.500}',
					inverseColor: '#ffffff',
					hoverColor: '{primary.600}',
					activeColor: '{primary.700}'
				},
				highlight: {
					background: '{primary.50}',
					focusBackground: '{primary.100}',
					color: '{primary.700}',
					focusColor: '{primary.800}'
				}
			}
		}
	}
})

const app = createApp(App)

app.use(PrimeVue, {
	theme: {
		preset: JobTrendPreset,
		options: {
			darkModeSelector: false
		}
	}
})

app.mount('#app')
