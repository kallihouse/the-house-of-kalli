# The House of Kalli

An upload-ready static landing page for Cloudflare Pages.

## Put it live

1. Open the GitHub repository `kallihouse/the-house-of-kalli`.
2. Choose **Add file → Upload files**.
3. Open this project folder and upload its **contents**: `index.html`, `css`, `images`, and `README.md`.
4. Commit the upload to the `main` branch.
5. Cloudflare Pages will publish the update automatically, usually within a minute or two.

## Replace the placeholder portrait

The landing page currently uses `images/hero-placeholder.svg`.

For the real portrait:

1. Add the image to the `images` folder as `hero.jpg`.
2. Open `css/style.css`.
3. Find `hero-placeholder.svg` and replace it with `hero.jpg`.
4. Commit both changes.

For best results, use a high-resolution portrait-oriented JPG. The CSS automatically crops it for desktop and mobile.

## Structure

```text
the-house-of-kalli/
├── index.html
├── css/
│   └── style.css
├── images/
│   └── hero-placeholder.svg
└── README.md
```
