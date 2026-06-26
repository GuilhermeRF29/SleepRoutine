# ⚡ SleepRoutine

O **SleepRoutine** é um aplicativo de monitoramento e análise de sono local-first, desenvolvido em **React (TypeScript)**, **Vite** e **Tailwind CSS v4**. Ele foi projetado com uma interface escura e moderna com duas experiências de navegação otimizadas: responsiva para smartphones (com barra inferior) e um painel robusto multi-colunas para desktop.

---

## ✨ Principais Funcionalidades

1. **Painel de Controle (Dashboard)**:
   - **Score de Estabilidade**: Calculado de forma dinâmica com base nos desvios de horários (dormir/acordar), quantidade de despertares noturnos e qualidade reportada.
   - **Indicadores de Consistência**: Status automáticos como *Estável*, *Em Recuperação*, *Desvio Leve* ou *Desregulado*.
   - **Resumo de Última Noite**: Métricas rápidas e alertas personalizados (ex: débito de sono, descompensações).

2. **Registro de Sono Manual**:
   - Controle de horários exatos de deitar e levantar.
   - Avaliação qualitativa de sono (estrelas 1 a 5).
   - Inclusão de **despertares noturnos** (hora e duração).
   - Tags de fatores influenciadores (☕ Cafeína, 💪 Treino à noite, 📱 Tela, 🤯 Estresse, 🍺 Bebida alcoólica, 🍕 Refeição pesada) e notas pessoais.

3. **Histórico Organizado**:
   - Agrupamento visual automático por **Mês** (ex: *Junho de 2026*).
   - Divisores pontilhados detalhando a **Semana de referência** para facilitar a navegação.
   - Cards expansíveis com detalhes completos e atalhos rápidos para editar ou excluir noites.

4. **Análise e Tendências (Recharts)**:
   - Gráfico de barra de horas de sono relativo às suas metas.
   - Gráfico de área da janela de consistência de horários de dormir/acordar.
   - **Heatmap de consistência (28 dias)**: Calendário interativo classificando o sono entre *Bom*, *Médio* ou *Ajustar*.
   - Comparação direta de médias entre dias úteis (Seg-Sex) e fins de semana (Sáb-Dom).

5. **Privacidade e Importação Local-First**:
   - Seus dados não saem do seu navegador. Toda a persistência é feita via **localStorage** e **IndexedDB**.
   - **Sincronização Automática de Pasta**: Usa a *File System Access API* do navegador para permitir conectar uma pasta local sincronizada com o Google Drive/Takeout (atualize seus dados com apenas 1 clique).
   - **Importação de Smartwatches (Zepp CSV / Google Fit Takeout)**: Importa facilmente arquivos CSV do aplicativo Zepp e arquivos JSON `_SLEEP` ou fluxos brutos do Google Takeout.
   - **Backup e Demo**: Ferramentas para exportar/importar dados em JSON e gerador de histórico simulado (dados demo) para testes instantâneos.

---

## 🛠️ Tecnologias Utilizadas

- **React 19** & **TypeScript**
- **Vite** (Build Tool ultra-rápida)
- **Tailwind CSS v4** (Estilização moderna e otimizada)
- **Recharts** (Visualização interativa de gráficos)
- **Lucide React** (Pacote de ícones premium)
- **IndexedDB** & **File System Access API** (Sincronização local persistente)

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/GuilhermeRF29/SleepRoutine.git
cd SleepRoutine
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Executar o servidor de desenvolvimento
```bash
npm run dev
```
Abra o endereço [http://localhost:5173/](http://localhost:5173/) no seu navegador.

---

## 📦 Como Publicar na Vercel (Gratuito)

Este projeto está pronto para deploy estático na Vercel com apenas um clique:

1. Acesse [vercel.com](https://vercel.com/) e crie uma conta usando seu **GitHub**.
2. Clique em **Add New...** -> **Project** e importe este repositório `SleepRoutine`.
3. Clique em **Deploy**. A Vercel detectará as configurações do Vite automaticamente e colocará o site no ar.
