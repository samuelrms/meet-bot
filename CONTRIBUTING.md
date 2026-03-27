# Contributing to meet-music-bot / Contribuindo para o meet-music-bot

_(Português abaixo / Portuguese below)_

---

## 🇺🇸 English

First off, thank you for considering contributing to `meet-music-bot`! It's people like you that make open source such a great community.

### 1. Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

### 2. Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/samuelrms/meet-bot.git
   cd meet-bot
   ```

3. **Install dependencies**:
   This project strictly uses `pnpm`. If you don't have it, install it first.

   ```bash
   pnpm install
   ```

   _Note: our `package.json` enforces `pnpm` and sets up `husky` automatically._

### 3. Development Workflow

#### Project Structure

- `src/`: TypeScript source code (bot logic, Puppeteer automation, audio routing)
- `tests/`: Unit tests (Vitest)
- `docs/`: Architecture and Mermaid diagrams
- `TODO/`: Backlog and ideas

#### Git Hooks (Husky)

We use Husky to run essential checks automatically:

- **pre-commit**: Compiles TypeScript (`pnpm run build`) and runs tests without coverage (`pnpm run test`).
- **pre-push**: Runs tests with coverage and fails if the minimum coverage (60%) is not met.
- **commit-msg**: Enforces the [Conventional Commits](https://www.conventionalcommits.org/) format.

#### Commit Convention

Your commit messages must follow the Conventional Commits format:

```txt
<type>: <description>

[optional body]
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`.

#### Running Tests

Before opening a Pull Request, make sure all tests pass:

```bash
pnpm test
```

To run tests with a watcher during development:

```bash
pnpm run test:watch
```

### 4. Pull Requests

1. Create a new branch: `git checkout -b feature/my-new-feature` or `fix/issue-name`.
2. Make your changes and commit them (following the commit convention).
3. Pushing your changes will trigger the `pre-push` hook to ensure 60% test coverage.
4. Open a Pull Request on GitHub.
   - Use our provided PR template.
   - Wait for the CI pipeline to pass (it enforces the 60% coverage gate too).
   - We will review your code as soon as possible.

---

## 🇧🇷 Português

Antes de mais nada, muito obrigado por considerar contribuir para o `meet-music-bot`! São pessoas como você que fazem do open source uma ótima comunidade.

### 1. Código de Conduta

Este projeto e todos que participam dele são regidos pelo [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar, esperamos que você mantenha este código.

### 2. Primeiros Passos

1. Faça um **Fork** do repositório no GitHub.
2. Faça o **Clone** do seu fork localmente:

   ```bash
   git clone https://github.com/samuelrms/meet-bot.git
   cd meet-bot
   ```

3. **Instale as dependências**:
   Este projeto exige o uso do `pnpm`. Se você não o tiver, instale-o primeiro.

   ```bash
   pnpm install
   ```

   _Nota: nosso `package.json` aplica a restrição do `pnpm` e configura o `husky` automaticamente._

### 3. Fluxo de Desenvolvimento

#### Estrutura do Projeto

- `src/`: Código fonte em TypeScript (lógica do bot, automação Puppeteer, roteamento de áudio)
- `tests/`: Testes unitários (Vitest)
- `docs/`: Arquitetura e diagramas Mermaid
- `TODO/`: Backlog e ideias futuras

#### Git Hooks (Husky)

Nós usamos o Husky para rodar validações essenciais automaticamente:

- **pre-commit**: Compila o TypeScript (`pnpm run build`) e roda os testes rápidos (`pnpm run test`).
- **pre-push**: Roda os testes com cobertura total e garante que o mínimo de 60% seja atingido.
- **commit-msg**: Valida e obriga o formato do [Conventional Commits](https://www.conventionalcommits.org/).

#### Convenção de Commits

Suas mensagens de commit devem seguir o padrão Conventional Commits:

```txt
<tipo>: <descrição>

[corpo opcional]
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`.

#### Rodando Testes

Antes de abrir um Pull Request, garanta que todos os testes passem:

```bash
pnpm test
```

Para rodar testes com watch durante o desenvolvimento:

```bash
pnpm run test:watch
```

### 4. Pull Requests

1. Crie uma nova branch: `git checkout -b feature/minha-nova-funcionalidade` ou `fix/nome-do-problema`.
2. Faça suas alterações e o commit delas (seguindo a convenção de commits).
3. O push das alterações irá acionar o hook `pre-push` para garantir 60% de cobertura nos testes.
4. Abra um Pull Request no GitHub.
   - Use o nosso template de PR fornecido.
   - Aguarde o pipeline de CI passar (ele também aplica a barreira de 60% de cobertura).
   - Nós revisaremos seu código o mais rápido possível.
