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
  const [tab, setTab] = useState<"contention" | "multi">("contention");
  const [config, setConfig] = useState<TestConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [completedFrames, setCompletedFrames] = useState<number>(0);
  const [urlInput, setUrlInput] = useState(urlConfig.urls.join("\n"));
  const [selectedTestSet, setSelectedTestSet] = useState<string>("");
  // Multi-iframe Loader state
  const [multiUrl, setMultiUrl] = useState<string>("");
  const [multiCount, setMultiCount] = useState<number>(3);
  const [multiDelay, setMultiDelay] = useState<number>(0);
  const [multiRunning, setMultiRunning] = useState(false);
  const [multiTimings, setMultiTimings] = useState<number[]>([]);

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
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 px-2">
          Chrome Asset Load Contention Tester
        </h1>

        {/* Tabs */}
        <div className="mb-8 flex gap-4">
          <button
            className={`btn ${
              tab === "contention" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setTab("contention")}
          >
            Contention Test
          </button>
          <button
            className={`btn ${
              tab === "multi" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setTab("multi")}
          >
            Multi-iframe Loader
          </button>
        </div>

        {tab === "contention" && (
          <div className="flex flex-row w-full gap-6">
            {/* Left Column - Configuration */}
            <div className="w-96">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-xl font-semibold mb-4">
                  Test Configuration
                </h2>

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
                      className="input w-full"
                      title="Number of iframes to create"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay between iframe loads (ms)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.delayMs ?? 0}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          delayMs: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="input w-full"
                      title="Delay in milliseconds between each iframe load"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Test Set
                    </label>
                    <select
                      value={selectedTestSet}
                      onChange={handleTestSetChange}
                      className="input w-full"
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
                      className="input w-full h-64"
                      placeholder="https://example.com/script1.js&#10;https://example.com/script2.js"
                    />
                  </div>

                  <div>
                    <button
                      onClick={startTest}
                      disabled={isRunning}
                      className="btn btn-primary w-full"
                    >
                      {isRunning ? "Test Running..." : "Start Test"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="flex-1 min-w-0">
              {isRunning && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Test Progress</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (completedFrames / config.iframeCount) * 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {completedFrames} / {config.iframeCount}
                    </span>
                  </div>
                </div>
              )}

              {results && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-6">Test Results</h2>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium mb-3">Summary</h3>
                      <p className="text-gray-700 mb-2">
                        Total Duration:{" "}
                        <span className="font-semibold">
                          {results.totalDuration.toFixed(2)}ms
                        </span>
                      </p>
                      <p className="text-gray-700">
                        Total Frames:{" "}
                        <span className="font-semibold">
                          {results.results.length}
                        </span>
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium mb-3">Statistics</h3>
                      <p className="text-gray-700 mb-2">
                        Average Load Time:{" "}
                        <span className="font-semibold">
                          {(
                            results.results.reduce(
                              (acc, r) => acc + r.totalDuration,
                              0
                            ) / results.results.length
                          ).toFixed(2)}
                          ms
                        </span>
                      </p>
                      <p className="text-gray-700">
                        Total Scripts:{" "}
                        <span className="font-semibold">
                          {results.results.reduce(
                            (acc, r) => acc + r.timings.length,
                            0
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">
                      Frame Load Times
                    </h3>
                    <div className="h-80">
                      {getChartData() && (
                        <Bar
                          data={getChartData()!}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              title: {
                                display: true,
                                text: "Frame Load Durations",
                                padding: 20,
                                font: {
                                  size: 16,
                                  weight: 500,
                                },
                              },
                              legend: {
                                position: "top",
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: "Duration (ms)",
                                },
                              },
                            },
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">
                      Detailed Results
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                            <tr
                              key={result.iframeId}
                              className="hover:bg-gray-50"
                            >
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
            </div>
          </div>
        )}

        {tab === "multi" && (
          <div className="flex flex-row w-full gap-6">
            <div className="w-96">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-xl font-semibold mb-4">
                  Multi-iframe Loader
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL to load
                    </label>
                    <input
                      type="text"
                      value={multiUrl}
                      onChange={(e) => setMultiUrl(e.target.value)}
                      className="input w-full"
                      placeholder="https://example.com"
                      title="URL to load in all iframes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of iframes
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={multiCount}
                      onChange={(e) =>
                        setMultiCount(
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="input w-full"
                      title="Number of iframes to create"
                      placeholder="Number of iframes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay between iframe loads (ms)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={multiDelay}
                      onChange={(e) =>
                        setMultiDelay(
                          Math.max(0, parseInt(e.target.value) || 0)
                        )
                      }
                      className="input w-full"
                      title="Delay in milliseconds between each iframe load"
                      placeholder="Delay in ms"
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setMultiRunning(true);
                        setMultiTimings([]);
                      }}
                      disabled={multiRunning || !multiUrl}
                      className="btn btn-primary w-full"
                    >
                      {multiRunning ? "Loading..." : "Load Iframes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {multiRunning && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Iframes Loading
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `100%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {multiCount} iframes
                    </span>
                  </div>
                </div>
              )}
              {multiTimings.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">
                    Iframe Load Timings
                  </h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Iframe
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Load Time (ms)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {multiTimings.map((t, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {i + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {t.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Iframes for both tabs */}
        <div className="fixed bottom-0 left-0 right-0 h-0 overflow-hidden">
          {tab === "contention" && isRunning && (
            <StaggeredIframes
              count={config.iframeCount}
              delayMs={config.delayMs ?? 0}
              urls={config.urls}
            />
          )}
          {tab === "multi" && multiRunning && multiUrl && (
            <StaggeredMultiIframes
              count={multiCount}
              delayMs={multiDelay}
              url={multiUrl}
              onFinish={() => setMultiRunning(false)}
              setTimings={setMultiTimings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StaggeredIframes({
  count,
  delayMs,
  urls,
}: {
  count: number;
  delayMs: number;
  urls: string[];
}) {
  const [loaded, setLoaded] = React.useState(0);

  React.useEffect(() => {
    setLoaded(0);
    if (count === 0) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    function loadNext(i: number) {
      if (cancelled) return;
      setLoaded((l) => Math.max(l, i + 1));
      if (i + 1 < count) {
        timeout = setTimeout(() => loadNext(i + 1), delayMs);
      }
    }
    loadNext(0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [count, delayMs, urls]);

  return (
    <>
      {Array.from({ length: loaded }).map((_, i) => (
        <iframe
          key={i}
          src="/test-frame.html"
          style={{ width: 0, height: 0, border: "none" }}
          onLoad={() => {
            const message = {
              type: "START_TEST",
              urls,
              iframeId: i,
            };
            (
              document.getElementsByTagName("iframe")[i] as HTMLIFrameElement
            ).contentWindow?.postMessage(message, "*");
          }}
        />
      ))}
    </>
  );
}

function StaggeredMultiIframes({
  count,
  delayMs,
  url,
  onFinish,
  setTimings,
}: {
  count: number;
  delayMs: number;
  url: string;
  onFinish?: () => void;
  setTimings: React.Dispatch<React.SetStateAction<number[]>>;
}) {
  const [loaded, setLoaded] = React.useState(0);
  const startTimes = React.useRef<number[]>([]);
  const endTimes = React.useRef<number[]>([]);

  React.useEffect(() => {
    setLoaded(0);
    setTimings([]);
    startTimes.current = [];
    endTimes.current = [];
    if (count === 0) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    function loadNext(i: number) {
      if (cancelled) return;
      setLoaded((l) => Math.max(l, i + 1));
      startTimes.current[i] = performance.now();
      if (i + 1 < count) {
        timeout = setTimeout(() => loadNext(i + 1), delayMs);
      } else if (onFinish) {
        setTimeout(onFinish, 1000);
      }
    }
    loadNext(0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [count, delayMs, url, onFinish, setTimings]);

  React.useEffect(() => {
    if (loaded === 0) return;
    const handleLoad = (i: number) => {
      endTimes.current[i] = performance.now();
      setTimings((t) => {
        const newTimings = [...t];
        newTimings[i] = endTimes.current[i] - (startTimes.current[i] || 0);
        return newTimings;
      });
    };
    for (let i = 0; i < loaded; i++) {
      const iframe = document.getElementById(
        `multi-iframe-${i}`
      ) as HTMLIFrameElement | null;
      if (iframe && !iframe.dataset.loaded) {
        iframe.onload = () => {
          handleLoad(i);
          iframe.dataset.loaded = "true";
        };
      }
    }
  }, [loaded, url, setTimings]);

  return (
    <>
      {Array.from({ length: loaded }).map((_, i) => (
        <iframe
          key={i}
          id={`multi-iframe-${i}`}
          src={url}
          style={{ width: 0, height: 0, border: "none" }}
        />
      ))}
    </>
  );
}

export default App;
