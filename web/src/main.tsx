import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { Atividade } from './Atividade.tsx';
import './styles.css';

// Rotas pelo endereço: /impostor-rede/atividade (o build copia o index.html para essa pasta).
const route = location.pathname.slice(import.meta.env.BASE_URL.length).replace(/\/+$/, '');
const Page = route === 'atividade' ? Atividade : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
