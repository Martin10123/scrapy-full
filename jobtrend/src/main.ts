import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import Toolbar from 'primevue/toolbar';

const app = createApp(App)
app.use(PrimeVue, {
    theme: {
        present: Aura
    }
})

app.component('Button', Button)
app.component('Card', Card)
app.component('Chart', Chart)
app.component('Toolbar', Toolbar)

app.mount('#app')
