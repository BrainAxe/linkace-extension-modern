# LinkAce Extension - Modern

A modern Chrome extension for [LinkAce](https://github.com/Kovah/LinkAce) built with Vue 3, Vite, and Manifest V3.

## Features

- ✅ Add new bookmarks
- ✅ Edit existing bookmarks
- ✅ Autocomplete for tags and lists
- ✅ Check current page automatically
- ✅ Search links in address bar (omnibox)
- ✅ Modern UI with Element Plus
- ✅ Manifest V3 compliant
- ✅ Fast development with Vite HMR

## Tech Stack

- **Vue 3.4+** - Modern reactive framework with Composition API
- **Vite 5+** - Lightning-fast build tool
- **Element Plus** - Vue 3 UI component library
- **Manifest V3** - Latest Chrome extension standard
- **Axios 1.7+** - HTTP client with security updates

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

This will build the extension and watch for changes. Load the `dist` folder in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### Build for Production

```bash
npm run build
```

The built extension will be in the `dist` folder.

## Usage

### Setup

1. Click the extension icon
2. Click the settings button
3. Enter your LinkAce API URL and token
4. Save settings

### Search Links in Address Bar

Type `l` followed by a space in the address bar to search your LinkAce bookmarks:

- `#tagname` - Search by tag
- `@listname` - Search by list
- Any other text - Search in URLs

Multiple operators can be combined with AND logic.

Example: `l google @list1 #tag1` will find links that:
- Are in list1
- Are tagged with tag1
- Contain "google" in the URL

### Badge Status

The extension icon badge shows the status of the current page:
- **Yellow (o)** - Checking...
- **Green (√)** - Page is bookmarked in LinkAce
- **Red (!)** - Error connecting to LinkAce
- **No badge** - Page is not bookmarked

## License

MIT
