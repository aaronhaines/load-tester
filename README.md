# Chrome Asset Load Contention Tester

A web-based performance test rig to investigate asset load contention in Chrome, specifically when loading many identical files in multiple iframes.

## Features

- Configure the number of iframes to test with
- Load multiple scripts/assets in each iframe
- Measure detailed timing data for each script load
- Visualize results with charts and tables
- Compare load times across different iframes
- Predefined test sets via configuration file

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure test URLs:

   - Edit `src/config/test-urls.json` to define your test URLs and sets
   - The configuration file supports:
     - Default iframe count
     - Default URL list
     - Named test sets with different URL collections

3. Start the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Configuration

The `test-urls.json` file structure:

```json
{
  "defaultIframeCount": 3,
  "urls": ["https://example.com/script1.js", "https://example.com/script2.js"],
  "testSets": {
    "small": {
      "name": "Small Test Set",
      "urls": [
        "https://example.com/small/script1.js",
        "https://example.com/small/script2.js"
      ]
    },
    "large": {
      "name": "Large Test Set",
      "urls": [
        "https://example.com/large/script1.js",
        "https://example.com/large/script2.js"
      ]
    }
  }
}
```

## Usage

1. Select a predefined test set or enter custom URLs
2. Adjust the number of iframes if needed
3. Click "Start Test" to begin the performance test
4. View the results in the chart and detailed table below

## How It Works

- Each iframe loads the same set of scripts/assets
- The test rig measures:
  - Individual script load times
  - Total load time per iframe
  - Overall test duration
- Results are collected via postMessage communication
- Data is visualized using Chart.js

## Technical Details

- Built with React + TypeScript
- Uses Vite for fast development and building
- Styled with Tailwind CSS
- Charts powered by Chart.js
- Zero-size iframes for accurate testing
- Configuration-driven test sets
