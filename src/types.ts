export interface ScriptTiming {
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface IframeResult {
  iframeId: number;
  timings: ScriptTiming[];
  totalDuration: number;
}

export interface TestConfig {
  iframeCount: number;
  urls: string[];
}

export interface TestResults {
  results: IframeResult[];
  startTime: number;
  endTime: number;
  totalDuration: number;
}

export interface TestSet {
  name: string;
  urls: string[];
}

export interface TestSets {
  [key: string]: TestSet;
}

export interface UrlConfig {
  defaultIframeCount: number;
  urls: string[];
  testSets: TestSets;
}
