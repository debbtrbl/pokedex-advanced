# Pokédex Linda Advanced 📱

Uma aplicação mobile de Pokédex desenvolvida com React Native e Expo, permitindo explorar e descobrir informações sobre diversos Pokémon.

### Pré-requisitos

- Node.js instalado

## 🚀 Como instalar e rodar

1. Clone o repositório

   ```bash
   git clone https://github.com/debbtrbl/pokedex-advanced.git
   ```
2. Entre na pasta do projeto

   ```bash
   cd pokedex-advanced
   ```
   
1. Instale as dependências

   ```bash
   npm install
   ```

2. Execute o projeto

   ```bash
   npx expo start
   ```
   ou
    ```bash
   npm start
   ```

Opções para Visualizar:
   
   - Expo Go: Escaneie o QR code com o app Expo Go

   -  Emulador: Pressione a para Android ou i para iOS

   - Web: Pressione w para versão web


## ✅ Funcionalidades Principais

 - Lista infinita (Infinite Scroll) de Pokémon com imagem, nome, tipo e número;
   
 - Filtro por tipos;

- Busca otimizada com Debounce;

- Modal de detalhes com informações completas;

- Tratamento de erros com mensagens amigáveis e botão de tentar novamente.

- Proteção contra Race Conditions;

- Cancelamento de requisições obsoletas;

- Timeouts: Proteção contra requisições travadas;

- Retry System: Implementação de retentativas automáticas com Backoff Exponencial e Jitter para conexões instáveis.

- Modo Offline: O app avisa quando está sem internet, mas continua funcionando com dados salvos no cache.

- Background Refresh: Atualização silenciosa dos dados em cache quando a conexão é restabelecida.

## 🔧 Tecnologias

- Expo + React Native

- React Native Paper para UI components

- TypeScript para tipagem

- AsyncStorage para armazenamento

- NetInfo para rede/conectividade

- PokeAPI para dados dos Pokémon

##  📸 Screenshots
#### Tela principal com lista de pokémon, pesquisa por tipo e modal de detalhes
<img src="./assets/screenshots/home.png" width="200" alt="Tela Principal"> <img src="./assets/screenshots/filtro.png" width="200" alt="Detalhes do Pokémon"> <img src="./assets/screenshots/modal.png" width="200" alt="Detalhes do Pokémon">

