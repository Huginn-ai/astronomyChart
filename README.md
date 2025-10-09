# 🌠 Astronomy Chart

A simple, interactive web app that shows which major stars and constellations are visible from a given **location** and **time**.  
Built with [SvelteKit](https://kit.svelte.dev/) and deployed on [Vercel](https://vercel.com).

👉 **Live Demo:** [https://mr-sky.vercel.app/](https://mr-sky.vercel.app/)

---

## ✨ Features

- 🌍 Input your **city name** or **latitude / longitude**  
- ⏰ Select a **date and time** to view the night sky  
- 🌌 Displays which famous stars are visible, including:
  - Sirius (天狼星)
  - Vega (织女一)
  - Betelgeuse (参宿四)
  - Arcturus (大角)
  - Altair (河鼓二)
  - ...and many more!
- 🎯 Simple interface, no external graphics or libraries required

---

## 🛠️ Tech Stack

- **Frontend:** [SvelteKit](https://kit.svelte.dev/)
- **Language:** TypeScript
- **Deployment:** [Vercel](https://vercel.com)
- **Styling:** CSS / HTML minimal UI

---

## 🚀 Getting Started

To run locally:

```bash
# 1. Clone the repository
git clone https://github.com/Huginn-ai/astronomyChart.git

# 2. Enter the project directory
cd astronomyChart

# 3. Install dependencies
npm install

# 4. Run the development server
npm run dev
```
Then open your browser to http://localhost:5173 (or whichever port is shown).

#🧭 Project Structure
astronomyChart/
├── src/
│   ├── routes/          # Pages (+page.svelte, +layout.svelte)
│   ├── lib/             # Star data, coordinate conversion
│   └── app.html         # HTML entry point
├── static/              # Public assets (favicon, robots.txt)
├── package.json
├── svelte.config.js
└── vite.config.ts

#🌙 Future Improvements

1. Add constellation drawings
2. Implement star magnitude filters
3. Display moon phase and planetary visibility
4. Support time zone auto-detection


#🪐 Author
Created by Caiqi (Maggie) Rao (github: Huginn-ai)
Feel free to visit the live site → mr-sky.vercel.app
