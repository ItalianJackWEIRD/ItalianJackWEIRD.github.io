# Portfolio Jekyll Site

A portfolio site built with Jekyll, inspired by [tomaswallin.se](https://tomaswallin.se).

## Quick Start

```bash
# Install Ruby & Jekyll (if not already installed)
gem install bundler jekyll

# Install dependencies
bundle install

# Run locally
bundle exec jekyll serve

# Open http://localhost:4000
```

## How to Customize

### 1. Your personal info — `_config.yml`
Edit `author.name`, `author.title`, `author.bio`, `author.photo`, and `social` links.

### 2. Add your projects — `_data/projects.yml`
Each project entry:
```yaml
- title: "My Game (2024)"
  slug: "my-game"            # URL slug, no spaces
  category: "Game Programming"
  role: "Gameplay Programmer"
  team: 2                    # number of people
  duration: "3 Months"
  tech: "Unity (C#)"
  image: "/assets/img/my-game.png"
  description: "Short description shown on the card."
```

### 3. Add project detail pages — `_projects/`
Create `_projects/my-game.md`:
```markdown
---
layout: project
title: "My Game (2024)"
role: "Gameplay Programmer"
team: 2
duration: "3 Months"
tech: "Unity (C#)"
image: "/assets/img/my-game.png"
---

Your full project description here in Markdown.
```

### 4. Add images — `assets/img/`
- `profile.jpg` — your profile photo (square, at least 400×400px)
- `my-game.png` — project screenshots (16:9 ratio recommended)

### 5. Education — `_data/education.yml`
Edit the school names and degrees.

### 6. Skills — `_data/skills.yml`
Add or remove skill names in the list.

### 7. About section — `_config.yml`
Edit the `about.title` and `about.body` fields.

## File Structure

```
portfolio/
├── _config.yml          ← Site settings & personal info
├── _data/
│   ├── projects.yml     ← Project cards on homepage
│   ├── education.yml    ← Education section
│   └── skills.yml       ← Skills badges
├── _layouts/
│   ├── default.html     ← Base layout (header + footer)
│   └── project.html     ← Project detail page layout
├── _projects/           ← Individual project pages
│   ├── bug-shooter.md
│   └── bomberbots.md
├── assets/
│   ├── css/
│   │   └── style.scss   ← All styles
│   └── img/             ← Your images go here
├── index.html           ← Homepage
└── Gemfile
```
