import '@fontsource/hanken-grotesk/200.css';
import '@fontsource/hanken-grotesk/300.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/michroma/400.css';
import '@fontsource/big-shoulders-display/900';
import './styles/base.css';
import './styles/layout.css';
import './styles/chapter.css';
import './styles/ui.css';
import { startApp } from './app.js';

startApp().catch((err) => console.error('[app] failed to start', err));
