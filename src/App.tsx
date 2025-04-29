import React, { useState, useCallback, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { TestConfig, TestResults, IframeResult, UrlConfig } from "./types";
import configData from "./config/test-urls.json";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const urlConfig: UrlConfig = configData;

const DEFAULT_CONFIG: TestConfig = {
  iframeCount: urlConfig.defaultIframeCount,
  urls: urlConfig.urls,
};

function App() {
  const [config, setConfig] = useState<TestConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [completedFrames, setCompletedFrames] = useState<number>(0);
  const [urlInput, setUrlInput] = useState(urlConfig.urls.join("\n"));
  const [selectedTestSet, setSelectedTestSet] = useState<string>("");

  useEffect(() => {
    // Initialize textarea with default URLs
    setUrlInput(config.urls.join("\n"));
  }, []);

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newUrlInput = e.target.value;
    setUrlInput(newUrlInput);
    // Update config URLs immediately when textarea changes
    const urls: string[] = newUrlInput
      .split("\n")
      .filter((url: string) => url.trim());
    setConfig((prev) => ({ ...prev, urls }));
  };

  const handleTestSetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const setName = e.target.value;
    setSelectedTestSet(setName);

    if (setName && urlConfig.testSets[setName]) {
      const testSet = urlConfig.testSets[setName];
      setUrlInput(testSet.urls.join("\n"));
      setConfig((prev) => ({ ...prev, urls: testSet.urls }));
    }
  };

  const handleIframeCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value) || 1;
    setConfig((prev: TestConfig) => ({ ...prev, iframeCount: count }));
  };

  const startTest = useCallback(() => {
    if (config.urls.length === 0) {
      alert("Please add some URLs first");
      return;
    }

    setIsRunning(true);
    setCompletedFrames(0);
    setResults(null);

    const startTime = performance.now();
    const iframeResults: IframeResult[] = [];

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "TEST_COMPLETE") {
        iframeResults.push({
          iframeId: event.data.iframeId,
          timings: event.data.timings,
          totalDuration: event.data.totalDuration,
        });

        setCompletedFrames((prev) => prev + 1);

        if (iframeResults.length === config.iframeCount) {
          const endTime = performance.now();
          setResults({
            results: iframeResults,
            startTime,
            endTime,
            totalDuration: endTime - startTime,
          });
          setIsRunning(false);
          window.removeEventListener("message", handleMessage);
        }
      }
    };

    window.addEventListener("message", handleMessage);
  }, [config]);

  const getChartData = useCallback(() => {
    if (!results) return null;

    const labels = results.results.map((r) => `Frame ${r.iframeId + 1}`);
    const durations = results.results.map((r) => r.totalDuration);

    return {
      labels,
      datasets: [
        {
          label: "Load Duration (ms)",
          data: durations,
          backgroundColor: "rgba(53, 162, 235, 0.5)",
        },
      ],
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Chrome Asset Load Contention Tester
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of iframes
              </label>
              <input
                type="number"
                min="1"
                value={config.iframeCount}
                onChange={handleIframeCountChange}
                className="input w-full max-w-xs"
                title="Number of iframes to create"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Test Set
              </label>
              <select
                value={selectedTestSet}
                onChange={handleTestSetChange}
                className="input w-full max-w-xs"
                title="Select a predefined set of test URLs"
              >
                <option value="">Custom URLs</option>
                {Object.entries(urlConfig.testSets).map(([key, set]) => (
                  <option key={key} value={key}>
                    {set.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URLs to load (one per line)
              </label>
              <textarea
                value={urlInput}
                onChange={handleUrlInputChange}
                className="input w-full h-32"
                placeholder="https://example.com/script1.js&#10;https://example.com/script2.js"
              />
            </div>

            <div>
              <button
                onClick={startTest}
                disabled={isRunning}
                className="btn btn-primary"
              >
                {isRunning ? "Test Running..." : "Start Test"}
              </button>
            </div>
          </div>
        </div>

        {isRunning && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Test Progress</h2>
            <p>
              Completed frames: {completedFrames} / {config.iframeCount}
            </p>
          </div>
        )}

        {results && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Summary</h3>
              <p>Total Duration: {results.totalDuration.toFixed(2)}ms</p>
              <p>Total Frames: {results.results.length}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Frame Load Times</h3>
              <div className="h-64">
                {getChartData() && (
                  <Bar
                    data={getChartData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        title: {
                          display: true,
                          text: "Frame Load Durations",
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Detailed Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frame
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration (ms)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scripts Loaded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.results.map((result) => (
                      <tr key={result.iframeId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Frame {result.iframeId + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.totalDuration.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.timings.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 h-0 overflow-hidden">
          {isRunning &&
            Array.from({ length: config.iframeCount }).map((_, i) => (
              <iframe
                key={i}
                src="/test-frame.html"
                style={{ width: 0, height: 0, border: "none" }}
                onLoad={() => {
                  const message = {
                    type: "START_TEST",
                    urls: config.urls,
                    iframeId: i,
                  };
                  (
                    document.getElementsByTagName("iframe")[
                      i
                    ] as HTMLIFrameElement
                  ).contentWindow?.postMessage(message, "*");
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;
