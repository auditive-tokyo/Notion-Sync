# 🚀 Contributing to NotionSync

Hey there! Thanks for checking out **NotionSync** — we're genuinely glad you're here. Whether you're fixing a bug, improving the sync logic, or building two-way sync support, your time and effort matter a lot. This project exists to keep your Notion workspace backed up and searchable in GitHub, and we'd love for you to be part of it.

---

## 💡 What You Can Contribute

There are many ways to help! Code, docs, testing, and ideas are all welcome.

**You can:**

- 🐛 Report bugs or edge cases
- 💬 Suggest new features or improvements
- 🔄 Implement two-way sync (GitHub → Notion)
- 📖 Improve documentation and examples
- 🧪 Add or improve tests
- 🚀 Optimize sync performance
- 🧰 Refactor code for clarity and maintainability

If you're new to open source, this is a great place to start. We've tagged some issues as `good first issue` to help you find friendly entry points.

---

## ⚙️ Getting Set Up

Before you jump in, make sure your environment is ready:

- **Node.js 20+**
- **npm 10+** (comes with Node)

### Quick Setup

```bash
# 1. Fork the repo
https://github.com/auditive-tokyo/Notion-Sync/fork

# 2. Clone your fork
git clone https://github.com/<your-username>/Notion-Sync.git
cd Notion-Sync

# 3. Add the original repo as upstream (to stay in sync)
git remote add upstream https://github.com/auditive-tokyo/Notion-Sync.git

# 4. Install dependencies
npm install

# 5. Run tests to verify setup
npm run test:run
```

## 🔎 Before You Start

- **README**: [Setup Guide](./README.md)
- **Good first issues**: https://github.com/auditive-tokyo/Notion-Sync/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

## 🏷️ Label Glossary

- **good first issue**: Beginner-friendly tasks with small scope
- **help wanted**: We'd love community input here
- **bug**: Something is broken
- **enhancement**: Feature request or improvement
- **documentation**: Docs-only changes
- **two-way-sync**: Related to GitHub → Notion sync
- **performance**: Performance optimization

---

## 🧑‍💻 Making Changes

Here's the workflow:

1. **Create a new branch** for your change:

   ```bash
   git checkout -b feat/two-way-sync
   # or
   git checkout -b fix/notion-api-timeout
   ```

2. **Code style:**
   - We use **TypeScript** with strict mode
   - No `console.log` (use error handling instead)
   - Keep functions small and focused
   - Write clear variable names

3. **Commit messages:**
   Use [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   feat(sync): add two-way sync support
   fix(client): handle Notion API rate limits
   test(sync): add tests for page hierarchy
   docs(readme): clarify API setup steps
   ```

4. **Validation:**
   Run these before committing:

   ```bash
   npm run lint        # ESLint
   npm run typecheck   # TypeScript
   npm run test:run    # Tests
   ```

5. **Testing:**
   - Add tests for new features in `src/test/`
   - Run `npm run test:coverage` to check coverage
   - Test with real Notion workspaces if possible

---

## 🚀 Submitting a Pull Request

When your change is ready:

1. Push your branch to your fork:

   ```bash
   git push origin feat/two-way-sync
   ```

2. Open a pull request against the **`main`** branch of `auditive-tokyo/Notion-Sync`.

3. In your PR description:
   - Explain what problem you solved and _why_ it matters
   - Include relevant issue numbers (e.g., "Fixes #123")
   - Mention any breaking changes
   - Add reproduction steps if it's a bug fix

We try to review PRs within a few days. If you don't hear back quickly, a polite ping is totally fine.

---

## 🧩 Reporting Issues

Found a bug or have an idea? Open an issue!

Please include:

- What you were trying to do
- What you expected to happen
- What actually happened (logs/screenshots help!)
- Your environment (Node version, OS, etc.)

Before opening a new issue, check if it already exists — we might already be on it.

For feature requests, be descriptive. For example:

> "Add support for syncing Notion databases as JSON files instead of CSV"

That kind of detail helps prioritize.

---

## 💬 Need Help?

If you're stuck or just want to talk about an idea:

- Open a **GitHub Issue** or **Discussion**
- Drop a comment on a related PR

We're friendly folks — promise. 🙂

---

## 🌸 A Few Final Tips

- Small PRs are easier to review than massive ones. Break things up when you can.
- Don't worry about perfection. We'd rather have your ideas early than never.
- If something's unclear, _ask_. That's how we improve docs like this one.
- Test your changes thoroughly before submitting — especially with real Notion data!

---

## ❤️ Thank You

Seriously — thanks for taking the time to read this. Every contribution, big or small, keeps NotionSync better.

Happy coding! 🚀
