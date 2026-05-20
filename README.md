# Portfolio — Giacomo Ceccarini

Jekyll site. Same structural conventions as the previous version — add a project by editing two files, nothing else.

## Add a new project

1. Add an entry in `_data/projects.yml` (this drives the home tile grid):

   ```yaml
   - title: "My New Project (2026)"
     slug: "my-new-project"
     category: "Game Programming"
     role: "Gameplay Programmer"
     team: 1
     duration: "2 Months"
     tech: "Unity (C#)"
     image: "/assets/img/my-new-project.png"
     video: "/assets/video/my-new-project.mp4"   # optional — auto-plays on tile hover & in hero
     description: "One-line summary that shows on the home tile."
     tags: ["Tag 1", "Tag 2", "Tag 3"]            # optional — shown in tile footer
   ```

2. Create `_projects/my-new-project.md` with the long write-up:

   ```markdown
   ---
   layout: project
   title: "My New Project (2026)"
   role: "Gameplay Programmer"
   team: 1
   duration: "2 Months"
   tech: "Unity (C#)"
   image: "/assets/img/my-new-project.png"
   video: "/assets/video/my-new-project.mp4"
   about: "Same as description above, or longer."
   ---

   ## Section title

   Markdown body. You can use the existing helper classes:

   <div class="gallery">
     <img src="/assets/img/something.png" alt="...">
     <img src="/assets/img/something-else.png" alt="...">
   </div>
   <p class="gallery-caption">Optional caption.</p>

   <div class="gallery gallery--single">
     <video src="/assets/video/something.mp4" autoplay muted loop playsinline></video>
   </div>

   <div class="feature-badge-row">
     <span class="feature-badge">Plugin Architecture</span>
     <span class="feature-badge">UObject States</span>
   </div>

   <div class="learned-box">
     <span class="learned-box__label">What this taught me</span>
     <p>...</p>
   </div>

   <a class="repo-link" href="https://github.com/..." target="_blank" rel="noopener">View on GitHub ↗</a>
   ```

Both files use the **same slug**. The page will be available at `/projects/<slug>/`.

## Edit personal info

- `_config.yml` — name, title, bio, social links, About section body.
- `_data/education.yml` — schools.
- `_data/skills.yml` — flat list of skills.

## Run locally

```bash
bundle install
bundle exec jekyll serve
```

Then visit http://localhost:4000.

## Notes on videos

Video paths in `_data/projects.yml` and the project front-matter point to `/assets/video/*.mp4`. The `assets/video/` folder is intentionally not committed in this snapshot — drop your MP4 files into it locally and they will be picked up automatically by the home tiles (lazy-played on intersection observer) and by the project hero (auto-play on load, click to open in a modal).
