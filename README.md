## Note: This was an experiment in using claude's computer use api through a chrome extension, but due to chrome's security policies, it wasn't possible to get this working.

# Claude Browser Assistant

A Chrome extension that allows users to control their browser using natural language instructions powered by Claude AI.

## Author

- GitHub: [@bikz](https://github.com/bikz)

## Features

- Natural language browser control
- Configurable display settings
- Secure API key management
- Rate limiting and error handling
- Responsive popup interface

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon and open settings
2. Enter your Anthropic API key
3. Adjust display settings if needed
4. Save your settings

## Usage

1. Click the extension icon to open the popup
2. Enter your instruction in natural language
3. Click "Execute" to run the instruction
4. View the results in the popup

## Development ##

### Prerequisites

- Node.js 14+
- Chrome browser

### Build

# Install dependencies
- npm install

# Run in development mode with hot reloading
- npm run dev

# Create production build
- npm run build


## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/bikz/claude-browser-assistant/issues).

## Show your support

Give a ⭐️ if this project helped you!

## License

This project is [MIT](LICENSE) licensed.

## Acknowledgments

- Built with [Anthropic's Claude API](https://anthropic.com)

## Setup

1. Get an API key from Anthropic:
   - Sign up at [Anthropic's website](https://www.anthropic.com)
   - Navigate to your account settings
   - Generate a new API key with Computer Use beta access
   - Keep this key secure and never share it publicly

2. Configure the extension:
   - Click the extension icon in Chrome
   - Click the ⚙️ (settings) button
   - Enter your Anthropic API key
   - Adjust display settings if needed
   - Click "Save Settings"

> ⚠️ **Security Note**: Your API key is stored securely in Chrome's sync storage. Never share your API key or commit it to version control.
