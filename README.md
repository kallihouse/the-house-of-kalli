# The House of Kalli

An upload-ready static landing page for Cloudflare Pages.

## Put it live

1. Open the GitHub repository `kallihouse/the-house-of-kalli`.
2. Choose **Add file → Upload files**.
3. Open this project folder and upload its **contents**: `index.html`, `css`, `images`, and `README.md`.
4. Commit the upload to the `main` branch.
5. Cloudflare Pages will publish the update automatically, usually within a minute or two.

## Replace the placeholder portrait

The landing page uses `images/hero.jpg`.

For the real portrait:

To replace it later, upload a new image named `hero.jpg` into the `images` folder and overwrite the existing file.

For best results, use a high-resolution portrait-oriented JPG. The CSS automatically crops it for desktop and mobile.

## Structure

```text
the-house-of-kalli/
├── index.html
├── return.html
├── waiting.html
├── css/
│   └── style.css
├── js/
│   ├── return-room.js
│   ├── site.js
│   └── waiting.js
├── functions/
│   └── api/
├── images/
│   ├── hero.jpg
│   └── hero-placeholder.svg
├── migrations/
│   ├── 0001_initial.sql
│   └── 0002_private_password.sql
└── README.md
```

## Private waiting-room passwords

1. Run `migrations/0002_private_password.sql` once in the existing D1 database.
2. Add an encrypted Cloudflare Pages secret named `ROOM_PASSWORD_SECRET`.
3. Upload the updated project contents to GitHub.

Passwords are converted into a keyed, non-readable lookup before they are saved. The return form is limited to five unsuccessful attempts per 15-minute window.
