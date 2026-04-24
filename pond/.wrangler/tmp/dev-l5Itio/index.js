var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-FIWTcb/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/pond-do.ts
import { DurableObject } from "cloudflare:workers";

// src/constants.ts
var POND = {
  /** Bounding radius in meters. The gourd fits comfortably inside a
   *  circle of this radius. Retained for back-compat with any code
   *  that wants a coarse pond-scale number. Prefer pondSDF() for any
   *  actual containment check. (§ III) */
  radius: 5,
  /** Maximum depth at the deep centroid of the larger basin. (§ III) */
  maxDepth: 3,
  /** Shelf band — the shallow perimeter where eggs are laid. In the
   *  gourd, "shelf" is the annular region just inside the rim:
   *     pondSDF(x,z) ∈ [shelfSdfMin, shelfSdfMax]
   *  This replaces the old radius-based shelfRadiusMin/Max. The values
   *  reproduce the same 0.2–1.8m-wide annulus as before, but now
   *  respect the gourd's asymmetry. */
  shelfSdfMin: -1.8,
  // inner edge — 1.8m in from wall
  shelfSdfMax: -0.2,
  // outer edge — 0.2m in from wall (just submerged)
  /** Legacy radial shelf bounds. Kept so old callers don't break, but
   *  containment should use shelfSdfMin/Max via onShelf(). */
  shelfRadiusMin: 3.2,
  shelfRadiusMax: 4.8,
  /** Typical swim depth for adults; they rarely hug the surface or
   *  the floor. */
  adultSwimDepth: -1.2,
  /** Shrine center. In gourd coordinates this sits at the waist,
   *  near the junction of the two basins. Matches shader's
   *  shrineCenter = (0.2, -0.2) in top-down pondXZ. (§ XI) */
  shrine: { x: 0.2, y: -2.4, z: -0.2 },
  /** Gourd geometry — exposed so callers can do their own SDF math
   *  without going through the helpers. Do not modify at runtime. */
  gourd: {
    basinA: { cx: -1, cz: 0, r: 3.5 },
    basinB: { cx: 1.8, cz: 0.4, r: 2.2 },
    k: 0.9
  }
};
function pondSDF(x, z) {
  const a = POND.gourd.basinA;
  const b = POND.gourd.basinB;
  const k = POND.gourd.k;
  const dA = Math.hypot(x - a.cx, z - a.cz) - a.r;
  const dB = Math.hypot(x - b.cx, z - b.cz) - b.r;
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (dB - dA) / k));
  return dA * (1 - h) + dB * h - k * h * (1 - h);
}
__name(pondSDF, "pondSDF");
function pondSDFGradient(x, z, eps = 0.05) {
  const gx = (pondSDF(x + eps, z) - pondSDF(x - eps, z)) / (2 * eps);
  const gz = (pondSDF(x, z + eps) - pondSDF(x, z - eps)) / (2 * eps);
  return { gx, gz };
}
__name(pondSDFGradient, "pondSDFGradient");
function isInsidePond(x, z, margin = 0.12) {
  return pondSDF(x, z) < -margin;
}
__name(isInsidePond, "isInsidePond");
function onShelf(x, z) {
  const s = pondSDF(x, z);
  return s >= POND.shelfSdfMin && s <= POND.shelfSdfMax;
}
__name(onShelf, "onShelf");
function clampToPond(x, z, margin = 0.12) {
  const s = pondSDF(x, z);
  if (s < -margin)
    return { x, z };
  const { gx, gz } = pondSDFGradient(x, z);
  const gmag = Math.hypot(gx, gz) + 1e-6;
  const nx = gx / gmag;
  const nz = gz / gmag;
  const pushIn = s + margin;
  return { x: x - nx * pushIn, z: z - nz * pushIn };
}
__name(clampToPond, "clampToPond");
function samplePointInPond(rand, margin = 0.15) {
  const bbMinX = -4.6, bbMaxX = 4.1;
  const bbMinZ = -3.6, bbMaxZ = 3.6;
  for (let i = 0; i < 64; i++) {
    const x = bbMinX + rand() * (bbMaxX - bbMinX);
    const z = bbMinZ + rand() * (bbMaxZ - bbMinZ);
    if (pondSDF(x, z) < -margin)
      return { x, z };
  }
  return { x: POND.gourd.basinA.cx, z: POND.gourd.basinA.cz };
}
__name(samplePointInPond, "samplePointInPond");
function samplePointOnShelf(rand) {
  const bbMinX = -4.6, bbMaxX = 4.1;
  const bbMinZ = -3.6, bbMaxZ = 3.6;
  for (let i = 0; i < 128; i++) {
    const x = bbMinX + rand() * (bbMaxX - bbMinX);
    const z = bbMinZ + rand() * (bbMaxZ - bbMinZ);
    if (onShelf(x, z))
      return { x, z };
  }
  return { x: POND.gourd.basinA.cx - 3, z: POND.gourd.basinA.cz };
}
__name(samplePointOnShelf, "samplePointOnShelf");
var SIM = {
  /** Tick rate in Hz. Kinematics run every tick; cognition is sparser. */
  tickHz: 2,
  /** Derived: ms between ticks. */
  tickIntervalMs: 500,
  /** WebSocket snapshot/tick broadcast rate. */
  broadcastHz: 2,
  /** A simulated day compresses ~45 real minutes; a life is 30 sim-days. (§ VII) */
  realSecondsPerSimDay: 45 * 60,
  /** A full life at the compressed rate: ~22.5 real hours. */
  realSecondsPerLife: 30 * 45 * 60,
  /** Seasons cycle every 7 sim-days; one real cycle is ~5.25 real hours. */
  realSecondsPerSeason: 7 * 45 * 60
};
var LIFE = {
  /** Stage boundaries in sim-days. */
  stages: {
    egg: { min: 0, max: 1 },
    fry: { min: 1, max: 2 },
    juvenile: { min: 2, max: 5 },
    adolescent: { min: 5, max: 10 },
    adult: { min: 10, max: 22 },
    elder: { min: 22, max: 28 },
    dying: { min: 28, max: 30 }
  },
  /** Ordered list for advancement checks. */
  order: ["egg", "fry", "juvenile", "adolescent", "adult", "elder", "dying"],
  /** ~1-in-100 fry are rolled legendary. (§ VII) */
  legendaryRate: 0.01,
  /** Variance on lifespan: a fish may die earlier from stress or live past 30.
   *  Widened from 1.8 to 2.4 sim-days (April 2026 tuning) so the pond
   *  has a healthier spread of natural death ages — some fish make it to
   *  34-36, which stabilizes the running population. (§ VII: "A fish that
   *  lives for thirty-eight days is genuinely rare.") */
  longTailDeathStdDevDays: 2.4,
  /** Sparse-is-sacred: target birth rate at 5-6 koi steady state. Lowered
   *  from 1.0 to 0.5 births per sim-week (April 2026 tuning) to match the
   *  tightened mutual-drawn-to gate. One birth per ~10-14 sim-days is
   *  still inside the manifesto envelope of "roughly one birth per 7-10
   *  sim-days" (§ X) and errs toward sparser — births matter more when
   *  rarer. */
  targetBirthsPerSimWeek: 0.5
};
var COGNITION_INTERVAL_S = {
  egg: Number.POSITIVE_INFINITY,
  // eggs do not think
  fry: 30,
  juvenile: 60,
  adolescent: 90,
  adult: 120,
  elder: 300,
  dying: 600
};
var MODEL_TIERS = {
  // Fry and juvenile are pre-verbal — they cognize, but their utterances
  // should be minimal and their intent vocabulary a subset. Small Gemma
  // is the target here. For now, use gemma-3-4b-it which is cheap,
  // produces clean fragment register, and will eventually be replaced
  // with the fine-tuned Gemma-4-E2B student trained on pond data.
  fry: {
    stage: "fry",
    primary: "google/gemma-3-4b-it",
    fallbacks: ["google/gemma-3n-e4b-it"],
    temperature: 0.7,
    contextTokens: 500,
    maxOutputTokens: 120,
    approxUsdPerMTokIn: 0.02,
    approxUsdPerMTokOut: 0.04
  },
  juvenile: {
    stage: "juvenile",
    primary: "google/gemma-3-4b-it",
    fallbacks: ["google/gemma-3n-e4b-it"],
    temperature: 0.7,
    contextTokens: 1500,
    maxOutputTokens: 160,
    approxUsdPerMTokIn: 0.02,
    approxUsdPerMTokOut: 0.04
  },
  // Adolescent and adult run the workhorse. Gemma-4-26B-A4B proved 100%
  // register compliance across 10k synthetic contexts in the April 2026
  // sweep. This is the slot the fine-tuned Gemma-4-E4B will eventually
  // occupy. Haiku fallback catches the rare outright model outage.
  adolescent: {
    stage: "adolescent",
    primary: "google/gemma-4-26b-a4b-it",
    fallbacks: ["anthropic/claude-haiku-4.5"],
    temperature: 0.75,
    contextTokens: 2e3,
    maxOutputTokens: 180,
    approxUsdPerMTokIn: 0.1,
    approxUsdPerMTokOut: 0.4
  },
  adult: {
    stage: "adult",
    primary: "google/gemma-4-26b-a4b-it",
    fallbacks: ["anthropic/claude-haiku-4.5"],
    temperature: 0.75,
    contextTokens: 3e3,
    maxOutputTokens: 220,
    approxUsdPerMTokIn: 0.1,
    approxUsdPerMTokOut: 0.4
  },
  // Elders deserve more depth — more context, richer relational memory,
  // more careful utterance. Haiku is primary; dense Gemma-4-31B as
  // fallback for situational reach when the elder's context is complex.
  elder: {
    stage: "elder",
    primary: "anthropic/claude-haiku-4.5",
    fallbacks: ["google/gemma-4-31b-it"],
    temperature: 0.7,
    contextTokens: 6e3,
    maxOutputTokens: 280,
    approxUsdPerMTokIn: 1,
    approxUsdPerMTokOut: 5
  },
  // Dying koi get Sonnet. This is the register's hardest moment — a
  // fish whose entire relational graph is about to be mourned. Reduced
  // temperature per § VII so the voice doesn't drift under stress.
  // Haiku as fallback preserves warmth if Sonnet is unavailable.
  dying: {
    stage: "dying",
    primary: "anthropic/claude-sonnet-4.5",
    fallbacks: ["anthropic/claude-haiku-4.5"],
    temperature: 0.4,
    contextTokens: 6e3,
    maxOutputTokens: 200,
    approxUsdPerMTokIn: 3,
    approxUsdPerMTokOut: 15
  },
  // Legendary — 1 in 100 koi. Haiku is genuinely enough; the sweep
  // showed it hits full register with situational reach ("shelf holds
  // us both", "warm days past. moving away now."). Opus reserved for
  // later edge-case carve-outs (e.g. a dying legendary elder's twilight
  // reflection on a 500-interaction bond). We can add a "canon" tier
  // when we want it; for now Haiku.
  legendary: {
    stage: "legendary",
    primary: "anthropic/claude-haiku-4.5",
    fallbacks: ["anthropic/claude-3.5-haiku"],
    temperature: 0.75,
    contextTokens: 8e3,
    maxOutputTokens: 320,
    approxUsdPerMTokIn: 1,
    approxUsdPerMTokOut: 5
  }
};
var AFFECT = {
  halfLifeHours: {
    pleasure: 6,
    arousal: 2,
    dominance: 24
  },
  /** Deterministic appraisal : LLM mood delta blend ratio. */
  blendDeterministic: 0.7,
  blendLlm: 0.3,
  /** Clamps. */
  pleasureMin: -1,
  pleasureMax: 1,
  arousalMin: 0,
  arousalMax: 1,
  dominanceMin: -1,
  dominanceMax: 1
};
var HUNGER = {
  /** Initial hunger on hatch — a freshly-hatched fry is already
   *  looking for its yolk. */
  initial: 0.2,
  /** Per-second rise rate, per stage. Units: hunger-per-real-second.
   *  (In this sim, 1 real-sec = 1 sim-sec; a sim-day = 45 real-min.)
   *  Calibrated so an adult without food goes from the initial 0.2
   *  to starvation at 0.9 over one full sim-day (2700 real-sec).
   *  Fry rise faster (small, growing), elders slower (slow metabolism). */
  risePerSimSec: {
    egg: 0,
    // eggs do not eat
    fry: 45e-5,
    // ~0.5 day to starve from initial
    juvenile: 35e-5,
    adolescent: 28e-5,
    adult: 25e-5,
    // ~1 sim-day to starve
    elder: 18e-5,
    // ~1.5 sim-days to starve
    dying: 0
    // past hunger
  },
  /** Threshold above which starvation begins contributing to death
   *  probability. 0.9 is near-max; a fish has about one sim-hour
   *  of starvation survival after crossing this line. */
  starvationThreshold: 0.9,
  /** Per-tick death probability contributed by starvation, scaled by
   *  how far past the threshold the fish is. Maxes around 1-in-3600
   *  ticks at full starvation (hunger=1.0) — about 30 real minutes
   *  of maximum starvation to die, at 2 Hz. Gentle enough to give
   *  a visible decline but not an abrupt die-off. */
  starvationMaxPDeathPerTick: 1 / 3600,
  /** Threshold below which the Play family (§ XIII) is permitted
   *  by the Burghardt satiation criterion. A koi must be both
   *  satiated (hunger < this) and low-arousal to play. */
  playSatiationThreshold: 0.4,
  /** Threshold above which the LLM's cognition prompt should emphasize
   *  food-seeking language ("a pull toward food-smells"). Below this,
   *  hunger is a background sensation; above, it becomes a primary
   *  driver of intent choice. */
  preoccupationThreshold: 0.55
};
var FOOD = {
  /** Radius in meters within which a koi consumes a food item. */
  consumptionRadius: 0.2,
  /** Maximum concurrent food items — caps runaway growth if the pond
   *  goes quiet (no fish eating for a long time). */
  maxConcurrent: 30,
  pollen: {
    /** Spawns only when season === "spring". Target: ~6 items/real-hour
     *  over 5 koi. Per tick (2Hz): 6 / 3600 / 2 = ~0.00083 per tick. */
    pPerTick: 83e-5,
    nutrition: 0.2,
    /** Real seconds until decay. Pollen lasts a good while. */
    decaySec: 600,
    /** Drifts with the surface — small random velocity each tick. */
    drifts: true,
    /** y-coordinate at spawn (surface). */
    y: 0
  },
  algae: {
    /** All seasons. Slower spawn because patches are persistent. */
    pPerTick: 55e-5,
    nutrition: 0.3,
    /** Long-lived — real koi algae patches persist for days. */
    decaySec: 900,
    drifts: false,
    /** On the pond floor at shelf depth. */
    y: -0.5
  },
  insect: {
    /** Summer/autumn only, dawn (t_day 0.10-0.22) and dusk (0.80-0.92). */
    pPerTick: 14e-4,
    nutrition: 0.4,
    /** Short decay — insects skitter off if uneaten. */
    decaySec: 180,
    drifts: true,
    y: 0
  },
  pellet: {
    /** Visitor-dropped. Not spawned by ambient logic; created by WS. */
    pPerTick: 0,
    nutrition: 0.6,
    /** Short decay so visitor feeding feels urgent-ish. */
    decaySec: 120,
    drifts: false,
    y: 0
  }
};
var MEMORY = {
  weights: {
    relevance: 1,
    importance: 0.8,
    recency: 0.5,
    social: 0.3,
    emotional: 0.4
  },
  /** exp(-Δh / 72h) — 72-hour half-life on recency. */
  recencyHalfLifeHours: 72,
  /** Embedding dimension (BGE-small-en-v1.5). */
  embeddingDim: 384,
  /** Upper bound on retrieved memories per prompt composition. */
  maxRetrievedPerTier: {
    fry: 4,
    juvenile: 6,
    adolescent: 8,
    adult: 10,
    elder: 14,
    dying: 10
  },
  /** Cap on total memory rows per koi before archive pruning. */
  maxRowsPerKoi: 3e3
};
var DRAWN_TO = {
  /** Reproduction fires when both fish have drawn_to → each other on
   * at least this many of the last 7 sim-days. Raised from 3 to 4
   * (April 2026 tuning) so pairs have to sustain mutual preference
   * more consistently before reproduction permission fires. */
  minDaysOfMutualInLast7: 4,
  windowDays: 7,
  /** Cooldown in sim-days after a spawning for either participant.
   * Doubled from 7 to 14 sim-days (April 2026 tuning) so the same
   * pair can't spawn again within half a lifetime. Combined with the
   * tighter minDaysOfMutualInLast7 and the reduced egg count weights,
   * the steady-state birth rate lands near one per 10-14 sim-days. */
  cooldownDays: 14,
  /** Reflection prompt runs at lower temperature than routine cognition. */
  temperature: 0.3,
  /** The weekly solitude-bias audit triggers if more than this fraction of
   * adult-adult pairs show mutual drawn_to reflections in a week. */
  solitudeAuditPairThreshold: 0.5
};
var KINEMATICS = {
  /** Top swim speed in m/s for an adult at arousal=0.5. */
  baseSpeed: 0.18,
  /** Max allowed turn rate, rad/s. Keeps swimming visibly calm. */
  maxTurnRate: 1.4,
  /** Boid weights, tuned so the shoal is present at dawn/dusk but loose at noon. */
  flocking: {
    separationRadius: 0.45,
    cohesionRadius: 1.6,
    alignmentRadius: 1.2,
    separationStrength: 1.2,
    cohesionStrength: 0.25,
    alignmentStrength: 0.35
  },
  /** Weight on curl-noise flow field as a soft push. */
  flowStrength: 0.12,
  /** Boundary pushback when a fish drifts near the pond edge (meters).
   *  This is a "soft band" that discourages approach, not a hard wall.
   *  Hard containment is enforced by clampToPond() post-integration. */
  boundaryBuffer: 0.4,
  boundaryStrength: 0.9,
  /** Soft vertical band — fish prefer their swim depth. */
  depthRestore: 0.4
};
var BUDGET = {
  monthlyUsd: 100,
  /** Above 60%: normal operation. */
  healthyFloor: 0.6,
  /** 30-60%: reflection frequency halved, adults may drop a tier. */
  watchfulFloor: 0.3,
  /** 10-30%: all on cheapest viable; reflections every 3 days; no legendary. */
  austerityFloor: 0.1,
  /** Below 10%: meditation mode. 90% cached utterances. */
  meditationFloor: 0
};

// src/schema.ts
var SCHEMA_DDL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pond_meta (
  id                TEXT PRIMARY KEY,
  pond_id           TEXT NOT NULL,
  version           TEXT NOT NULL,
  config_hash       TEXT NOT NULL,
  created_at_tick   INTEGER NOT NULL,
  created_at_ms     INTEGER NOT NULL,
  tick_hz           INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS world (
  id                TEXT PRIMARY KEY,
  tick              INTEGER NOT NULL,
  t_day             REAL NOT NULL,
  sim_day           INTEGER NOT NULL,
  season            TEXT NOT NULL,
  weather           TEXT NOT NULL,
  clarity           REAL NOT NULL,
  temperature       REAL NOT NULL,
  solstice_active   INTEGER NOT NULL,
  next_solstice_tick INTEGER NOT NULL,
  tier_level        INTEGER NOT NULL DEFAULT 0,
  month_spend_usd   REAL    NOT NULL DEFAULT 0,
  rng_state         INTEGER NOT NULL DEFAULT 42
);

CREATE TABLE IF NOT EXISTS koi (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  stage             TEXT NOT NULL,
  sex               TEXT NOT NULL DEFAULT 'female',
  age_ticks         INTEGER NOT NULL,
  hatched_at_tick   INTEGER NOT NULL,
  legendary         INTEGER NOT NULL DEFAULT 0,
  color             TEXT NOT NULL,
  x                 REAL NOT NULL,
  y                 REAL NOT NULL,
  z                 REAL NOT NULL,
  vx                REAL NOT NULL,
  vz                REAL NOT NULL,
  h                 REAL NOT NULL,
  size              REAL NOT NULL,
  pad_p             REAL NOT NULL,
  pad_a             REAL NOT NULL,
  pad_d             REAL NOT NULL,
  hunger            REAL NOT NULL DEFAULT 0.2,
  intent_kind       TEXT NOT NULL,
  intent_target_id  TEXT,
  intent_target_x   REAL,
  intent_target_y   REAL,
  intent_target_z   REAL,
  intent_at_tick    INTEGER NOT NULL,
  intent_mechanism  TEXT,
  next_cognition_tick INTEGER NOT NULL,
  last_twilight_tick  INTEGER NOT NULL DEFAULT 0,
  last_deep_sleep_tick INTEGER NOT NULL DEFAULT 0,
  micro_importance_accum REAL NOT NULL DEFAULT 0,
  drawn_target_id   TEXT,
  drawn_noticing    TEXT,
  drawn_at_tick     INTEGER,
  last_utterance       TEXT,
  last_utterance_tick  INTEGER NOT NULL DEFAULT 0,
  last_spawning_tick   INTEGER NOT NULL DEFAULT 0,
  genetics_json        TEXT NOT NULL DEFAULT '{}',
  genotype_json        TEXT NOT NULL DEFAULT '{}',
  is_alive          INTEGER NOT NULL DEFAULT 1,
  died_at_tick      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_koi_alive ON koi(is_alive);
CREATE INDEX IF NOT EXISTS idx_koi_stage ON koi(stage);

CREATE TABLE IF NOT EXISTS reproduction_permission (
  pair_key         TEXT PRIMARY KEY,
  a_id             TEXT NOT NULL,
  b_id             TEXT NOT NULL,
  granted_at_tick  INTEGER NOT NULL,
  expires_at_tick  INTEGER NOT NULL,
  consumed_at_tick INTEGER,
  mutual_days      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_permission_active
  ON reproduction_permission(consumed_at_tick, expires_at_tick);

CREATE TABLE IF NOT EXISTS memory (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  koi_id               TEXT NOT NULL REFERENCES koi(id),
  kind                 TEXT NOT NULL,
  content              TEXT NOT NULL,
  importance           INTEGER NOT NULL,
  created_at_tick      INTEGER NOT NULL,
  last_accessed_tick   INTEGER NOT NULL,
  access_count         INTEGER NOT NULL DEFAULT 0,
  emotional_valence    REAL NOT NULL DEFAULT 0,
  participants_json    TEXT NOT NULL DEFAULT '[]',
  embedding            BLOB NOT NULL,
  valid_to_tick        INTEGER,
  source_memory_ids_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_memory_koi_recent ON memory(koi_id, created_at_tick DESC);
CREATE INDEX IF NOT EXISTS idx_memory_koi_kind ON memory(koi_id, kind);

CREATE TABLE IF NOT EXISTS relationship_card (
  self_id                TEXT NOT NULL,
  other_id               TEXT NOT NULL,
  first_encounter_tick   INTEGER NOT NULL,
  interaction_count      INTEGER NOT NULL DEFAULT 0,
  valence                REAL NOT NULL DEFAULT 0,
  valence_trajectory_json TEXT NOT NULL DEFAULT '[]',
  dominance              REAL NOT NULL DEFAULT 0,
  trust                  REAL NOT NULL DEFAULT 0.3,
  summary                TEXT NOT NULL DEFAULT '',
  notable_memory_ids_json TEXT NOT NULL DEFAULT '[]',
  drawn_count_7d         INTEGER NOT NULL DEFAULT 0,
  last_authored_tick     INTEGER NOT NULL DEFAULT 0,
  familiarity_prior      REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (self_id, other_id)
);

CREATE TABLE IF NOT EXISTS drawn_to_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id       TEXT NOT NULL,
  target_id      TEXT NOT NULL,
  noticing       TEXT NOT NULL,
  tick           INTEGER NOT NULL,
  sim_day        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drawn_pair_day ON drawn_to_log(actor_id, target_id, sim_day);

CREATE TABLE IF NOT EXISTS artifact (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL,
  origin_event_id   TEXT,
  created_at_tick   INTEGER NOT NULL,
  substance         TEXT NOT NULL,
  color             TEXT NOT NULL,
  wear              REAL NOT NULL DEFAULT 0,
  luminosity        REAL NOT NULL DEFAULT 0,
  inscription       TEXT,
  motifs_json       TEXT NOT NULL DEFAULT '[]',
  rarity            REAL NOT NULL DEFAULT 0.5,
  sacred            INTEGER NOT NULL DEFAULT 0,
  state             TEXT NOT NULL DEFAULT 'held',
  current_holder    TEXT,
  current_loc_x     REAL,
  current_loc_y     REAL,
  current_loc_z     REAL
);

CREATE TABLE IF NOT EXISTS artifact_provenance (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id       TEXT NOT NULL REFERENCES artifact(id),
  at_tick           INTEGER NOT NULL,
  mode              TEXT NOT NULL,
  from_holder       TEXT,
  to_holder         TEXT,
  note              TEXT
);
CREATE INDEX IF NOT EXISTS idx_provenance_artifact ON artifact_provenance(artifact_id, at_tick);

CREATE TABLE IF NOT EXISTS event (
  id                TEXT PRIMARY KEY,
  at_ms             INTEGER NOT NULL,
  tick              INTEGER NOT NULL,
  actor             TEXT NOT NULL,
  type              TEXT NOT NULL,
  targets_json      TEXT NOT NULL DEFAULT '[]',
  mechanism         TEXT,
  affect_delta_json TEXT,
  llm_model         TEXT,
  llm_temperature   REAL,
  llm_tokens_in     INTEGER,
  llm_tokens_out    INTEGER,
  llm_cost_usd      REAL,
  payload_json      TEXT NOT NULL DEFAULT '{}',
  payload_hash      TEXT NOT NULL,
  schema_version    INTEGER NOT NULL DEFAULT 1,
  config_hash       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_event_type_tick ON event(type, tick);
CREATE INDEX IF NOT EXISTS idx_event_actor_tick ON event(actor, tick);

CREATE TABLE IF NOT EXISTS koi_lineage (
  koi_id            TEXT PRIMARY KEY REFERENCES koi(id),
  parent_a_id       TEXT,
  parent_b_id       TEXT,
  name_tile_artifact_id TEXT,
  birth_cohort_tick INTEGER NOT NULL,
  generation        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lineage_generation ON koi_lineage(generation);
CREATE INDEX IF NOT EXISTS idx_lineage_parent_a ON koi_lineage(parent_a_id);
CREATE INDEX IF NOT EXISTS idx_lineage_parent_b ON koi_lineage(parent_b_id);

CREATE TABLE IF NOT EXISTS skill (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  koi_id            TEXT NOT NULL REFERENCES koi(id),
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  created_at_tick   INTEGER NOT NULL,
  times_used        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_skill_koi ON skill(koi_id);

CREATE TABLE IF NOT EXISTS visitor_session (
  hash              TEXT PRIMARY KEY,
  first_seen_ms     INTEGER NOT NULL,
  last_seen_ms      INTEGER NOT NULL,
  pebble_count      INTEGER NOT NULL DEFAULT 0,
  food_count        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visitor_nickname (
  visitor_hash      TEXT NOT NULL,
  koi_id            TEXT NOT NULL,
  nickname          TEXT NOT NULL,
  set_at_ms         INTEGER NOT NULL,
  PRIMARY KEY (visitor_hash, koi_id)
);

CREATE TABLE IF NOT EXISTS food (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,
  x                 REAL NOT NULL,
  y                 REAL NOT NULL,
  z                 REAL NOT NULL,
  vx                REAL,
  vz                REAL,
  spawned_at_tick   INTEGER NOT NULL,
  decay_at_tick     INTEGER NOT NULL,
  nutrition         REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_food_decay ON food(decay_at_tick);
`;
function applySchema(sql) {
  const statements = SCHEMA_DDL.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
  const tableStmts = statements.filter(
    (s) => /^CREATE\s+TABLE/i.test(s)
  );
  const indexStmts = statements.filter(
    (s) => /^CREATE\s+INDEX/i.test(s)
  );
  for (const stmt of tableStmts)
    sql.exec(stmt);
  migrate(sql);
  for (const stmt of indexStmts)
    sql.exec(stmt);
}
__name(applySchema, "applySchema");
function migrate(sql) {
  addColumnIfMissing(
    sql,
    "koi",
    "genetics_json",
    "TEXT NOT NULL DEFAULT '{}'"
  );
  addColumnIfMissing(
    sql,
    "koi_lineage",
    "generation",
    "INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    sql,
    "relationship_card",
    "familiarity_prior",
    "REAL NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    sql,
    "koi",
    "sex",
    "TEXT NOT NULL DEFAULT 'female'"
  );
  addColumnIfMissing(
    sql,
    "koi",
    "genotype_json",
    "TEXT NOT NULL DEFAULT '{}'"
  );
  addColumnIfMissing(
    sql,
    "koi",
    "hunger",
    "REAL NOT NULL DEFAULT 0.2"
  );
}
__name(migrate, "migrate");
function addColumnIfMissing(sql, table3, column, typeDecl) {
  const cols = sql.exec(`PRAGMA table_info(${table3})`).toArray();
  if (cols.length === 0)
    return;
  const alreadyExists = cols.some((c) => c["name"] === column);
  if (alreadyExists)
    return;
  sql.exec(`ALTER TABLE ${table3} ADD COLUMN ${column} ${typeDecl}`);
}
__name(addColumnIfMissing, "addColumnIfMissing");

// src/rng.ts
var Rng = class {
  state;
  constructor(seed) {
    this.state = (seed | 0) >>> 0;
    if (this.state === 0)
      this.state = 1;
  }
  /** Advance the state and return a Uint32. */
  nextU32() {
    let x = this.state;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    this.state = x >>> 0;
    return this.state;
  }
  /** Uniform float in [0, 1). */
  float() {
    return (this.nextU32() >>> 8) / 16777216;
  }
  /** Uniform float in [min, max). */
  range(min, max) {
    return min + (max - min) * this.float();
  }
  /** Integer in [min, max]. */
  int(min, max) {
    return Math.floor(min + (max - min + 1) * this.float());
  }
  /** Sample ~N(0,1) via Box-Muller. */
  normal() {
    const u1 = Math.max(1e-9, this.float());
    const u2 = this.float();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  /** Bernoulli trial with success probability p. */
  chance(p) {
    return this.float() < p;
  }
  /** Pick an element of an array. */
  pick(arr) {
    if (arr.length === 0)
      throw new Error("pick(): empty array");
    return arr[this.int(0, arr.length - 1)];
  }
  /** Snapshot the current state for persistence. */
  snapshot() {
    return this.state;
  }
};
__name(Rng, "Rng");

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  __name(assertIs, "assertIs");
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  __name(assertNever, "assertNever");
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  __name(joinValues, "joinValues");
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = /* @__PURE__ */ __name((data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
}, "getParsedType");

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = /* @__PURE__ */ __name((obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, "quotelessJson");
var ZodError = class extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = /* @__PURE__ */ __name((error3) => {
      for (const issue of error3.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }, "processError");
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
__name(ZodError, "ZodError");
ZodError.create = (issues) => {
  const error3 = new ZodError(issues);
  return error3;
};

// node_modules/zod/v3/locales/en.js
var errorMap = /* @__PURE__ */ __name((issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
}, "errorMap");
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = /* @__PURE__ */ __name((params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, "makeIssue");
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
__name(addIssueToContext, "addIssueToContext");
var ParseStatus = class {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
__name(ParseStatus, "ParseStatus");
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = /* @__PURE__ */ __name((value) => ({ status: "dirty", value }), "DIRTY");
var OK = /* @__PURE__ */ __name((value) => ({ status: "valid", value }), "OK");
var isAborted = /* @__PURE__ */ __name((x) => x.status === "aborted", "isAborted");
var isDirty = /* @__PURE__ */ __name((x) => x.status === "dirty", "isDirty");
var isValid = /* @__PURE__ */ __name((x) => x.status === "valid", "isValid");
var isAsync = /* @__PURE__ */ __name((x) => typeof Promise !== "undefined" && x instanceof Promise, "isAsync");

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
__name(ParseInputLazyPath, "ParseInputLazyPath");
var handleResult = /* @__PURE__ */ __name((ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error3 = new ZodError(ctx.common.issues);
        this._error = error3;
        return this._error;
      }
    };
  }
}, "handleResult");
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = /* @__PURE__ */ __name((iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  }, "customMap");
  return { errorMap: customMap, description };
}
__name(processCreateParams, "processCreateParams");
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = /* @__PURE__ */ __name((val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    }, "getIssueProperties");
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = /* @__PURE__ */ __name(() => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      }), "setError");
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
__name(ZodType, "ZodType");
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
__name(timeRegexSource, "timeRegexSource");
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
__name(timeRegex, "timeRegex");
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
__name(datetimeRegex, "datetimeRegex");
function isValidIP(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidIP, "isValidIP");
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
__name(isValidJWT, "isValidJWT");
function isValidCidr(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidCidr, "isValidCidr");
var ZodString = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
__name(ZodString, "ZodString");
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
__name(floatSafeRemainder, "floatSafeRemainder");
var ZodNumber = class extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
__name(ZodNumber, "ZodNumber");
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
__name(ZodBigInt, "ZodBigInt");
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
__name(ZodBoolean, "ZodBoolean");
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
__name(ZodDate, "ZodDate");
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
__name(ZodSymbol, "ZodSymbol");
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
__name(ZodUndefined, "ZodUndefined");
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
__name(ZodNull, "ZodNull");
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
__name(ZodAny, "ZodAny");
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
__name(ZodUnknown, "ZodUnknown");
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
__name(ZodNever, "ZodNever");
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
__name(ZodVoid, "ZodVoid");
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
__name(ZodArray, "ZodArray");
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
__name(deepPartialify, "deepPartialify");
var ZodObject = class extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
__name(ZodObject, "ZodObject");
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    __name(handleResults, "handleResults");
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
__name(ZodUnion, "ZodUnion");
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = /* @__PURE__ */ __name((type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, "getDiscriminator");
var ZodDiscriminatedUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
__name(ZodDiscriminatedUnion, "ZodDiscriminatedUnion");
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
__name(mergeValues, "mergeValues");
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = /* @__PURE__ */ __name((parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    }, "handleParsed");
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
__name(ZodIntersection, "ZodIntersection");
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
};
__name(ZodTuple, "ZodTuple");
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
__name(ZodRecord, "ZodRecord");
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
__name(ZodMap, "ZodMap");
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    __name(finalizeSet, "finalizeSet");
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
__name(ZodSet, "ZodSet");
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error3) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error3
        }
      });
    }
    __name(makeArgsIssue, "makeArgsIssue");
    function makeReturnsIssue(returns, error3) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error3
        }
      });
    }
    __name(makeReturnsIssue, "makeReturnsIssue");
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error3 = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error3.addIssue(makeArgsIssue(args, e));
          throw error3;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error3.addIssue(makeReturnsIssue(result, e));
          throw error3;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
__name(ZodFunction, "ZodFunction");
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
__name(ZodLazy, "ZodLazy");
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
__name(ZodLiteral, "ZodLiteral");
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
__name(createZodEnum, "createZodEnum");
var ZodEnum = class extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
__name(ZodEnum, "ZodEnum");
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
__name(ZodNativeEnum, "ZodNativeEnum");
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
__name(ZodPromise, "ZodPromise");
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = /* @__PURE__ */ __name((acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      }, "executeRefinement");
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
__name(ZodEffects, "ZodEffects");
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
__name(ZodOptional, "ZodOptional");
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
__name(ZodNullable, "ZodNullable");
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
__name(ZodDefault, "ZodDefault");
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
__name(ZodCatch, "ZodCatch");
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
__name(ZodNaN, "ZodNaN");
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
__name(ZodBranded, "ZodBranded");
var ZodPipeline = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = /* @__PURE__ */ __name(async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }, "handleAsync");
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
__name(ZodPipeline, "ZodPipeline");
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = /* @__PURE__ */ __name((data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    }, "freeze");
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
__name(ZodReadonly, "ZodReadonly");
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
__name(cleanParams, "cleanParams");
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
__name(custom, "custom");
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = /* @__PURE__ */ __name((cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), "instanceOfType");
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = /* @__PURE__ */ __name(() => stringType().optional(), "ostring");
var onumber = /* @__PURE__ */ __name(() => numberType().optional(), "onumber");
var oboolean = /* @__PURE__ */ __name(() => booleanType().optional(), "oboolean");
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;

// src/protocol.ts
var KoiIdSchema = external_exports.string().min(1).max(64);
var SeasonSchema = external_exports.enum(["spring", "summer", "autumn", "winter"]);
var WeatherSchema = external_exports.enum(["clear", "breeze", "rain", "storm"]);
var LifeStageSchema = external_exports.enum([
  "egg",
  "fry",
  "juvenile",
  "adolescent",
  "adult",
  "elder",
  "dying"
]);
var KoiFrameSchema = external_exports.object({
  id: KoiIdSchema,
  name: external_exports.string().optional(),
  stage: LifeStageSchema.optional(),
  // Pond-meters coordinates. The client converts to shader viewport
  // units via SHADER_SCALE in usePond.ts.
  x: external_exports.number(),
  y: external_exports.number(),
  z: external_exports.number(),
  // Heading, radians.
  h: external_exports.number(),
  // Optional size scale (0.35 = fry, 1.05 = elder).
  s: external_exports.number().optional(),
  // Optional color morph.
  c: external_exports.string().optional(),
  // Optional mood compact: {v: valence, a: arousal} — used by the client
  // to optionally modulate swim speed and shoal-distance.
  m: external_exports.object({ v: external_exports.number(), a: external_exports.number() }).optional(),
  // Optional hunger (0 = sated, 1 = starving). Used by the client
  // diagnostic and, eventually, by a subtle visual cue (color desaturation
  // or fin-droop) as the fish's body state becomes visible in its motion.
  hu: external_exports.number().min(0).max(1).optional(),
  // Current kinematic intent — what the koi is doing right now. Shipped
  // every tick so the frontend can animate intent-specific behavior
  // (linger orbits, shoal formation, approach curves, surface breaches).
  // Matches IntentKindSchema in the cognition response, but ships here
  // without the full intent object because the frontend doesn't need
  // atTick or mechanism (mechanism rides separately via `mech` when
  // active).
  i: external_exports.enum([
    "swim",
    "shoal",
    "solitary",
    "rest",
    "feed_approach",
    "feed_leave",
    "retreat",
    "approach",
    "linger",
    "bump",
    "shelter",
    "surface_breach",
    "play_invite",
    "follow",
    "threadway",
    "attend_solstice"
  ]).optional(),
  // Target koi id — for intents that orient toward another koi
  // (approach, linger, follow, play_invite, bump). The frontend uses
  // this to draw attention thread / intent-animation between the two
  // fish. Null when the intent has no target.
  t: KoiIdSchema.nullable().optional(),
  // Mechanism currently instantiating — when a koi's intent is part of
  // an active love-flow mechanism (e.g. gift, play_invitation), this
  // field identifies it. Most ticks this is absent.
  mech: external_exports.string().optional()
});
var FoodFrameSchema = external_exports.object({
  id: external_exports.string(),
  kind: external_exports.enum(["pollen", "algae", "insect", "pellet"]),
  x: external_exports.number(),
  y: external_exports.number(),
  z: external_exports.number()
});
var PondMetaSchema = external_exports.object({
  version: external_exports.string(),
  created_at: external_exports.number(),
  // unix ms
  tick_interval_ms: external_exports.number(),
  t_day: external_exports.number(),
  // [0, 1)
  season: SeasonSchema
});
var SnapshotMessageSchema = external_exports.object({
  t: external_exports.literal("snapshot"),
  tick: external_exports.number().int().nonnegative(),
  now: external_exports.number(),
  // unix ms, for client-side clock skew
  fish: external_exports.array(KoiFrameSchema),
  food: external_exports.array(FoodFrameSchema).optional(),
  pondMeta: PondMetaSchema
});
var TickMessageSchema = external_exports.object({
  t: external_exports.literal("tick"),
  tick: external_exports.number().int().nonnegative(),
  now: external_exports.number(),
  fish: external_exports.array(KoiFrameSchema),
  food: external_exports.array(FoodFrameSchema).optional()
});
var SpeechMessageSchema = external_exports.object({
  t: external_exports.literal("speech"),
  fishId: KoiIdSchema,
  uttId: external_exports.string(),
  chunk: external_exports.string(),
  done: external_exports.boolean()
});
var AmbientEventMessageSchema = external_exports.object({
  t: external_exports.literal("ambient"),
  kind: external_exports.enum([
    "hatched",
    "died",
    "storm_began",
    "storm_ended",
    "solstice_began",
    "solstice_ended",
    "season_changed",
    "meditation_entered",
    "meditation_exited"
  ]),
  tick: external_exports.number().int().nonnegative(),
  now: external_exports.number(),
  details: external_exports.record(external_exports.unknown()).optional()
});
var MechanismMessageSchema = external_exports.object({
  t: external_exports.literal("mechanism"),
  tick: external_exports.number().int().nonnegative(),
  now: external_exports.number(),
  mechanism: external_exports.string(),
  family: external_exports.string(),
  actor: KoiIdSchema,
  participants: external_exports.array(KoiIdSchema),
  payload: external_exports.record(external_exports.unknown()).optional()
});
var ServerToClientSchema = external_exports.discriminatedUnion("t", [
  SnapshotMessageSchema,
  TickMessageSchema,
  SpeechMessageSchema,
  AmbientEventMessageSchema,
  MechanismMessageSchema
]);
var PebbleMessageSchema = external_exports.object({
  t: external_exports.literal("pebble"),
  x: external_exports.number(),
  z: external_exports.number(),
  inscription: external_exports.string().max(80).optional()
});
var FoodMessageSchema = external_exports.object({
  t: external_exports.literal("food"),
  x: external_exports.number(),
  z: external_exports.number()
});
var NicknameMessageSchema = external_exports.object({
  t: external_exports.literal("nickname"),
  koiId: KoiIdSchema,
  nickname: external_exports.string().min(1).max(40)
});
var ClientToServerSchema = external_exports.discriminatedUnion("t", [
  PebbleMessageSchema,
  FoodMessageSchema,
  NicknameMessageSchema
]);
var IntentKindSchema = external_exports.enum([
  "swim",
  "shoal",
  "solitary",
  "rest",
  "feed_approach",
  "feed_leave",
  "retreat",
  "approach",
  "linger",
  "bump",
  "shelter",
  "surface_breach",
  "play_invite",
  "follow",
  "threadway",
  "attend_solstice"
]);
var LoveFlowMechanismSchema = external_exports.enum([
  "witnessing",
  "parallel_presence",
  "shared_attention",
  "bearing_witness",
  "joyful_reunion",
  "apology",
  "forgiveness",
  "cognitive_repair",
  "emotional_attunement",
  "farewell_ritual",
  "grief_companionship",
  "play_invitation",
  "tag",
  "dance",
  "synchronized_swim",
  "shared_curiosity",
  "mentorship",
  "mentor_mentee_inversion",
  "imitation_learning",
  "skill_transfer",
  "story_propagation",
  "vocabulary_drift",
  "gift",
  "pass_it_forward",
  "heirloom",
  "offering",
  "shared_food",
  "memory_gifting",
  "greeting",
  "farewell",
  "solstice_attendance",
  "seasonal_rite",
  "birth_witnessing",
  "elder_naming"
]);
var CognitionResponseSchema = external_exports.object({
  /** Intent — mandatory. */
  intent: IntentKindSchema,
  /** Koi this intent is directed at, if any. */
  target_koi: KoiIdSchema.nullable(),
  /** The love-flow mechanism this intent instantiates, if any.
   *  May be downgraded by the simulation's detection rules (§ IX). */
  mechanism: LoveFlowMechanismSchema.nullable(),
  /** Mood delta — blended 0.7 deterministic / 0.3 LLM. */
  mood_delta: external_exports.object({
    p: external_exports.number().min(-0.3).max(0.3).optional(),
    a: external_exports.number().min(-0.3).max(0.3).optional(),
    d: external_exports.number().min(-0.3).max(0.3).optional()
  }),
  /** Short sensory fragment. Almost always null. Never a full sentence. (§ IV)
   *  Must be translated from a non-linguistic interior — "warm here" not
   *  "I feel warm." The LLM is instructed about this; we also truncate
   *  and filter here. */
  utterance: external_exports.string().max(120).nullable(),
  /** Importance for memory scoring. 1-10. Most moments rate 1-3. */
  importance: external_exports.number().int().min(1).max(10),
  /** Rare — only written when something genuinely noteworthy happened. */
  memory_write: external_exports.object({
    kind: external_exports.enum(["observation", "reflection", "notable_episode"]),
    content: external_exports.string().max(240),
    emotional_valence: external_exports.number().min(-1).max(1),
    participants: external_exports.array(KoiIdSchema).max(6)
  }).nullable(),
  /** Very rare — semantic beliefs about the world or others. */
  belief_update: external_exports.object({
    content: external_exports.string().max(240),
    supersedes_belief_id: external_exports.number().int().positive().nullable()
  }).nullable(),
  /** Populated ONLY during the daily twilight reflection (§ X).
   *  Routine cognition calls must return null. The prompt makes this
   *  clear; the schema just permits it to travel on the same wire. */
  drawn_to: external_exports.object({
    koi_id: KoiIdSchema,
    noticing: external_exports.string().max(200)
  }).nullable()
});
var TwilightReflectionSchema = external_exports.object({
  sensory_summary: external_exports.string().max(200),
  /** For each koi currently known, optional valence delta. */
  relationship_deltas: external_exports.array(external_exports.object({
    koi_id: KoiIdSchema,
    valence_delta: external_exports.number().min(-0.2).max(0.2),
    summary: external_exports.string().max(120)
  })).max(8),
  /** May be null; "it is acceptable — normal — to have no one you are drawn to." */
  drawn_to: external_exports.object({
    koi_id: KoiIdSchema,
    noticing: external_exports.string().max(200)
  }).nullable(),
  /** The fish's soft intent for tomorrow — narrative guidance, not binding. */
  soft_intent_tomorrow: external_exports.string().max(120),
  /** A tiny persona drift. Optional; most days don't shift persona. */
  persona_drift: external_exports.string().max(200).nullable()
});

// src/affect.ts
var BASELINE_BY_STAGE = {
  egg: { p: 0, a: 0.1, d: 0 },
  fry: { p: 0.15, a: 0.55, d: -0.4 },
  // curious, jumpy, low status
  juvenile: { p: 0.18, a: 0.5, d: -0.3 },
  adolescent: { p: 0.1, a: 0.45, d: -0.1 },
  adult: { p: 0.05, a: 0.35, d: 0.1 },
  // settled, moderate everything
  elder: { p: 0.1, a: 0.25, d: 0.2 },
  // calmer, higher status
  dying: { p: -0.05, a: 0.15, d: 0 }
};
function baselineFor(stage) {
  const b = BASELINE_BY_STAGE[stage];
  return { p: b.p, a: b.a, d: b.d };
}
__name(baselineFor, "baselineFor");
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
__name(clamp, "clamp");
function clampPad(pad) {
  return {
    p: clamp(pad.p, AFFECT.pleasureMin, AFFECT.pleasureMax),
    a: clamp(pad.a, AFFECT.arousalMin, AFFECT.arousalMax),
    d: clamp(pad.d, AFFECT.dominanceMin, AFFECT.dominanceMax)
  };
}
__name(clampPad, "clampPad");
function decayPad(pad, stage, dtSeconds) {
  const b = baselineFor(stage);
  const kP = Math.pow(0.5, dtSeconds / (AFFECT.halfLifeHours.pleasure * 3600));
  const kA = Math.pow(0.5, dtSeconds / (AFFECT.halfLifeHours.arousal * 3600));
  const kD = Math.pow(0.5, dtSeconds / (AFFECT.halfLifeHours.dominance * 3600));
  return clampPad({
    p: b.p + (pad.p - b.p) * kP,
    a: b.a + (pad.a - b.a) * kA,
    d: b.d + (pad.d - b.d) * kD
  });
}
__name(decayPad, "decayPad");
function applyDelta(pad, delta) {
  return clampPad({
    p: pad.p + (delta.p ?? 0),
    a: pad.a + (delta.a ?? 0),
    d: pad.d + (delta.d ?? 0)
  });
}
__name(applyDelta, "applyDelta");
function appraise(event, role) {
  switch (event.kind) {
    case "witnessed_by_familiar":
      return role === "self" ? { p: 0.2, a: 0.02, d: 0.05 } : { p: 0.05 };
    case "bumped_by_unfamiliar":
      return role === "self" ? { p: -0.1, a: 0.3, d: -0.05 } : { a: 0.08 };
    case "bumped_by_dominant":
      return role === "self" ? { p: -0.12, a: 0.2, d: -0.08 } : { a: 0.05 };
    case "fry_hatched_in_pond":
      return { p: 0.1, a: 0.05 };
    case "elder_died":
      if (role === "bonded_witness")
        return { p: -0.4, a: 0.1, d: -0.05 };
      return { p: -0.1, a: 0.04 };
    case "peer_died":
      if (role === "bonded_witness")
        return { p: -0.3, a: 0.08, d: -0.03 };
      return { p: -0.08, a: 0.03 };
    case "visitor_pebble_placed":
      return { a: 0.2 };
    case "visitor_fed":
      return { p: 0.08, a: 0.12 };
    case "storm_began":
      return { p: -0.3, a: 0.5, d: -0.05 };
    case "storm_ended":
      return { p: 0.1, a: -0.25 };
    case "solstice_shaft_entered_with_bonded":
      return { p: 0.3, a: -0.05, d: 0.05 };
    case "solstice_shaft_entered_alone":
      return { p: 0.1, a: -0.02 };
    case "play_succeeded":
      return { p: 0.18, a: 0.05, d: 0.02 };
    case "apology_received":
      return { p: 0.2, a: -0.05, d: 0.02 };
    case "apology_offered":
      return { p: 0.1, a: -0.02 };
    case "forgiveness_received":
      return { p: 0.22, a: -0.08 };
    case "rupture_unrepaired":
      return { p: -0.12, a: 0.1, d: -0.02 };
    case "mutual_drawn_to":
      return { p: 0.08, a: 0.04 };
    case "gift_received":
      return { p: 0.15, a: 0.03 };
    case "gift_given":
      return { p: 0.1, d: 0.02 };
    case "teaching_succeeded":
      return role === "self" ? { p: 0.1, d: 0.05 } : { p: 0.15 };
    case "seasonal_change":
      switch (event.season) {
        case "spring":
          return { p: 0.08, a: 0.04 };
        case "summer":
          return { p: 0.05, a: 0.02 };
        case "autumn":
          return { p: -0.02, a: -0.01 };
        case "winter":
          return { p: -0.05, a: -0.03, d: -0.01 };
      }
    case "food_received":
      return { p: 0.1, a: 0.08 };
    case "food_denied":
      return { p: -0.05, a: 0.04 };
    case "prolonged_solitude":
      return { p: -0.04, a: -0.02 };
    case "sustained_parallel_presence":
      return { p: 0.06, a: -0.02 };
  }
}
__name(appraise, "appraise");

// src/curl-noise.ts
var PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++)
    p[i] = i;
  let s = 1779033703;
  for (let i = 255; i > 0; i--) {
    s = s * 1664525 + 1013904223 | 0;
    const j = Math.abs(s) % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++)
    PERM[i] = p[i & 255];
}
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
__name(fade, "fade");
function lerp(a, b, t) {
  return a + (b - a) * t;
}
__name(lerp, "lerp");
function grad3(h, x, y, z) {
  const g = h & 15;
  const u = g < 8 ? x : y;
  const v = g < 4 ? y : g === 12 || g === 14 ? x : z;
  return ((g & 1) === 0 ? u : -u) + ((g & 2) === 0 ? v : -v);
}
__name(grad3, "grad3");
function perlin3(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = PERM[X] + Y;
  const AA = PERM[A & 255] + Z;
  const AB = PERM[A + 1 & 255] + Z;
  const B = PERM[X + 1 & 255] + Y;
  const BA = PERM[B & 255] + Z;
  const BB = PERM[B + 1 & 255] + Z;
  return lerp(
    lerp(
      lerp(
        grad3(PERM[AA & 255], x, y, z),
        grad3(PERM[BA & 255], x - 1, y, z),
        u
      ),
      lerp(
        grad3(PERM[AB & 255], x, y - 1, z),
        grad3(PERM[BB & 255], x - 1, y - 1, z),
        u
      ),
      v
    ),
    lerp(
      lerp(
        grad3(PERM[AA + 1 & 255], x, y, z - 1),
        grad3(PERM[BA + 1 & 255], x - 1, y, z - 1),
        u
      ),
      lerp(
        grad3(PERM[AB + 1 & 255], x, y - 1, z - 1),
        grad3(PERM[BB + 1 & 255], x - 1, y - 1, z - 1),
        u
      ),
      v
    ),
    w
  );
}
__name(perlin3, "perlin3");
function potential(x, y, z, t) {
  const scale = 0.35;
  const morph = t * 3e-3;
  return [
    perlin3(x * scale + 13.1, y * scale + 17.7, z * scale + morph),
    perlin3(x * scale + 31.7, y * scale + morph + 5.2, z * scale + 29.3),
    perlin3(x * scale + morph + 7.1, y * scale + 23.9, z * scale + 11.5)
  ];
}
__name(potential, "potential");
var EPS = 0.08;
function sampleCurl(x, y, z, t) {
  const pX1 = potential(x + EPS, y, z, t);
  const pX0 = potential(x - EPS, y, z, t);
  const pY1 = potential(x, y + EPS, z, t);
  const pY0 = potential(x, y - EPS, z, t);
  const pZ1 = potential(x, y, z + EPS, t);
  const pZ0 = potential(x, y, z - EPS, t);
  const dPhiZ_dY = (pY1[2] - pY0[2]) / (2 * EPS);
  const dPhiY_dZ = (pZ1[1] - pZ0[1]) / (2 * EPS);
  const dPhiX_dZ = (pZ1[0] - pZ0[0]) / (2 * EPS);
  const dPhiZ_dX = (pX1[2] - pX0[2]) / (2 * EPS);
  const dPhiY_dX = (pX1[1] - pX0[1]) / (2 * EPS);
  const dPhiX_dY = (pY1[0] - pY0[0]) / (2 * EPS);
  return {
    vx: dPhiZ_dY - dPhiY_dZ,
    vy: dPhiX_dZ - dPhiZ_dX,
    vz: dPhiY_dX - dPhiX_dY
  };
}
__name(sampleCurl, "sampleCurl");
function sampleCurlXZ(x, z, t, strength) {
  const c = sampleCurl(x, -1.5, z, t);
  return { vx: c.vx * strength, vz: c.vz * strength };
}
__name(sampleCurlXZ, "sampleCurlXZ");

// src/kinematics.ts
var DEPTH_BY_STAGE = {
  egg: -0.4,
  // eggs on reeds in the shallow shelf
  fry: -0.6,
  // fry hug the shallow vegetated shelves
  juvenile: -0.9,
  adolescent: -1.1,
  adult: -1.2,
  elder: -1.5,
  dying: -2.2
  // dying koi drift low
};
var SPEED_MULT_BY_STAGE = {
  egg: 0,
  fry: 0.85,
  juvenile: 1.1,
  adolescent: 1.15,
  adult: 1,
  elder: 0.7,
  dying: 0.35
};
var SIZE_BY_STAGE = {
  egg: 0.15,
  fry: 0.35,
  juvenile: 0.55,
  adolescent: 0.8,
  adult: 1,
  elder: 1.05,
  dying: 1
};
function mag(x, z) {
  return Math.sqrt(x * x + z * z);
}
__name(mag, "mag");
function limitMag(x, z, maxMag) {
  const m = mag(x, z);
  if (m > maxMag && m > 1e-9) {
    const s = maxMag / m;
    return { x: x * s, z: z * s };
  }
  return { x, z };
}
__name(limitMag, "limitMag");
function flock(self, others) {
  const f = KINEMATICS.flocking;
  let sepX = 0, sepZ = 0;
  let cohX = 0, cohZ = 0, cohN = 0;
  let aliX = 0, aliZ = 0, aliN = 0;
  for (const o of others) {
    if (o.id === self.id)
      continue;
    if (o.stage === "egg" || o.stage === "dying")
      continue;
    const dx = self.x - o.x;
    const dz = self.z - o.z;
    const d = mag(dx, dz);
    if (d < 1e-6)
      continue;
    if (d < f.separationRadius) {
      const strength = (f.separationRadius - d) / f.separationRadius;
      sepX += dx / d * strength;
      sepZ += dz / d * strength;
    }
    if (d < f.cohesionRadius) {
      cohX += o.x;
      cohZ += o.z;
      cohN += 1;
    }
    if (d < f.alignmentRadius) {
      aliX += o.vx;
      aliZ += o.vz;
      aliN += 1;
    }
  }
  let ax = 0, az = 0;
  ax += sepX * f.separationStrength;
  az += sepZ * f.separationStrength;
  if (cohN > 0) {
    const cx = cohX / cohN;
    const cz = cohZ / cohN;
    const toX = cx - self.x;
    const toZ = cz - self.z;
    const m = mag(toX, toZ);
    if (m > 1e-6) {
      ax += toX / m * f.cohesionStrength;
      az += toZ / m * f.cohesionStrength;
    }
  }
  if (aliN > 0) {
    const avx = aliX / aliN;
    const avz = aliZ / aliN;
    const m = mag(avx, avz);
    if (m > 1e-6) {
      ax += avx / m * f.alignmentStrength;
      az += avz / m * f.alignmentStrength;
    }
  }
  return { x: ax, z: az };
}
__name(flock, "flock");
function intentPull(self, others) {
  const kind = self.intent.kind;
  const toward = /* @__PURE__ */ __name((tx, tz, s) => {
    const dx = tx - self.x;
    const dz = tz - self.z;
    const d = mag(dx, dz);
    if (d < 1e-4)
      return { x: 0, z: 0, strength: 0 };
    return { x: dx / d, z: dz / d, strength: s };
  }, "toward");
  const territoryAnchor = /* @__PURE__ */ __name((id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h << 5) - h + id.charCodeAt(i);
      h |= 0;
    }
    const ang = Math.abs(h) % 1e3 / 1e3 * Math.PI * 2;
    const rNorm = 0.55 + 0.28 * ((Math.abs(h) >> 10) % 100) / 100;
    const r = 4 * rNorm;
    const raw = { x: r * Math.cos(ang), z: r * Math.sin(ang) };
    return clampToPond(raw.x, raw.z, 0.8);
  }, "territoryAnchor");
  const threadwayPoint = /* @__PURE__ */ __name(() => {
    const THREADWAY_SDF = -0.55;
    let x = self.x, z = self.z;
    for (let i = 0; i < 12; i++) {
      const s = pondSDF(x, z);
      if (s >= THREADWAY_SDF - 0.05)
        break;
      const { gx, gz } = pondSDFGradient(x, z);
      const gmag = mag(gx, gz) + 1e-6;
      const step = Math.max(0.05, (THREADWAY_SDF - s) * 0.8);
      x += gx / gmag * step;
      z += gz / gmag * step;
    }
    return { x, z };
  }, "threadwayPoint");
  switch (kind) {
    case "swim":
    case "bump":
    case "surface_breach":
      return { x: 0, z: 0, strength: 0 };
    case "shoal": {
      const nearby = [];
      for (const o of others) {
        if (o.id === self.id)
          continue;
        if (o.stage === "egg" || o.stage === "dying")
          continue;
        const d = mag(o.x - self.x, o.z - self.z);
        if (d < POND.radius * 0.5)
          nearby.push(o);
      }
      if (nearby.length === 0) {
        const anchor = territoryAnchor(self.id);
        return toward(anchor.x, anchor.z, 0.3);
      }
      let cx = 0, cz = 0;
      for (const o of nearby) {
        cx += o.x;
        cz += o.z;
      }
      cx /= nearby.length;
      cz /= nearby.length;
      const { x: tx, z: tz } = clampToPond(cx, cz, 0.3);
      const dToCentroid = mag(tx - self.x, tz - self.z);
      if (dToCentroid < 0.8) {
        return toward(tx, tz, 0.15);
      }
      return toward(tx, tz, 0.5);
    }
    case "solitary": {
      const anchor = territoryAnchor(self.id);
      const d = mag(anchor.x - self.x, anchor.z - self.z);
      if (d < 0.5)
        return { x: 0, z: 0, strength: 0 };
      return toward(anchor.x, anchor.z, 0.5);
    }
    case "rest": {
      const anchor = territoryAnchor(self.id);
      const { x: rx, z: rz } = clampToPond(
        anchor.x * 0.7,
        anchor.z * 0.7,
        0.3
      );
      return toward(rx, rz, 0.2);
    }
    case "feed_approach": {
      if (self.intent.target) {
        const d = mag(self.intent.target.x - self.x, self.intent.target.z - self.z);
        if (d <= 0.15)
          return { x: 0, z: 0, strength: 0 };
        return toward(self.intent.target.x, self.intent.target.z, 0.7);
      }
      const anchor = territoryAnchor(self.id);
      return toward(anchor.x, anchor.z, 0.2);
    }
    case "approach":
    case "linger":
    case "follow":
    case "play_invite": {
      const target = self.intent.targetId ? others.find((o) => o.id === self.intent.targetId) : void 0;
      if (!target) {
        let nearest = null;
        let nearestD = Infinity;
        for (const o of others) {
          if (o.id === self.id)
            continue;
          if (o.stage === "egg" || o.stage === "dying")
            continue;
          const d2 = mag(o.x - self.x, o.z - self.z);
          if (d2 < nearestD) {
            nearest = o;
            nearestD = d2;
          }
        }
        if (!nearest)
          return { x: 0, z: 0, strength: 0 };
        return toward(nearest.x, nearest.z, 0.3);
      }
      const d = mag(target.x - self.x, target.z - self.z);
      const stopDist = kind === "linger" ? 0.7 : kind === "approach" ? 0.4 : kind === "play_invite" ? 0.5 : 0.25;
      if (d <= stopDist) {
        if (kind === "linger") {
          const perpX = -(target.z - self.z);
          const perpZ = target.x - self.x;
          const pm = mag(perpX, perpZ);
          if (pm > 1e-4) {
            return { x: perpX / pm, z: perpZ / pm, strength: 0.15 };
          }
        }
        return { x: 0, z: 0, strength: 0 };
      }
      const s = kind === "follow" ? 0.7 : kind === "linger" ? 0.35 : kind === "play_invite" ? 0.65 : 0.55;
      return toward(target.x, target.z, s);
    }
    case "feed_leave":
    case "retreat": {
      const anchor = territoryAnchor(self.id);
      return toward(anchor.x, anchor.z, 0.7);
    }
    case "shelter": {
      const t = threadwayPoint();
      return toward(t.x, t.z, 0.6);
    }
    case "threadway": {
      const { gx, gz } = pondSDFGradient(self.x, self.z);
      const gmag = mag(gx, gz) + 1e-6;
      const nx = gx / gmag;
      const nz = gz / gmag;
      const tx = -nz;
      const tz = nx;
      const forwardX = self.x + tx * 0.6;
      const forwardZ = self.z + tz * 0.6;
      let px = forwardX, pz = forwardZ;
      const THREADWAY_SDF = -0.55;
      for (let i = 0; i < 8; i++) {
        const s = pondSDF(px, pz);
        if (Math.abs(s - THREADWAY_SDF) < 0.08)
          break;
        const g = pondSDFGradient(px, pz);
        const m = mag(g.gx, g.gz) + 1e-6;
        const step = (THREADWAY_SDF - s) * 0.6;
        px += g.gx / m * step;
        pz += g.gz / m * step;
      }
      return toward(px, pz, 0.55);
    }
    case "attend_solstice": {
      return toward(POND.shrine.x, POND.shrine.z, 0.25);
    }
    default: {
      return { x: 0, z: 0, strength: 0 };
    }
  }
}
__name(intentPull, "intentPull");
function boundaryPushback(self) {
  const sdfHere = pondSDF(self.x, self.z);
  if (sdfHere <= -KINEMATICS.boundaryBuffer)
    return { x: 0, z: 0 };
  const { gx, gz } = pondSDFGradient(self.x, self.z);
  const gmag = mag(gx, gz) + 1e-6;
  const nx = gx / gmag;
  const nz = gz / gmag;
  const proximity = (sdfHere + KINEMATICS.boundaryBuffer) / KINEMATICS.boundaryBuffer;
  const push = KINEMATICS.boundaryStrength * proximity * proximity;
  return { x: -nx * push, z: -nz * push };
}
__name(boundaryPushback, "boundaryPushback");
function depthRestore(self) {
  const pref = DEPTH_BY_STAGE[self.stage];
  return (pref - self.y) * KINEMATICS.depthRestore;
}
__name(depthRestore, "depthRestore");
function stepKoi(self, others, simTime, dt = SIM.tickIntervalMs / 1e3) {
  if (self.stage === "egg") {
    self.vx = 0;
    self.vz = 0;
    return;
  }
  const goal = intentPull(self, others);
  const canFlock = self.stage !== "dying";
  const fl = canFlock ? flock(self, others) : { x: 0, z: 0 };
  const curl = sampleCurlXZ(self.x, self.z, simTime, KINEMATICS.flowStrength);
  const bd = boundaryPushback(self);
  let ax = goal.x * goal.strength + fl.x + curl.vx + bd.x;
  let az = goal.z * goal.strength + fl.z + curl.vz + bd.z;
  const arousalBoost = 0.8 + 0.4 * self.pad.a;
  ax *= arousalBoost;
  az *= arousalBoost;
  const accel = limitMag(ax, az, KINEMATICS.maxTurnRate);
  self.vx += accel.x * dt;
  self.vz += accel.z * dt;
  const vMax = KINEMATICS.baseSpeed * SPEED_MULT_BY_STAGE[self.stage] * (0.7 + 0.5 * self.pad.a);
  const v = limitMag(self.vx, self.vz, vMax);
  self.vx = v.x;
  self.vz = v.z;
  self.vx *= 0.985;
  self.vz *= 0.985;
  self.x += self.vx * dt;
  self.z += self.vz * dt;
  self.y += depthRestore(self) * dt * 0.4;
  const sp = mag(self.vx, self.vz);
  if (sp > 0.01) {
    self.h = Math.atan2(self.vz, self.vx);
  }
  if (!isInsidePond(self.x, self.z, 0.12)) {
    const { x: cx, z: cz } = clampToPond(self.x, self.z, 0.12);
    self.x = cx;
    self.z = cz;
    const { gx, gz } = pondSDFGradient(self.x, self.z);
    const gmag = mag(gx, gz) + 1e-6;
    const nx = gx / gmag;
    const nz = gz / gmag;
    const vn = self.vx * nx + self.vz * nz;
    if (vn > 0) {
      self.vx -= nx * vn;
      self.vz -= nz * vn;
    }
  }
  if (self.y > -0.1)
    self.y = -0.1;
  if (self.y < -POND.maxDepth + 0.05)
    self.y = -POND.maxDepth + 0.05;
  self.ageTicks += 1;
}
__name(stepKoi, "stepKoi");
function randomSpawn(rand) {
  const { x, z } = samplePointOnShelf(rand);
  return {
    x,
    y: -0.5 - rand() * 0.4,
    z,
    h: rand() * Math.PI * 2
  };
}
__name(randomSpawn, "randomSpawn");

// src/koi.ts
function stageAtSimDay(day) {
  if (day < LIFE.stages.fry.min)
    return "egg";
  if (day < LIFE.stages.juvenile.min)
    return "fry";
  if (day < LIFE.stages.adolescent.min)
    return "juvenile";
  if (day < LIFE.stages.adult.min)
    return "adolescent";
  if (day < LIFE.stages.elder.min)
    return "adult";
  if (day < LIFE.stages.dying.min)
    return "elder";
  return "dying";
}
__name(stageAtSimDay, "stageAtSimDay");
function ageSimDays(ageTicks) {
  return ageTicks / SIM.tickHz / SIM.realSecondsPerSimDay;
}
__name(ageSimDays, "ageSimDays");
function currentStage(ageTicks) {
  return stageAtSimDay(ageSimDays(ageTicks));
}
__name(currentStage, "currentStage");
function createKoi(init, rng) {
  const stage = currentStage(init.ageTicks);
  const spawn = init.spawn ?? randomSpawn(() => rng.float());
  const pad = baselineFor(stage);
  return {
    id: init.id,
    name: init.name,
    stage,
    sex: init.sex,
    ageTicks: init.ageTicks,
    hatchedAtTick: init.hatchedAtTick,
    legendary: init.legendary,
    color: init.color,
    x: spawn.x,
    y: spawn.y,
    z: spawn.z,
    vx: 0,
    vz: 0,
    h: spawn.h,
    size: SIZE_BY_STAGE[stage],
    pad,
    hunger: HUNGER.initial,
    intent: { kind: "swim", atTick: init.hatchedAtTick },
    nextCognitionTick: init.hatchedAtTick + 60,
    // ~30 s after hatch
    lastTwilightTick: 0,
    lastDeepSleepTick: 0,
    microImportanceAccum: 0,
    drawnTo: null,
    lastUtterance: null,
    lastUtteranceTick: 0,
    lastSpawningTick: 0,
    recentHeadings: [],
    tagState: null
  };
}
__name(createKoi, "createKoi");
function advanceStage(k) {
  const next = currentStage(k.ageTicks);
  if (next === k.stage)
    return null;
  k.stage = next;
  k.size = SIZE_BY_STAGE[next];
  const b = baselineFor(next);
  k.pad = {
    p: (k.pad.p + b.p) / 2,
    a: (k.pad.a + b.a) / 2,
    d: (k.pad.d + b.d) / 2
  };
  return next;
}
__name(advanceStage, "advanceStage");
function drawLifespan(rng) {
  const days = 30 + rng.normal() * LIFE.longTailDeathStdDevDays;
  return {
    // Clamp widened from [20, 42] to [22, 48] (April 2026 tuning with
    // stddev 2.4). The upper bound allows rare outliers — a fish at
    // 46-48 sim-days would be deeply memorable. The lower bound at 22
    // is just past the elder boundary, so a short-lived fish still
    // reaches elderhood briefly rather than skipping it.
    lifespanDays: Math.max(22, Math.min(48, days)),
    scaleDays: 1.6
  };
}
__name(drawLifespan, "drawLifespan");
function deathProbabilityPerTick(k, lifespan, stormStress2) {
  const ticksPerDay = SIM.tickHz * SIM.realSecondsPerSimDay;
  let starvation = 0;
  if (k.stage !== "egg" && k.hunger > HUNGER.starvationThreshold) {
    const t = Math.min(
      1,
      (k.hunger - HUNGER.starvationThreshold) / (1 - HUNGER.starvationThreshold)
    );
    starvation = HUNGER.starvationMaxPDeathPerTick * t;
  }
  if (k.stage === "fry") {
    return 0.02 / ticksPerDay + starvation;
  }
  if (k.stage !== "dying")
    return starvation;
  const d = ageSimDays(k.ageTicks);
  const x = (d - lifespan.lifespanDays) / lifespan.scaleDays;
  const dailyPDeath = 1 / (1 + Math.exp(-x));
  const valenceBoost = k.pad.p < -0.3 ? 1.15 : 1;
  const stormBoost = 1 + stormStress2 * 0.25;
  return dailyPDeath / ticksPerDay * valenceBoost * stormBoost + starvation;
}
__name(deathProbabilityPerTick, "deathProbabilityPerTick");
function stepHunger(k, dtSimSec) {
  const rate = HUNGER.risePerSimSec[k.stage] ?? 0;
  if (rate <= 0)
    return;
  k.hunger = Math.max(0, Math.min(1, k.hunger + rate * dtSimSec));
}
__name(stepHunger, "stepHunger");
function createEgg(init, rng) {
  const pad = baselineFor("egg");
  return {
    id: init.id,
    name: placeholderEggName(init.id),
    stage: "egg",
    sex: init.sex,
    ageTicks: 0,
    hatchedAtTick: init.atTick,
    legendary: init.legendary,
    color: init.color,
    x: init.x,
    y: init.y,
    z: init.z,
    vx: 0,
    vz: 0,
    h: 0,
    size: SIZE_BY_STAGE["egg"],
    pad,
    hunger: 0,
    // eggs do not hunger
    intent: { kind: "rest", atTick: init.atTick },
    nextCognitionTick: Number.MAX_SAFE_INTEGER,
    // eggs never cognize
    lastTwilightTick: 0,
    lastDeepSleepTick: 0,
    microImportanceAccum: 0,
    drawnTo: null,
    lastUtterance: null,
    lastUtteranceTick: 0,
    lastSpawningTick: 0,
    recentHeadings: [],
    tagState: null
  };
}
__name(createEgg, "createEgg");
function placeholderEggName(eggId) {
  const tail = eggId.slice(-4);
  return `Egg-${tail}`;
}
__name(placeholderEggName, "placeholderEggName");
function isUnnamed(name) {
  return name.startsWith("Egg-") || name.startsWith("Fry-Newborn-");
}
__name(isUnnamed, "isUnnamed");
var COLOR_ROTATION = [
  "kohaku",
  "shusui",
  "ogon",
  "asagi",
  "tancho",
  "utsuri",
  "bekko"
];
function seedInitialCohort(tick, rng) {
  const AGES_DAYS = [14, 10, 6, 3, 1];
  const NAMES = [
    "Kishi",
    // late-adult, quiet veteran
    "The One Who Waits",
    // adult with patience
    "Bronze-Fin",
    // adolescent
    "Reed-Follower",
    // juvenile
    "Third-of-Five"
    // fry
  ];
  const SEX = ["female", "male", "female", "male", "female"];
  const out = [];
  for (let i = 0; i < AGES_DAYS.length; i++) {
    const day = AGES_DAYS[i];
    const ageTicks = Math.floor(day * SIM.realSecondsPerSimDay * SIM.tickHz);
    const id = `koi_${String(i).padStart(2, "0")}_seed`;
    const color = COLOR_ROTATION[i % COLOR_ROTATION.length];
    const legendary = rng.chance(LIFE.legendaryRate);
    const hatchedAt = tick - ageTicks;
    out.push(createKoi({
      id,
      name: NAMES[i],
      ageTicks,
      hatchedAtTick: hatchedAt,
      legendary,
      color,
      sex: SEX[i]
    }, rng));
  }
  return out;
}
__name(seedInitialCohort, "seedInitialCohort");
function toFrame(k) {
  return {
    id: k.id,
    name: k.name,
    stage: k.stage,
    x: k.x,
    y: k.y,
    z: k.z,
    h: k.h,
    s: k.size,
    c: k.color,
    m: { v: k.pad.p, a: k.pad.a },
    hu: k.hunger,
    i: k.intent.kind,
    t: k.intent.targetId ?? null,
    mech: k.intent.mechanism
  };
}
__name(toFrame, "toFrame");

// src/nutrition.ts
var foodIdCounter = 0;
function nextFoodId(tick, kind) {
  foodIdCounter = foodIdCounter + 1 & 1048575;
  return `f_${kind[0]}_${tick}_${foodIdCounter.toString(36)}`;
}
__name(nextFoodId, "nextFoodId");
function isDawnOrDusk(tDay) {
  return tDay >= 0.1 && tDay <= 0.22 || tDay >= 0.8 && tDay <= 0.92;
}
__name(isDawnOrDusk, "isDawnOrDusk");
function isInsectSeason(season) {
  return season === "summer" || season === "autumn";
}
__name(isInsectSeason, "isInsectSeason");
function spawnAmbient(hot, newTick, rng) {
  if (hot.food.length >= FOOD.maxConcurrent)
    return [];
  const out = [];
  const world = hot.world;
  const ticksPerSec = SIM.tickHz;
  if (world.season === "spring" && rng.chance(FOOD.pollen.pPerTick)) {
    const pos = samplePointInPond(() => rng.float(), 0.35);
    out.push({
      id: nextFoodId(newTick, "pollen"),
      kind: "pollen",
      x: pos.x,
      y: FOOD.pollen.y,
      z: pos.z,
      spawnedAtTick: newTick,
      decayAtTick: newTick + Math.floor(FOOD.pollen.decaySec * ticksPerSec),
      nutrition: FOOD.pollen.nutrition,
      vx: (rng.float() - 0.5) * 0.02,
      vz: (rng.float() - 0.5) * 0.02
    });
  }
  if (rng.chance(FOOD.algae.pPerTick)) {
    const pos = samplePointOnShelf(() => rng.float());
    out.push({
      id: nextFoodId(newTick, "algae"),
      kind: "algae",
      x: pos.x,
      y: FOOD.algae.y,
      z: pos.z,
      spawnedAtTick: newTick,
      decayAtTick: newTick + Math.floor(FOOD.algae.decaySec * ticksPerSec),
      nutrition: FOOD.algae.nutrition
    });
  }
  if (isInsectSeason(world.season) && isDawnOrDusk(world.tDay) && rng.chance(FOOD.insect.pPerTick)) {
    const pos = samplePointInPond(() => rng.float(), 0.35);
    out.push({
      id: nextFoodId(newTick, "insect"),
      kind: "insect",
      x: pos.x,
      y: FOOD.insect.y,
      z: pos.z,
      spawnedAtTick: newTick,
      decayAtTick: newTick + Math.floor(FOOD.insect.decaySec * ticksPerSec),
      nutrition: FOOD.insect.nutrition,
      vx: (rng.float() - 0.5) * 0.1,
      // skittering
      vz: (rng.float() - 0.5) * 0.1
    });
  }
  return out;
}
__name(spawnAmbient, "spawnAmbient");
function driftFood(food, dt) {
  if (food.vx === void 0 || food.vz === void 0)
    return;
  food.vx *= 0.98;
  food.vz *= 0.98;
  const nx = food.x + food.vx * dt;
  const nz = food.z + food.vz * dt;
  if (pondSDF(nx, nz) > -0.05) {
    food.vx *= -0.5;
    food.vz *= -0.5;
    return;
  }
  food.x = nx;
  food.z = nz;
}
__name(driftFood, "driftFood");
function checkConsumption(hot, newTick) {
  const consumed = [];
  const r2 = FOOD.consumptionRadius * FOOD.consumptionRadius;
  const indexesToRemove = [];
  for (let i = 0; i < hot.food.length; i++) {
    const f = hot.food[i];
    let best = null;
    let bestD2 = r2;
    for (const k of hot.koi) {
      if (k.stage === "egg" || k.stage === "dying")
        continue;
      if (k.hunger <= 0.01)
        continue;
      const dx = k.x - f.x;
      const dz = k.z - f.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        best = k;
        bestD2 = d2;
      }
    }
    if (best) {
      best.hunger = Math.max(0, best.hunger - f.nutrition);
      best.pad.p = Math.max(-1, Math.min(1, best.pad.p + 0.08));
      best.pad.a = Math.max(0, Math.min(1, best.pad.a - 0.04));
      consumed.push({
        foodId: f.id,
        foodKind: f.kind,
        koiId: best.id,
        koiName: best.name,
        nutrition: f.nutrition,
        x: f.x,
        z: f.z,
        atTick: newTick
      });
      indexesToRemove.push(i);
    }
  }
  for (let j = indexesToRemove.length - 1; j >= 0; j--) {
    hot.food.splice(indexesToRemove[j], 1);
  }
  return consumed;
}
__name(checkConsumption, "checkConsumption");
function expireFood(hot, newTick) {
  hot.food = hot.food.filter((f) => f.decayAtTick > newTick);
}
__name(expireFood, "expireFood");
function stepNutrition(hot, newTick, rng, dt) {
  expireFood(hot, newTick);
  for (const f of hot.food)
    driftFood(f, dt);
  const spawned = spawnAmbient(hot, newTick, rng);
  for (const f of spawned)
    hot.food.push(f);
  return checkConsumption(hot, newTick);
}
__name(stepNutrition, "stepNutrition");
function nearestFood(self, food, maxDist = 8) {
  if (self.hunger <= 0.05)
    return null;
  let best = null;
  let bestD2 = maxDist * maxDist;
  for (const f of food) {
    const dx = f.x - self.x;
    const dz = f.z - self.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) {
      best = f;
      bestD2 = d2;
    }
  }
  return best;
}
__name(nearestFood, "nearestFood");
function makeVisitorPellet(x, z, newTick) {
  const clamped = clampToPond(x, z, 0.15);
  const ticksPerSec = SIM.tickHz;
  const idSuffix = Math.floor(Math.random() * 1048575).toString(36);
  return {
    id: `p_${newTick}_${idSuffix}`,
    kind: "pellet",
    x: clamped.x,
    y: FOOD.pellet.y,
    z: clamped.z,
    spawnedAtTick: newTick,
    decayAtTick: newTick + Math.floor(FOOD.pellet.decaySec * ticksPerSec),
    nutrition: FOOD.pellet.nutrition
  };
}
__name(makeVisitorPellet, "makeVisitorPellet");

// src/naming.ts
var ORDINALS = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth"
];
var OF_COUNTS = [
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Nine"
];
var BODY_MODS = [
  "Bronze-Fin",
  "Pale-Belly",
  "Ghost-Belly",
  "Red-Whisker",
  "Dark-Flank",
  "Gold-Eye",
  "Moon-Scale",
  "Soft-Jaw",
  "Long-Tail",
  "Torn-Fin",
  "Still-Back",
  "Copper-Edge",
  "Dust-Speckle",
  "Cloud-Throat"
];
var ACTION_NAMES = [
  "The One Who Rises First",
  "The One Who Waits",
  "The Watcher at the Edge",
  "Slow-Return",
  "Shadow-Drifter",
  "Low-Hummer",
  "Moon-Watcher",
  "Reed-Follower",
  "The One Who Turns Away",
  "The One Who Threads the Arch",
  "First-to-Settle",
  "Last-to-Leave",
  "Deep-Rester",
  "Patient-Circler",
  "The Pale One Under the Shrine",
  "The One Who Finds the Caustic"
];
var COLOR_NAMES = {
  kohaku: ["Red-Over-White", "Crown-Mark", "Snow-Fin"],
  shusui: ["Blue-Spine", "River-Blue", "Rain-Scale"],
  ogon: ["Gold-One", "Bright-Back", "Sun-Flank"],
  asagi: ["Net-Blue", "Old-Net", "Belly-Flame"],
  tancho: ["One-Red-Mark", "Crown-Dot", "Signal-Head"],
  utsuri: ["Black-Through-White", "Ink-Flank", "Shadow-Scale"],
  bekko: ["Spotted-Light", "Dapple-Back", "Bright-With-Ink"]
};
function composeName(koiId, color, obs) {
  const seed = hashStr(koiId);
  const pick = /* @__PURE__ */ __name((arr, bump = 0) => arr[(seed + bump) % arr.length], "pick");
  if (obs.cohortSize >= 2 && obs.cohortSize <= 7 && (seed & 3) < 2) {
    const ord = ORDINALS[obs.cohortIndex] ?? "One";
    const count3 = OF_COUNTS[obs.cohortSize - 3] ?? String(obs.cohortSize);
    return `${ord}-of-${count3}`;
  }
  if (obs.firstToFreeSwim && seed & 1)
    return "The One Who Rises First";
  if (obs.lastToFreeSwim && seed & 2)
    return "Slow-Return";
  if (obs.threaded)
    return pick(["The One Who Threads the Arch", "Reed-Follower", "Deep-Rester"]);
  if (obs.solitary)
    return pick(["The Watcher at the Edge", "The One Who Turns Away", "Shadow-Drifter"]);
  if (obs.stillness)
    return pick(["Still-Back", "Patient-Circler", "Deep-Rester"]);
  if (obs.surfaced && obs.hourAtHatch > 20)
    return pick(["Moon-Watcher", "Moon-Scale", "Cloud-Throat"]);
  if (obs.surfaced)
    return pick(["The One Who Rises First", "Low-Hummer"], 3);
  if ((seed & 7) < 3)
    return pick(BODY_MODS);
  if ((seed & 7) < 5)
    return pick(ACTION_NAMES, 7);
  return pick(COLOR_NAMES[color]);
}
__name(composeName, "composeName");
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
__name(hashStr, "hashStr");
function collectObservations(self, others, hourAtHatch) {
  const nearbyFry = others.filter(
    (o) => o.stage === "fry" && o.id !== self.id
  );
  const anyClose = nearbyFry.some((o) => {
    const dx = o.x - self.x, dz = o.z - self.z;
    return dx * dx + dz * dz < 0.5 * 0.5;
  });
  return {
    surfaced: self.y > -0.5,
    stillness: Math.hypot(self.vx, self.vz) < 0.015,
    solitary: nearbyFry.length > 0 && !anyClose,
    threaded: false,
    // wired once the shrine passage geometry is added
    firstToFreeSwim: self.ageTicks < 240,
    // ~2 min after hatch at 2 Hz
    lastToFreeSwim: self.ageTicks > 3600,
    // well past yolk-sac
    cohortSize: nearbyFry.length + 1,
    cohortIndex: 0,
    hourAtHatch
  };
}
__name(collectObservations, "collectObservations");

// src/reproduction.ts
var PERMISSION_LIFETIME_SIM_DAYS = 2;
var SPAWNING_PROXIMITY_M = 0.4;
var SHELF_BAND = {
  rMin: POND.shelfRadiusMin,
  rMax: POND.shelfRadiusMax,
  yMin: -0.6,
  // shallow
  yMax: -0.3
};
var EGG_COUNT_WEIGHTS = [
  [3, 0.35],
  [4, 0.3],
  [5, 0.18],
  [6, 0.12],
  [8, 0.04],
  [10, 0.01]
];
var WITNESS_PROXIMITY_M = 1;
var EGG_HATCH_SIM_SECONDS = 1.2 * SIM.realSecondsPerSimDay;
function canonicalPairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
__name(canonicalPairKey, "canonicalPairKey");
function splitPairKey(key) {
  const parts = key.split("|");
  if (parts.length !== 2)
    throw new Error(`bad pair key: ${key}`);
  return [parts[0], parts[1]];
}
__name(splitPairKey, "splitPairKey");
function isInShelfZone(k) {
  const r = Math.hypot(k.x, k.z);
  return r >= SHELF_BAND.rMin && r <= SHELF_BAND.rMax && k.y >= SHELF_BAND.yMin && k.y <= SHELF_BAND.yMax;
}
__name(isInShelfZone, "isInShelfZone");
function isCoPresentForSpawning(a, b) {
  if (!isInShelfZone(a) || !isInShelfZone(b))
    return false;
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.hypot(dx, dz) <= SPAWNING_PROXIMITY_M;
}
__name(isCoPresentForSpawning, "isCoPresentForSpawning");
function pickEggCount(rng) {
  const u = rng.float();
  let acc = 0;
  for (const [n, w] of EGG_COUNT_WEIGHTS) {
    acc += w;
    if (u < acc)
      return n;
  }
  return 5;
}
__name(pickEggCount, "pickEggCount");
function countMutualDays(rows) {
  const seen = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = `${r.actor_id}\u2192${r.target_id}`;
    let set = seen.get(key);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      seen.set(key, set);
    }
    set.add(r.sim_day);
  }
  const mutual = /* @__PURE__ */ new Map();
  for (const [key, aDays] of seen.entries()) {
    const [a, b] = key.split("\u2192");
    if (a >= b)
      continue;
    const bDays = seen.get(`${b}\u2192${a}`);
    if (!bDays)
      continue;
    let count3 = 0;
    for (const d of aDays)
      if (bDays.has(d))
        count3++;
    if (count3 >= DRAWN_TO.minDaysOfMutualInLast7) {
      mutual.set(canonicalPairKey(a, b), count3);
    }
  }
  return mutual;
}
__name(countMutualDays, "countMutualDays");
function detectMutualPairs(sql, nowSimDay) {
  const lowerBound = nowSimDay - DRAWN_TO.windowDays;
  const rows = sql.exec(
    `SELECT actor_id, target_id, sim_day
       FROM drawn_to_log
      WHERE sim_day > ? AND sim_day <= ?`,
    lowerBound,
    nowSimDay
  ).toArray();
  const mutual = countMutualDays(rows);
  const out = [];
  for (const [key, count3] of mutual.entries()) {
    const [a, b] = splitPairKey(key);
    out.push({ pairKey: key, aId: a, bId: b, mutualDays: count3 });
  }
  return out;
}
__name(detectMutualPairs, "detectMutualPairs");
var TICKS_PER_SIM_DAY = SIM.tickHz * SIM.realSecondsPerSimDay;
function loadActivePermissions(sql, nowTick) {
  const rows = sql.exec(
    `SELECT pair_key, a_id, b_id, granted_at_tick, expires_at_tick
       FROM reproduction_permission
      WHERE consumed_at_tick IS NULL
        AND expires_at_tick > ?`,
    nowTick
  ).toArray();
  return rows.map((r) => ({
    pairKey: r["pair_key"],
    aId: r["a_id"],
    bId: r["b_id"],
    grantedAtTick: r["granted_at_tick"],
    expiresAtTick: r["expires_at_tick"]
  }));
}
__name(loadActivePermissions, "loadActivePermissions");
function hasActivePermission(sql, pairKey, nowTick) {
  const rows = sql.exec(
    `SELECT 1 FROM reproduction_permission
      WHERE pair_key = ? AND consumed_at_tick IS NULL AND expires_at_tick > ?
      LIMIT 1`,
    pairKey,
    nowTick
  ).toArray();
  return rows.length > 0;
}
__name(hasActivePermission, "hasActivePermission");
function inCooldown(koi, aId, bId, nowTick) {
  const a = koi.get(aId), b = koi.get(bId);
  if (!a || !b)
    return true;
  const cooldownTicks = DRAWN_TO.cooldownDays * TICKS_PER_SIM_DAY;
  if (nowTick - a.lastSpawningTick < cooldownTicks)
    return true;
  if (nowTick - b.lastSpawningTick < cooldownTicks)
    return true;
  return false;
}
__name(inCooldown, "inCooldown");
function filterEligible(sql, detected, world, koi, nowTick) {
  if (world.season !== "spring")
    return [];
  const koiById = new Map(koi.map((k) => [k.id, k]));
  const matureStages = /* @__PURE__ */ new Set(["adolescent", "adult", "elder"]);
  return detected.filter((p) => {
    const a = koiById.get(p.aId);
    const b = koiById.get(p.bId);
    if (!a || !b)
      return false;
    if (!matureStages.has(a.stage))
      return false;
    if (!matureStages.has(b.stage))
      return false;
    if (inCooldown(koiById, p.aId, p.bId, nowTick))
      return false;
    if (hasActivePermission(sql, p.pairKey, nowTick))
      return false;
    return true;
  });
}
__name(filterEligible, "filterEligible");
function grantPermission(sql, pair, nowTick) {
  const expires = nowTick + PERMISSION_LIFETIME_SIM_DAYS * TICKS_PER_SIM_DAY;
  sql.exec(
    `INSERT INTO reproduction_permission
       (pair_key, a_id, b_id, granted_at_tick, expires_at_tick, mutual_days)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(pair_key) DO UPDATE SET
       granted_at_tick = excluded.granted_at_tick,
       expires_at_tick = excluded.expires_at_tick,
       mutual_days = excluded.mutual_days,
       consumed_at_tick = NULL`,
    pair.pairKey,
    pair.aId,
    pair.bId,
    nowTick,
    expires,
    pair.mutualDays
  );
}
__name(grantPermission, "grantPermission");
function consumePermission(sql, pairKey, nowTick) {
  sql.exec(
    `UPDATE reproduction_permission
        SET consumed_at_tick = ?
      WHERE pair_key = ?`,
    nowTick,
    pairKey
  );
}
__name(consumePermission, "consumePermission");
function findWitnesses(koi, aId, bId) {
  const pair = /* @__PURE__ */ new Set([aId, bId]);
  const a = koi.find((k) => k.id === aId);
  if (!a)
    return [];
  const matureStages = /* @__PURE__ */ new Set(["adolescent", "adult", "elder"]);
  return koi.filter((k) => {
    if (pair.has(k.id))
      return false;
    if (!matureStages.has(k.stage))
      return false;
    const d = Math.hypot(k.x - a.x, k.z - a.z);
    return d <= WITNESS_PROXIMITY_M;
  });
}
__name(findWitnesses, "findWitnesses");
function placeEggs(a, b, count3, atTick, rng) {
  const cx = (a.x + b.x) / 2;
  const cz = (a.z + b.z) / 2;
  const out = [];
  for (let i = 0; i < count3; i++) {
    const ang = rng.float() * Math.PI * 2;
    const r = 0.08 + rng.float() * 0.22;
    const x = cx + r * Math.cos(ang);
    const z = cz + r * Math.sin(ang);
    const y = SHELF_BAND.yMin + (SHELF_BAND.yMax - SHELF_BAND.yMin) * rng.float();
    const legendary = rng.chance(LIFE.legendaryRate);
    const color = rng.chance(0.5) ? a.color : b.color;
    out.push({
      eggId: eggIdFor(atTick, i, rng),
      parentAId: a.id,
      parentBId: b.id,
      x,
      y,
      z,
      legendary,
      color
    });
  }
  return out;
}
__name(placeEggs, "placeEggs");
function eggIdFor(atTick, i, rng) {
  const rand = rng.int(0, 65535).toString(16).padStart(4, "0");
  return `koi_e${atTick.toString(36)}_${i.toString(16)}_${rand}`;
}
__name(eggIdFor, "eggIdFor");

// src/mechanisms/types.ts
var FAMILY_OF = {
  // Witnessing
  witnessing: "witnessing",
  parallel_presence: "witnessing",
  shared_attention: "witnessing",
  bearing_witness: "witnessing",
  joyful_reunion: "witnessing",
  // Repair
  apology: "repair",
  forgiveness: "repair",
  cognitive_repair: "repair",
  emotional_attunement: "repair",
  farewell_ritual: "repair",
  grief_companionship: "repair",
  // Play
  play_invitation: "play",
  tag: "play",
  dance: "play",
  synchronized_swim: "play",
  shared_curiosity: "play",
  // Teaching
  mentorship: "teaching",
  mentor_mentee_inversion: "teaching",
  imitation_learning: "teaching",
  skill_transfer: "teaching",
  story_propagation: "teaching",
  vocabulary_drift: "teaching",
  // Gift
  gift: "gift",
  pass_it_forward: "gift",
  heirloom: "gift",
  offering: "gift",
  shared_food: "gift",
  memory_gifting: "gift",
  // Ritual
  greeting: "ritual",
  farewell: "ritual",
  solstice_attendance: "ritual",
  seasonal_rite: "ritual",
  birth_witnessing: "ritual",
  elder_naming: "ritual"
};
function lastFiredTick(sql, mechanism, actor, targets, nowTick, ticksWindow) {
  const lower = nowTick - ticksWindow;
  const row = sql.exec(
    `SELECT MAX(tick) AS t FROM event
      WHERE tick > ?
        AND actor = ?
        AND mechanism = ?
        ${targets.length > 0 ? targets.map(() => `AND targets_json LIKE ?`).join(" ") : ""}`,
    ...[
      lower,
      `koi:${actor}`,
      mechanism,
      ...targets.map((t2) => `%"${t2}"%`)
    ]
  ).toArray()[0];
  const t = row?.["t"];
  return typeof t === "number" ? t : null;
}
__name(lastFiredTick, "lastFiredTick");

// src/mechanisms/witnessing.ts
var PARALLEL_PRESENCE = {
  maxDistanceM: 1.2,
  maxHeadingDeltaRad: Math.PI / 4,
  // 45° — soft side-by-side
  cooldownSimHours: 2
  // fires at most every 2 sim-hours per pair
};
var MUTUAL_WITNESSING = {
  maxDistanceM: 1,
  maxMutualFacingDeltaRad: Math.PI / 6,
  // 30° — fairly strict face-to-face
  cooldownSimHours: 4
};
var SHARED_ATTENTION = {
  maxDistanceToPoiM: 1.5,
  maxHeadingDeltaRad: Math.PI / 3,
  // 60° — pointed-at-ish
  minParticipants: 2,
  cooldownTicksPerPoi: 2 * 60 * 2
  // 2 sim-minutes on the same POI
};
var BEARING_WITNESS = {
  maxDistanceM: 1.5,
  minValenceNegativity: 0.4,
  // target's p < -0.4
  cooldownSimHours: 6
};
var JOYFUL_REUNION = {
  maxDistanceM: 0.8,
  minPriorValence: 0.3,
  // card valence requires bondedness
  minHoursApart: 12,
  // 12 sim-hours since last proximity
  cooldownSimHours: 24
  // reunion fires at most once per sim-day
};
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
__name(dist, "dist");
function headingDelta(a, b) {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI)
    d = 2 * Math.PI - d;
  return d;
}
__name(headingDelta, "headingDelta");
function headingTo(self, other) {
  return Math.atan2(other.z - self.z, other.x - self.x);
}
__name(headingTo, "headingTo");
function isObservant(k) {
  return k.stage !== "egg" && k.stage !== "dying";
}
__name(isObservant, "isObservant");
function* pairsOf(koi) {
  for (let i = 0; i < koi.length; i++) {
    for (let j = i + 1; j < koi.length; j++) {
      yield [koi[i], koi[j]];
    }
  }
}
__name(pairsOf, "pairsOf");
var SIM_HOUR_SECONDS = 3600;
function cooldownFromHours(hours, tickHz) {
  return Math.floor(hours * SIM_HOUR_SECONDS * tickHz);
}
__name(cooldownFromHours, "cooldownFromHours");
function detectParallelPresence(ctx) {
  const out = [];
  const cooldown = cooldownFromHours(
    PARALLEL_PRESENCE.cooldownSimHours,
    ctx.tickHz
  );
  for (const [a, b] of pairsOf(ctx.koi)) {
    if (!isObservant(a) || !isObservant(b))
      continue;
    if (dist(a, b) > PARALLEL_PRESENCE.maxDistanceM)
      continue;
    if (headingDelta(a.h, b.h) > PARALLEL_PRESENCE.maxHeadingDeltaRad)
      continue;
    const recent = lastFiredTick(
      ctx.sql,
      "parallel_presence",
      a.id,
      [b.id],
      ctx.tick,
      cooldown
    );
    if (recent !== null)
      continue;
    out.push(makePairFiring("parallel_presence", a, b, ctx.tick, {
      distance: dist(a, b),
      heading_delta: headingDelta(a.h, b.h)
    }, 0.03, 0.02));
  }
  return out;
}
__name(detectParallelPresence, "detectParallelPresence");
function detectMutualWitnessing(ctx) {
  const out = [];
  const cooldown = cooldownFromHours(
    MUTUAL_WITNESSING.cooldownSimHours,
    ctx.tickHz
  );
  for (const [a, b] of pairsOf(ctx.koi)) {
    if (!isObservant(a) || !isObservant(b))
      continue;
    if (dist(a, b) > MUTUAL_WITNESSING.maxDistanceM)
      continue;
    const aFacing = headingDelta(a.h, headingTo(a, b));
    const bFacing = headingDelta(b.h, headingTo(b, a));
    if (aFacing > MUTUAL_WITNESSING.maxMutualFacingDeltaRad)
      continue;
    if (bFacing > MUTUAL_WITNESSING.maxMutualFacingDeltaRad)
      continue;
    const recent = lastFiredTick(
      ctx.sql,
      "witnessing",
      a.id,
      [b.id],
      ctx.tick,
      cooldown
    );
    if (recent !== null)
      continue;
    out.push(makePairFiring("witnessing", a, b, ctx.tick, {
      distance: dist(a, b),
      a_facing: aFacing,
      b_facing: bFacing
    }, 0.05, 0.04));
  }
  return out;
}
__name(detectMutualWitnessing, "detectMutualWitnessing");
function detectSharedAttention(ctx) {
  const out = [];
  for (const poi of ctx.pois) {
    if (ctx.tick > poi.expiresTick)
      continue;
    const participants = [];
    for (const k of ctx.koi) {
      if (!isObservant(k))
        continue;
      const d = Math.hypot(k.x - poi.x, k.z - poi.z);
      if (d > SHARED_ATTENTION.maxDistanceToPoiM)
        continue;
      const heading = Math.atan2(poi.z - k.z, poi.x - k.x);
      if (headingDelta(k.h, heading) > SHARED_ATTENTION.maxHeadingDeltaRad)
        continue;
      participants.push(k);
    }
    if (participants.length < SHARED_ATTENTION.minParticipants)
      continue;
    const firstActor = participants[0];
    const recent = lastFiredTick(
      ctx.sql,
      "shared_attention",
      firstActor.id,
      [poi.id],
      ctx.tick,
      SHARED_ATTENTION.cooldownTicksPerPoi
    );
    if (recent !== null)
      continue;
    out.push({
      mechanism: "shared_attention",
      family: FAMILY_OF["shared_attention"],
      actor: firstActor.id,
      participants: participants.map((p) => p.id),
      tick: ctx.tick,
      actorDelta: { p: 0.03 },
      participantDelta: { p: 0.03 },
      payload: {
        poi_id: poi.id,
        poi_kind: poi.kind,
        count: participants.length
      },
      cardValenceBump: 0.02
    });
  }
  return out;
}
__name(detectSharedAttention, "detectSharedAttention");
function detectBearingWitness(ctx) {
  const out = [];
  const cooldown = cooldownFromHours(
    BEARING_WITNESS.cooldownSimHours,
    ctx.tickHz
  );
  for (const target of ctx.koi) {
    if (!isObservant(target))
      continue;
    if (target.pad.p > -BEARING_WITNESS.minValenceNegativity)
      continue;
    for (const witness of ctx.koi) {
      if (witness.id === target.id)
        continue;
      if (!isObservant(witness))
        continue;
      if (dist(witness, target) > BEARING_WITNESS.maxDistanceM)
        continue;
      const recent = lastFiredTick(
        ctx.sql,
        "bearing_witness",
        witness.id,
        [target.id],
        ctx.tick,
        cooldown
      );
      if (recent !== null)
        continue;
      out.push({
        mechanism: "bearing_witness",
        family: FAMILY_OF["bearing_witness"],
        actor: witness.id,
        participants: [witness.id, target.id],
        tick: ctx.tick,
        actorDelta: { p: 0.04, a: -0.02 },
        participantDelta: { p: 0.08, a: -0.04 },
        payload: {
          witness: witness.id,
          target: target.id,
          target_valence: target.pad.p,
          distance: dist(witness, target)
        },
        cardValenceBump: 0.03
      });
    }
  }
  return out;
}
__name(detectBearingWitness, "detectBearingWitness");
function detectJoyfulReunion(ctx) {
  const out = [];
  const reunionCooldown = cooldownFromHours(
    JOYFUL_REUNION.cooldownSimHours,
    ctx.tickHz
  );
  const minApartTicks = cooldownFromHours(
    JOYFUL_REUNION.minHoursApart,
    ctx.tickHz
  );
  for (const [a, b] of pairsOf(ctx.koi)) {
    if (!isObservant(a) || !isObservant(b))
      continue;
    if (dist(a, b) > JOYFUL_REUNION.maxDistanceM)
      continue;
    const cardA = ctx.sql.exec(
      `SELECT valence FROM relationship_card WHERE self_id=? AND other_id=?`,
      a.id,
      b.id
    ).toArray()[0];
    const cardB = ctx.sql.exec(
      `SELECT valence FROM relationship_card WHERE self_id=? AND other_id=?`,
      b.id,
      a.id
    ).toArray()[0];
    const valenceA = cardA?.["valence"] ?? 0;
    const valenceB = cardB?.["valence"] ?? 0;
    if (valenceA < JOYFUL_REUNION.minPriorValence)
      continue;
    if (valenceB < JOYFUL_REUNION.minPriorValence)
      continue;
    const recentProx = lastFiredTick(
      ctx.sql,
      "parallel_presence",
      a.id,
      [b.id],
      ctx.tick,
      minApartTicks
    );
    if (recentProx !== null)
      continue;
    const recentReunion = lastFiredTick(
      ctx.sql,
      "joyful_reunion",
      a.id,
      [b.id],
      ctx.tick,
      reunionCooldown
    );
    if (recentReunion !== null)
      continue;
    out.push(makePairFiring("joyful_reunion", a, b, ctx.tick, {
      distance: dist(a, b),
      prior_valence_a: valenceA,
      prior_valence_b: valenceB
    }, 0.12, 0.1));
  }
  return out;
}
__name(detectJoyfulReunion, "detectJoyfulReunion");
function makePairFiring(mech, a, b, tick, payload, actorDp, targetDp) {
  return {
    mechanism: mech,
    family: FAMILY_OF[mech],
    actor: a.id,
    participants: [a.id, b.id],
    tick,
    actorDelta: { p: actorDp },
    participantDelta: { p: targetDp },
    payload,
    cardValenceBump: Math.max(actorDp, targetDp) * 0.5
  };
}
__name(makePairFiring, "makePairFiring");
function runWitnessingDetectors(ctx) {
  return [
    ...detectParallelPresence(ctx),
    ...detectMutualWitnessing(ctx),
    ...detectSharedAttention(ctx),
    ...detectBearingWitness(ctx),
    ...detectJoyfulReunion(ctx)
  ];
}
__name(runWitnessingDetectors, "runWitnessingDetectors");

// src/events.ts
function newEventId() {
  return crypto.randomUUID();
}
__name(newEventId, "newEventId");
async function sha256Hex(s) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (const b of bytes)
    hex += b.toString(16).padStart(2, "0");
  return hex;
}
__name(sha256Hex, "sha256Hex");
async function computeConfigHash(input) {
  const canonical = JSON.stringify({
    v: input.pondVersion,
    ablated: [...input.ablatedMechanisms].sort(),
    cog: input.cognitionEnabled,
    hz: input.tickHz
  });
  return (await sha256Hex(canonical)).slice(0, 16);
}
__name(computeConfigHash, "computeConfigHash");
async function buildEnvelope(init, context2) {
  const payload = init.payload ?? {};
  const payloadJson = JSON.stringify(payload);
  return {
    id: newEventId(),
    at: Date.now(),
    tick: init.tick,
    pondId: context2.pondId,
    actor: init.actor,
    type: init.type,
    targets: init.targets ?? [],
    mechanism: init.mechanism ?? null,
    affectDelta: init.affectDelta ?? null,
    llm: init.llm ?? null,
    payload,
    payloadHash: await sha256Hex(payloadJson),
    schemaVersion: 1,
    configHash: context2.configHash
  };
}
__name(buildEnvelope, "buildEnvelope");
function persistEvent(sql, e) {
  sql.exec(
    `INSERT INTO event (
      id, at_ms, tick, actor, type, targets_json, mechanism,
      affect_delta_json, llm_model, llm_temperature, llm_tokens_in,
      llm_tokens_out, llm_cost_usd, payload_json, payload_hash,
      schema_version, config_hash
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`,
    e.id,
    e.at,
    e.tick,
    e.actor,
    e.type,
    JSON.stringify(e.targets),
    e.mechanism,
    e.affectDelta ? JSON.stringify(e.affectDelta) : null,
    e.llm?.model ?? null,
    e.llm?.temperature ?? null,
    e.llm?.tokensIn ?? null,
    e.llm?.tokensOut ?? null,
    e.llm?.costUsd ?? null,
    JSON.stringify(e.payload),
    e.payloadHash,
    e.schemaVersion,
    e.configHash
  );
}
__name(persistEvent, "persistEvent");
function sinkToAE(ae, e) {
  if (!ae)
    return;
  try {
    ae.writeDataPoint({
      blobs: [
        e.actor,
        e.type,
        e.mechanism ?? "",
        e.llm?.model ?? "",
        e.pondId
      ],
      doubles: [
        e.llm?.tokensIn ?? 0,
        e.llm?.tokensOut ?? 0,
        e.llm?.costUsd ?? 0,
        e.affectDelta?.p ?? 0,
        e.affectDelta?.a ?? 0,
        e.affectDelta?.d ?? 0
      ],
      indexes: [e.type]
    });
  } catch {
  }
}
__name(sinkToAE, "sinkToAE");
async function emit2(sql, ae, context2, init) {
  const env2 = await buildEnvelope(init, context2);
  persistEvent(sql, env2);
  sinkToAE(ae, env2);
  return env2;
}
__name(emit2, "emit");

// src/mechanisms/repair.ts
var REPAIR_THRESHOLDS = {
  /** Window for considering a rupture "recent" for apology validation. */
  apologyLookbackSimDays: 14,
  /** Minimum valence drop for an event to count as a rupture. (§ IX) */
  ruptureMinValenceDrop: 0.3,
  /** Forgiveness requires a matching prior apology within this window. */
  forgivenessLookbackSimDays: 14
};
function findRecentRupture(sql, actor, target, nowTick, tickHz) {
  const lower = nowTick - REPAIR_THRESHOLDS.apologyLookbackSimDays * 24 * 3600 * tickHz;
  const row = sql.exec(
    `SELECT tick, payload_json
       FROM event
      WHERE type = 'rupture'
        AND actor = ?
        AND targets_json LIKE ?
        AND tick > ?
      ORDER BY tick DESC LIMIT 1`,
    `koi:${actor}`,
    `%"${target}"%`,
    lower
  ).toArray()[0];
  if (!row)
    return null;
  const payload = JSON.parse(row["payload_json"]);
  const drop = payload.valence_drop ?? 0;
  if (drop < REPAIR_THRESHOLDS.ruptureMinValenceDrop)
    return null;
  return {
    tick: row["tick"],
    valenceDrop: drop
  };
}
__name(findRecentRupture, "findRecentRupture");
function findRecentApology(sql, actor, target, nowTick, tickHz) {
  const lower = nowTick - REPAIR_THRESHOLDS.forgivenessLookbackSimDays * 24 * 3600 * tickHz;
  const row = sql.exec(
    `SELECT tick FROM event
      WHERE type = 'apology'
        AND actor = ?
        AND targets_json LIKE ?
        AND tick > ?
      ORDER BY tick DESC LIMIT 1`,
    `koi:${actor}`,
    `%"${target}"%`,
    lower
  ).toArray()[0];
  if (!row)
    return null;
  return { tick: row["tick"] };
}
__name(findRecentApology, "findRecentApology");
function validateApology(sql, actor, target, nowTick, tickHz) {
  const rupture = findRecentRupture(sql, actor, target, nowTick, tickHz);
  if (!rupture) {
    return {
      kind: "downgraded",
      reason: "no_rupture_within_window",
      firingAttempt: { mechanism: "apology", actor, target }
    };
  }
  return {
    kind: "honored",
    firing: {
      mechanism: "apology",
      family: FAMILY_OF["apology"],
      actor,
      participants: [actor, target],
      tick: nowTick,
      // Actor feels relief; target receives repair — § VIII values
      actorDelta: { p: 0.1, a: -0.02 },
      participantDelta: { p: 0.2, a: -0.05, d: 0.02 },
      payload: {
        ref_rupture_tick: rupture.tick,
        rupture_drop: rupture.valenceDrop
      },
      cardValenceBump: 0.08
      // repair moves the card more than witnessing
    }
  };
}
__name(validateApology, "validateApology");
function validateForgiveness(sql, actor, target, nowTick, tickHz) {
  const apology = findRecentApology(sql, target, actor, nowTick, tickHz);
  if (!apology) {
    return {
      kind: "downgraded",
      reason: "no_prior_apology_within_window",
      firingAttempt: { mechanism: "forgiveness", actor, target }
    };
  }
  return {
    kind: "honored",
    firing: {
      mechanism: "forgiveness",
      family: FAMILY_OF["forgiveness"],
      actor,
      participants: [actor, target],
      tick: nowTick,
      actorDelta: { p: 0.15, a: -0.05 },
      participantDelta: { p: 0.22, a: -0.08 },
      payload: {
        ref_apology_tick: apology.tick
      },
      cardValenceBump: 0.1
    }
  };
}
__name(validateForgiveness, "validateForgiveness");
function detectGriefCompanionship(_ctx) {
  return [];
}
__name(detectGriefCompanionship, "detectGriefCompanionship");
function detectFarewellRitual(_ctx) {
  return [];
}
__name(detectFarewellRitual, "detectFarewellRitual");
function detectEmotionalAttunement(_ctx) {
  return [];
}
__name(detectEmotionalAttunement, "detectEmotionalAttunement");
function detectCognitiveRepair(_ctx) {
  return [];
}
__name(detectCognitiveRepair, "detectCognitiveRepair");
function runRepairDetectors(ctx) {
  return [
    ...detectGriefCompanionship(ctx),
    ...detectFarewellRitual(ctx),
    ...detectEmotionalAttunement(ctx),
    ...detectCognitiveRepair(ctx)
  ];
}
__name(runRepairDetectors, "runRepairDetectors");
function isClaimValidated(m) {
  return m === "apology" || m === "forgiveness";
}
__name(isClaimValidated, "isClaimValidated");

// src/artifacts.ts
var ARTIFACT_LIMITS = {
  /** Per-koi cap on gift production, in sim-days. */
  giftCooldownSimDays: 7,
  /** Max items a koi can carry. */
  maxInventoryPerKoi: 3,
  /** Pond-wide spawn rate for found materials, in items per sim-day. */
  foundMaterialSpawnRatePerDay: 0.5,
  /** Wear increment per sim-day of being held. */
  wearPerSimDay: 0.01,
  /** Wear threshold past which an artifact becomes too worn and dissolves. */
  wearDissolveThreshold: 0.95,
  /** Lily petals decay faster. */
  wearPerSimDayLilyPetal: 0.12
};
var FOUND_MATERIALS = [
  {
    type: "pebble",
    substance: "quartz",
    colorPalette: ["#b8b2a0", "#8f8a78", "#cfcbbd", "#6f6c5e"],
    motifs: ["stone", "smooth"],
    rarity: 0.3,
    weight: 0.52,
    sacred: false
  },
  {
    type: "reed_fragment",
    substance: "reed",
    colorPalette: ["#9cad62", "#76873f", "#bcc88b"],
    motifs: ["plant", "fragile"],
    rarity: 0.4,
    weight: 0.24,
    sacred: false
  },
  {
    type: "snail_shell",
    substance: "calcium",
    colorPalette: ["#e6d4a8", "#c8a572", "#a17a48"],
    motifs: ["spiral", "empty-home"],
    rarity: 0.7,
    weight: 0.1,
    sacred: false
  },
  {
    type: "lily_petal",
    substance: "petal",
    colorPalette: ["#f2d1e0", "#e8a7c4", "#fcecf2"],
    motifs: ["flower", "ephemeral"],
    rarity: 0.5,
    weight: 0.1,
    sacred: false
  },
  {
    type: "shed_scale",
    substance: "keratin",
    colorPalette: ["#d4c08a", "#b89e5a", "#e8d8a8", "#968042"],
    motifs: ["body", "self-remnant"],
    rarity: 0.8,
    weight: 0.04,
    sacred: false
  }
];
function pickFoundMaterial(rng) {
  const totalWeight = FOUND_MATERIALS.reduce((a, m) => a + m.weight, 0);
  let u = rng.float() * totalWeight;
  for (const m of FOUND_MATERIALS) {
    u -= m.weight;
    if (u <= 0)
      return m;
  }
  return FOUND_MATERIALS[0];
}
__name(pickFoundMaterial, "pickFoundMaterial");
function pickSpawnLocation(rng, template) {
  if (template.type === "lily_petal") {
    const ang2 = rng.float() * 2 * Math.PI;
    const r2 = rng.float() * POND.radius * 0.8;
    return { x: r2 * Math.cos(ang2), y: -0.08, z: r2 * Math.sin(ang2) };
  }
  if (template.type === "reed_fragment") {
    const ang2 = rng.float() * 2 * Math.PI;
    const r2 = POND.shelfRadiusMin + rng.float() * (POND.shelfRadiusMax - POND.shelfRadiusMin);
    return { x: r2 * Math.cos(ang2), y: -0.35, z: r2 * Math.sin(ang2) };
  }
  const ang = rng.float() * 2 * Math.PI;
  const r = rng.float() * POND.radius * 0.85;
  return { x: r * Math.cos(ang), y: -POND.maxDepth + 0.1, z: r * Math.sin(ang) };
}
__name(pickSpawnLocation, "pickSpawnLocation");
function createFoundMaterial(sql, init) {
  const template = pickFoundMaterial(init.rng);
  const loc = pickSpawnLocation(init.rng, template);
  const color = template.colorPalette[init.rng.int(0, template.colorPalette.length)] ?? "#888";
  const id = `art_${init.atTick.toString(36)}_${init.rng.int(0, 65535).toString(16).padStart(4, "0")}`;
  const artifact = {
    id,
    type: template.type,
    originEventId: null,
    createdAtTick: init.atTick,
    substance: template.substance,
    color,
    wear: 0,
    luminosity: 0,
    inscription: null,
    motifs: [...template.motifs],
    rarity: template.rarity,
    sacred: template.sacred,
    state: "lost",
    currentHolder: null,
    loc
  };
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: id,
    atTick: init.atTick,
    mode: "found",
    fromHolder: null,
    toHolder: null,
    note: "materialized"
  });
  return artifact;
}
__name(createFoundMaterial, "createFoundMaterial");
function createNameTile(sql, init) {
  const id = `art_tile_${init.atTick.toString(36)}_${init.deceasedId.slice(-4)}`;
  const artifact = {
    id,
    type: "name_tile",
    originEventId: null,
    createdAtTick: init.atTick,
    substance: "slate",
    color: "#2a2c2e",
    wear: 0,
    luminosity: 0,
    inscription: init.deceasedName,
    motifs: ["memorial", "name", "shrine"],
    rarity: 1,
    sacred: true,
    state: "placed",
    currentHolder: null,
    loc: init.shrineLoc
  };
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: id,
    atTick: init.atTick,
    mode: "created",
    fromHolder: null,
    toHolder: init.placedByKoiId,
    note: `for:${init.deceasedId}`
  });
  writeProvenance(sql, {
    artifactId: id,
    atTick: init.atTick,
    mode: "offered",
    fromHolder: init.placedByKoiId,
    toHolder: null,
    note: "placed at shrine"
  });
  return artifact;
}
__name(createNameTile, "createNameTile");
function writeArtifactRow(sql, a) {
  sql.exec(
    `INSERT INTO artifact (
       id, type, origin_event_id, created_at_tick, substance, color,
       wear, luminosity, inscription, motifs_json, rarity, sacred,
       state, current_holder, current_loc_x, current_loc_y, current_loc_z
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       state = excluded.state,
       current_holder = excluded.current_holder,
       current_loc_x = excluded.current_loc_x,
       current_loc_y = excluded.current_loc_y,
       current_loc_z = excluded.current_loc_z,
       wear = excluded.wear,
       inscription = excluded.inscription`,
    a.id,
    a.type,
    a.originEventId,
    a.createdAtTick,
    a.substance,
    a.color,
    a.wear,
    a.luminosity,
    a.inscription,
    JSON.stringify(a.motifs),
    a.rarity,
    a.sacred ? 1 : 0,
    a.state,
    a.currentHolder,
    a.loc?.x ?? null,
    a.loc?.y ?? null,
    a.loc?.z ?? null
  );
}
__name(writeArtifactRow, "writeArtifactRow");
function writeProvenance(sql, p) {
  sql.exec(
    `INSERT INTO artifact_provenance
       (artifact_id, at_tick, mode, from_holder, to_holder, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    p.artifactId,
    p.atTick,
    p.mode,
    p.fromHolder,
    p.toHolder,
    p.note
  );
}
__name(writeProvenance, "writeProvenance");
function loadHeldArtifacts(sql, holderId) {
  const rows = sql.exec(
    `SELECT * FROM artifact WHERE state = 'held' AND current_holder = ?`,
    holderId
  ).toArray();
  return rows.map(rowToArtifact);
}
__name(loadHeldArtifacts, "loadHeldArtifacts");
function countHeldBy(sql, holderId) {
  const row = sql.exec(
    `SELECT COUNT(*) AS n FROM artifact
      WHERE state = 'held' AND current_holder = ?`,
    holderId
  ).toArray()[0];
  return row?.["n"] ?? 0;
}
__name(countHeldBy, "countHeldBy");
function hasCapacity(sql, holderId) {
  return countHeldBy(sql, holderId) < ARTIFACT_LIMITS.maxInventoryPerKoi;
}
__name(hasCapacity, "hasCapacity");
function loadNearbyLooseArtifacts(sql, loc, radius) {
  const rows = sql.exec(
    `SELECT * FROM artifact
      WHERE state IN ('lost', 'placed')
        AND current_loc_x BETWEEN ? AND ?
        AND current_loc_z BETWEEN ? AND ?`,
    loc.x - radius,
    loc.x + radius,
    loc.z - radius,
    loc.z + radius
  ).toArray();
  const r2 = radius * radius;
  return rows.filter((r) => {
    const dx = r["current_loc_x"] - loc.x;
    const dz = r["current_loc_z"] - loc.z;
    return dx * dx + dz * dz <= r2;
  }).map(rowToArtifact);
}
__name(loadNearbyLooseArtifacts, "loadNearbyLooseArtifacts");
function lastGiftGivenTick(sql, giverId, nowTick) {
  const row = sql.exec(
    `SELECT MAX(at_tick) AS t FROM artifact_provenance
      WHERE mode = 'given' AND from_holder = ? AND at_tick <= ?`,
    giverId,
    nowTick
  ).toArray()[0];
  const t = row?.["t"];
  return typeof t === "number" ? t : null;
}
__name(lastGiftGivenTick, "lastGiftGivenTick");
function pickUp(sql, artifact, holder, atTick) {
  artifact.state = "held";
  artifact.currentHolder = holder;
  artifact.loc = null;
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id,
    atTick,
    mode: "found",
    fromHolder: null,
    toHolder: holder,
    note: "picked up"
  });
}
__name(pickUp, "pickUp");
function transferAsGift(sql, artifact, from, to, atTick) {
  artifact.state = "held";
  artifact.currentHolder = to;
  artifact.loc = null;
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id,
    atTick,
    mode: "given",
    fromHolder: from,
    toHolder: to,
    note: null
  });
}
__name(transferAsGift, "transferAsGift");
function transferAsHeirloom(sql, artifact, from, to, atTick) {
  artifact.currentHolder = to;
  artifact.state = "held";
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id,
    atTick,
    mode: "inherited",
    fromHolder: from,
    toHolder: to,
    note: "upon death"
  });
}
__name(transferAsHeirloom, "transferAsHeirloom");
function markDiedWith(sql, artifact, from, loc, atTick) {
  artifact.state = "lost";
  artifact.currentHolder = null;
  artifact.loc = loc;
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id,
    atTick,
    mode: "died_with",
    fromHolder: from,
    toHolder: null,
    note: null
  });
}
__name(markDiedWith, "markDiedWith");
function offerAtShrine(sql, artifact, from, atTick) {
  artifact.state = "offered";
  artifact.currentHolder = null;
  artifact.loc = { x: POND.shrine.x, y: -POND.maxDepth + 0.05, z: POND.shrine.z };
  writeArtifactRow(sql, artifact);
  writeProvenance(sql, {
    artifactId: artifact.id,
    atTick,
    mode: "offered",
    fromHolder: from,
    toHolder: null,
    note: null
  });
}
__name(offerAtShrine, "offerAtShrine");
var HEIR_MIN_VALENCE = 0.35;
function chooseHeir(sql, deceasedId, livingKoi) {
  const candidates = [];
  for (const k of livingKoi) {
    if (k.id === deceasedId)
      continue;
    if (k.stage === "egg" || k.stage === "fry")
      continue;
    const row = sql.exec(
      `SELECT valence FROM relationship_card
        WHERE self_id = ? AND other_id = ?`,
      k.id,
      deceasedId
    ).toArray()[0];
    const valence = row?.["valence"] ?? 0;
    if (valence >= HEIR_MIN_VALENCE) {
      candidates.push({ koiId: k.id, valence });
    }
  }
  if (candidates.length === 0)
    return null;
  candidates.sort((a, b) => b.valence - a.valence);
  return candidates[0];
}
__name(chooseHeir, "chooseHeir");
function rowToArtifact(r) {
  return {
    id: r["id"],
    type: r["type"],
    originEventId: r["origin_event_id"] ?? null,
    createdAtTick: r["created_at_tick"],
    substance: r["substance"],
    color: r["color"],
    wear: r["wear"],
    luminosity: r["luminosity"],
    inscription: r["inscription"] ?? null,
    motifs: JSON.parse(r["motifs_json"]),
    rarity: r["rarity"],
    sacred: r["sacred"] === 1,
    state: r["state"],
    currentHolder: r["current_holder"] ?? null,
    loc: r["current_loc_x"] != null ? {
      x: r["current_loc_x"],
      y: r["current_loc_y"],
      z: r["current_loc_z"]
    } : null
  };
}
__name(rowToArtifact, "rowToArtifact");

// src/mechanisms/gift.ts
var GIFT_THRESHOLDS = {
  /** Max proximity at which a gift can fire (the giver must be near
   *  the recipient). */
  maxGiftProximityM: 0.5,
  /** Minimum relationship valence toward the recipient to gift. A koi
   *  does not give to strangers — matches § IX: "gifts confirm bondedness,
   *  they do not build it." */
  minGiverValence: 0.15,
  /** Offering at shrine requires proximity to the shrine. */
  maxShrineProximityM: 0.8,
  /** Cooldown on shrine offerings by a single koi — looser than gifting. */
  offeringCooldownSimHours: 24,
  /** Cooldown between distinct gifting events for the same actor-recipient. */
  giftCooldownSimHours: 24
};
function detectGift(ctx) {
  const out = [];
  for (const giver of ctx.koi) {
    if (giver.stage === "egg" || giver.stage === "fry" || giver.stage === "dying")
      continue;
    const held = loadHeldArtifacts(ctx.sql, giver.id);
    if (held.length === 0)
      continue;
    const cooldownTicks = ARTIFACT_LIMITS.giftCooldownSimDays * 24 * 3600 * ctx.tickHz;
    const lastGift = lastGiftGivenTick(ctx.sql, giver.id, ctx.tick);
    if (lastGift !== null && ctx.tick - lastGift < cooldownTicks)
      continue;
    for (const target of ctx.koi) {
      if (target.id === giver.id)
        continue;
      if (target.stage === "egg" || target.stage === "fry" || target.stage === "dying")
        continue;
      const d = Math.hypot(giver.x - target.x, giver.z - target.z);
      if (d > GIFT_THRESHOLDS.maxGiftProximityM)
        continue;
      const cardRow = ctx.sql.exec(
        `SELECT valence FROM relationship_card
          WHERE self_id = ? AND other_id = ?`,
        giver.id,
        target.id
      ).toArray()[0];
      const valence = cardRow?.["valence"] ?? 0;
      if (valence < GIFT_THRESHOLDS.minGiverValence)
        continue;
      if (!hasCapacity(ctx.sql, target.id))
        continue;
      const pairCooldown = Math.floor(
        GIFT_THRESHOLDS.giftCooldownSimHours * 3600 * ctx.tickHz
      );
      const recentToThisRecipient = lastFiredTick(
        ctx.sql,
        "gift",
        giver.id,
        [target.id],
        ctx.tick,
        pairCooldown
      );
      if (recentToThisRecipient !== null)
        continue;
      const artifact = [...held].sort((a, b) => a.wear - b.wear)[0];
      const priorOwn = ctx.sql.exec(
        `SELECT COUNT(*) AS n FROM artifact_provenance
          WHERE artifact_id = ?
            AND mode = 'given'
            AND to_holder = ?`,
        artifact.id,
        giver.id
      ).toArray()[0];
      const isPassItForward = (priorOwn?.["n"] ?? 0) > 0;
      out.push({
        mechanism: isPassItForward ? "pass_it_forward" : "gift",
        giver: giver.id,
        recipient: target.id,
        artifact,
        giverValence: valence,
        chainLengthSoFar: priorOwn?.["n"] ?? 0
      });
      break;
    }
  }
  return out;
}
__name(detectGift, "detectGift");
function giftDetectionToFiring(d, atTick) {
  const isForward = d.mechanism === "pass_it_forward";
  const actorDp = isForward ? 0.06 : 0.09;
  const recipientDp = isForward ? 0.08 : 0.14;
  return {
    mechanism: d.mechanism,
    family: FAMILY_OF[d.mechanism],
    actor: d.giver,
    participants: [d.giver, d.recipient],
    tick: atTick,
    actorDelta: { p: actorDp, d: 0.02 },
    participantDelta: { p: recipientDp, d: -0.01 },
    payload: {
      artifact_id: d.artifact.id,
      artifact_type: d.artifact.type,
      chain_length_so_far: d.chainLengthSoFar,
      giver_valence: d.giverValence
    },
    cardValenceBump: isForward ? 0.05 : 0.08
  };
}
__name(giftDetectionToFiring, "giftDetectionToFiring");
function detectOffering(ctx) {
  const out = [];
  for (const k of ctx.koi) {
    if (k.stage === "egg" || k.stage === "fry" || k.stage === "dying")
      continue;
    const held = loadHeldArtifacts(ctx.sql, k.id);
    if (held.length === 0)
      continue;
    const d = Math.hypot(k.x - POND.shrine.x, k.z - POND.shrine.z);
    if (d > GIFT_THRESHOLDS.maxShrineProximityM)
      continue;
    const cooldown = Math.floor(
      GIFT_THRESHOLDS.offeringCooldownSimHours * 3600 * ctx.tickHz
    );
    const recent = lastFiredTick(
      ctx.sql,
      "offering",
      k.id,
      [],
      ctx.tick,
      cooldown
    );
    if (recent !== null)
      continue;
    const artifact = [...held].sort((a, b) => b.wear - a.wear)[0];
    offerAtShrine(ctx.sql, artifact, k.id, ctx.tick);
    out.push({
      mechanism: "offering",
      family: FAMILY_OF["offering"],
      actor: k.id,
      participants: [k.id],
      tick: ctx.tick,
      actorDelta: { p: 0.1, a: -0.04, d: 0.04 },
      participantDelta: { p: 0 },
      payload: {
        artifact_id: artifact.id,
        artifact_type: artifact.type,
        wear: artifact.wear
      },
      cardValenceBump: 0
    });
  }
  return out;
}
__name(detectOffering, "detectOffering");
function runGiftFamily(ctx) {
  const firings = [];
  for (const d of detectGift(ctx)) {
    transferAsGift(ctx.sql, d.artifact, d.giver, d.recipient, ctx.tick);
    firings.push(giftDetectionToFiring(d, ctx.tick));
  }
  for (const f of detectOffering(ctx)) {
    firings.push(f);
  }
  return firings;
}
__name(runGiftFamily, "runGiftFamily");

// src/mechanisms/play.ts
var PLAY_THRESHOLDS = {
  // ── play_invitation ──
  invitationMaxProximityM: 2.5,
  invitationMinActorArousal: 0.6,
  invitationMinActorValence: 0.2,
  invitationMinTargetArousal: 0.3,
  invitationHeadingSpikeRad: Math.PI / 2,
  // > 90° change in 2 ticks
  invitationVelocitySpikeRatio: 1.5,
  // 1.5× actor's rolling mean
  invitationPairCooldownSimHours: 2,
  // permissive; tighten later
  // ── tag ──
  tagInvitationWindowTicks: 30,
  // 15 sim-sec to convert invitation → tag
  tagContactProximityM: 0.4,
  tagChainTimeoutTicks: 60,
  // 30 sim-sec of no contact = chain ends
  tagPairCooldownSimHours: 1,
  // ── dance ──
  danceMaxProximityM: 1,
  danceWindowTicks: 20,
  // 10 sim-sec window to test correlation
  danceMinStages: "adolescent",
  // both must be adolescent+
  danceCorrelationThreshold: 0.25,
  // loose; revise after observation
  danceMaxLagTicks: 3,
  // test δ ∈ {1, 2, 3}
  danceRequireSignFlip: true,
  // role alternation required
  dancePairCooldownSimHours: 3,
  // ── synchronized_swim ──
  syncMaxProximityM: 0.6,
  syncMaxVelocityDeltaMps: 0.15,
  syncMaxHeadingDeltaRad: Math.PI / 8,
  syncRequiredSustainTicks: 40,
  // 20 sim-sec continuous match
  syncExcludeIfThirdWithinM: 1.5,
  // dyadic, not shoal
  syncPairCooldownSimHours: 2,
  // ── shared_curiosity ──
  curiosityMaxPoiProximityM: 1,
  curiosityArrivalWindowTicks: 20,
  // 10 sim-sec — both arrived recently
  curiosityMinParticipantValence: 0,
  curiosityPerPoiCooldownTicks: 60
};
var RECENT_HEADINGS_BUFFER_SIZE = 30;
function pushHeading(state, h) {
  state.recentHeadings.push(h);
  if (state.recentHeadings.length > RECENT_HEADINGS_BUFFER_SIZE) {
    state.recentHeadings.shift();
  }
}
__name(pushHeading, "pushHeading");
function detectPlayInvitation(ctx) {
  const out = [];
  for (const actor of ctx.koi) {
    if (!isPlayEligible(actor))
      continue;
    if (actor.pad.a < PLAY_THRESHOLDS.invitationMinActorArousal)
      continue;
    if (actor.pad.p < PLAY_THRESHOLDS.invitationMinActorValence)
      continue;
    const pattern = detectKinematicSpike(actor);
    if (pattern === null)
      continue;
    for (const target of ctx.koi) {
      if (target.id === actor.id)
        continue;
      if (!isPlayEligible(target))
        continue;
      if (target.pad.a < PLAY_THRESHOLDS.invitationMinTargetArousal)
        continue;
      if (target.intent.kind === "retreat" || target.intent.kind === "shelter")
        continue;
      const d = Math.hypot(actor.x - target.x, actor.z - target.z);
      if (d > PLAY_THRESHOLDS.invitationMaxProximityM)
        continue;
      const cd = Math.floor(
        PLAY_THRESHOLDS.invitationPairCooldownSimHours * 3600 * ctx.tickHz
      );
      const recent = lastFiredTick(
        ctx.sql,
        "play_invitation",
        actor.id,
        [target.id],
        ctx.tick,
        cd
      );
      if (recent !== null)
        continue;
      out.push({ actor: actor.id, target: target.id, pattern });
      break;
    }
  }
  return out;
}
__name(detectPlayInvitation, "detectPlayInvitation");
function detectKinematicSpike(k) {
  if (k.intent.kind === "surface_breach")
    return "surface_breach";
  const hs = k.recentHeadings;
  if (hs.length >= 2) {
    const h0 = hs[hs.length - 2];
    const h1 = hs[hs.length - 1];
    const dh = Math.abs(normalizeAngle(h1 - h0));
    if (dh > PLAY_THRESHOLDS.invitationHeadingSpikeRad) {
      return "heading_spike";
    }
  }
  const speed = Math.hypot(k.vx, k.vz);
  const stageNormal = stageNormalSpeed(k.stage);
  if (stageNormal > 0 && speed / stageNormal > PLAY_THRESHOLDS.invitationVelocitySpikeRatio) {
    return "velocity_spike";
  }
  return null;
}
__name(detectKinematicSpike, "detectKinematicSpike");
function invitationDetectionToFiring(d, atTick) {
  return {
    mechanism: "play_invitation",
    family: FAMILY_OF["play_invitation"],
    actor: d.actor,
    participants: [d.actor, d.target],
    tick: atTick,
    actorDelta: { p: 0.05, a: 0.1 },
    participantDelta: { p: 0.04, a: 0.15 },
    // the invitation wakes the target
    payload: { pattern: d.pattern },
    cardValenceBump: 0.03
  };
}
__name(invitationDetectionToFiring, "invitationDetectionToFiring");
function detectTag(ctx) {
  const out = [];
  for (const k of ctx.koi) {
    if (!isPlayEligible(k))
      continue;
    if (k.tagState === null) {
      const invitationTick = recentInvitationTowardMe(ctx, k.id);
      if (invitationTick === null)
        continue;
      const inviter = recentInvitationActor(ctx, k.id);
      if (inviter === null)
        continue;
      const inviterState = ctx.koi.find((o) => o.id === inviter);
      if (!inviterState)
        continue;
      const d = Math.hypot(k.x - inviterState.x, k.z - inviterState.z);
      if (d > PLAY_THRESHOLDS.tagContactProximityM)
        continue;
      const cd = Math.floor(
        PLAY_THRESHOLDS.tagPairCooldownSimHours * 3600 * ctx.tickHz
      );
      const recent = lastFiredTick(
        ctx.sql,
        "tag",
        k.id,
        [inviter],
        ctx.tick,
        cd
      );
      if (recent !== null)
        continue;
      out.push({
        tagger: k.id,
        tagged: inviter,
        chainLength: 1,
        chainStartedTick: ctx.tick
      });
      continue;
    }
    if (k.tagState.isIt) {
      const chainAge = ctx.tick - k.tagState.lastContactTick;
      if (chainAge > PLAY_THRESHOLDS.tagChainTimeoutTicks)
        continue;
      for (const o of ctx.koi) {
        if (o.id === k.id)
          continue;
        if (o.id === k.tagState.taggerId)
          continue;
        if (!isPlayEligible(o))
          continue;
        const d = Math.hypot(k.x - o.x, k.z - o.z);
        if (d > PLAY_THRESHOLDS.tagContactProximityM)
          continue;
        out.push({
          tagger: k.id,
          tagged: o.id,
          chainLength: chainLengthOf(ctx, k.tagState.chainStartedTick) + 1,
          chainStartedTick: k.tagState.chainStartedTick
        });
        break;
      }
    }
  }
  return out;
}
__name(detectTag, "detectTag");
function tagEventToFiring(t, atTick) {
  const intensity = Math.min(1, 0.3 + 0.1 * t.chainLength);
  return {
    mechanism: "tag",
    family: FAMILY_OF["tag"],
    actor: t.tagger,
    participants: [t.tagger, t.tagged],
    tick: atTick,
    actorDelta: { p: 0.05 * intensity, a: 0.08 * intensity },
    participantDelta: { p: 0.04 * intensity, a: 0.1 * intensity },
    payload: {
      chain_length: t.chainLength,
      chain_started_tick: t.chainStartedTick
    },
    cardValenceBump: 0.02 * intensity
  };
}
__name(tagEventToFiring, "tagEventToFiring");
function applyTagEvent(t, tagger, tagged, atTick) {
  tagger.tagState = null;
  tagged.tagState = {
    isIt: true,
    taggerId: t.tagger,
    chainStartedTick: t.chainStartedTick,
    lastContactTick: atTick
  };
}
__name(applyTagEvent, "applyTagEvent");
function detectDance(ctx) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const a of ctx.koi) {
    if (!isDanceEligible(a))
      continue;
    if (a.recentHeadings.length < PLAY_THRESHOLDS.danceWindowTicks)
      continue;
    for (const b of ctx.koi) {
      if (b.id === a.id)
        continue;
      if (!isDanceEligible(b))
        continue;
      if (b.recentHeadings.length < PLAY_THRESHOLDS.danceWindowTicks)
        continue;
      const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      if (seen.has(pairKey))
        continue;
      seen.add(pairKey);
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d > PLAY_THRESHOLDS.danceMaxProximityM)
        continue;
      const cd = Math.floor(
        PLAY_THRESHOLDS.dancePairCooldownSimHours * 3600 * ctx.tickHz
      );
      const recent = lastFiredTick(
        ctx.sql,
        "dance",
        a.id,
        [b.id],
        ctx.tick,
        cd
      );
      if (recent !== null)
        continue;
      const result = computeDanceCorrelation(
        a.recentHeadings,
        b.recentHeadings,
        PLAY_THRESHOLDS.danceWindowTicks,
        PLAY_THRESHOLDS.danceMaxLagTicks
      );
      if (result.bestCorrelation < PLAY_THRESHOLDS.danceCorrelationThreshold)
        continue;
      if (PLAY_THRESHOLDS.danceRequireSignFlip && !result.leaderAlternated)
        continue;
      out.push({
        koiA: a.id,
        koiB: b.id,
        correlation: result.bestCorrelation,
        dominantLag: result.bestLag
      });
    }
  }
  return out;
}
__name(detectDance, "detectDance");
function computeDanceCorrelation(hA, hB, window, maxLag) {
  const sA = hA.slice(-window);
  const sB = hB.slice(-window);
  const dA = [];
  const dB = [];
  for (let i = 1; i < sA.length; i++) {
    dA.push(normalizeAngle(sA[i] - sA[i - 1]));
    dB.push(normalizeAngle(sB[i] - sB[i - 1]));
  }
  let bestCorrelation = 0;
  let bestLag = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    const aLeadsB = correlate(
      dA.slice(0, dA.length - lag),
      dB.slice(lag)
    );
    const bLeadsA = correlate(
      dB.slice(0, dB.length - lag),
      dA.slice(lag)
    );
    const best = Math.max(Math.abs(aLeadsB), Math.abs(bLeadsA));
    if (best > bestCorrelation) {
      bestCorrelation = best;
      bestLag = lag;
    }
  }
  const mid = Math.floor(dA.length / 2);
  const firstHalfLeader = dominantLeader(
    dA.slice(0, mid),
    dB.slice(0, mid),
    maxLag
  );
  const secondHalfLeader = dominantLeader(
    dA.slice(mid),
    dB.slice(mid),
    maxLag
  );
  const leaderAlternated = firstHalfLeader !== "tied" && secondHalfLeader !== "tied" && firstHalfLeader !== secondHalfLeader;
  return { bestCorrelation, bestLag, leaderAlternated };
}
__name(computeDanceCorrelation, "computeDanceCorrelation");
function dominantLeader(dA, dB, maxLag) {
  let bestA = 0, bestB = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    if (dA.length - lag < 3)
      continue;
    const aLeadsB = Math.abs(correlate(dA.slice(0, -lag), dB.slice(lag)));
    const bLeadsA = Math.abs(correlate(dB.slice(0, -lag), dA.slice(lag)));
    if (aLeadsB > bestA)
      bestA = aLeadsB;
    if (bLeadsA > bestB)
      bestB = bLeadsA;
  }
  if (Math.abs(bestA - bestB) < 0.1)
    return "tied";
  return bestA > bestB ? "a" : "b";
}
__name(dominantLeader, "dominantLeader");
function correlate(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2)
    return 0;
  const meanX = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}
__name(correlate, "correlate");
function danceDetectionToFiring(d, atTick) {
  return {
    mechanism: "dance",
    family: FAMILY_OF["dance"],
    actor: d.koiA,
    participants: [d.koiA, d.koiB],
    tick: atTick,
    actorDelta: { p: 0.08, a: 0.05 },
    participantDelta: { p: 0.08, a: 0.05 },
    payload: {
      correlation: d.correlation,
      dominant_lag: d.dominantLag
    },
    cardValenceBump: 0.04
  };
}
__name(danceDetectionToFiring, "danceDetectionToFiring");
function detectSynchronizedSwim(ctx) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const a of ctx.koi) {
    if (!isDanceEligible(a))
      continue;
    for (const b of ctx.koi) {
      if (b.id === a.id)
        continue;
      if (!isDanceEligible(b))
        continue;
      const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      if (seen.has(pairKey))
        continue;
      seen.add(pairKey);
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d > PLAY_THRESHOLDS.syncMaxProximityM)
        continue;
      const hasThird = ctx.koi.some((c) => {
        if (c.id === a.id || c.id === b.id)
          return false;
        const dc = Math.min(
          Math.hypot(c.x - a.x, c.z - a.z),
          Math.hypot(c.x - b.x, c.z - b.z)
        );
        return dc < PLAY_THRESHOLDS.syncExcludeIfThirdWithinM;
      });
      if (hasThird)
        continue;
      const cd = Math.floor(
        PLAY_THRESHOLDS.syncPairCooldownSimHours * 3600 * ctx.tickHz
      );
      const recent = lastFiredTick(
        ctx.sql,
        "synchronized_swim",
        a.id,
        [b.id],
        ctx.tick,
        cd
      );
      if (recent !== null)
        continue;
      const dv = Math.hypot(a.vx - b.vx, a.vz - b.vz);
      if (dv > PLAY_THRESHOLDS.syncMaxVelocityDeltaMps)
        continue;
      const want = PLAY_THRESHOLDS.syncRequiredSustainTicks;
      const hA = a.recentHeadings.slice(-want);
      const hB = b.recentHeadings.slice(-want);
      if (hA.length < want || hB.length < want)
        continue;
      let matchingTicks = 0;
      for (let i = 0; i < want; i++) {
        const dh = Math.abs(normalizeAngle(hA[i] - hB[i]));
        if (dh <= PLAY_THRESHOLDS.syncMaxHeadingDeltaRad)
          matchingTicks++;
      }
      if (matchingTicks < want * 0.9)
        continue;
      out.push({ koiA: a.id, koiB: b.id, sustainedTicks: matchingTicks });
    }
  }
  return out;
}
__name(detectSynchronizedSwim, "detectSynchronizedSwim");
function syncDetectionToFiring(s, atTick) {
  return {
    mechanism: "synchronized_swim",
    family: FAMILY_OF["synchronized_swim"],
    actor: s.koiA,
    participants: [s.koiA, s.koiB],
    tick: atTick,
    actorDelta: { p: 0.06, a: -0.02 },
    // calming, not activating
    participantDelta: { p: 0.06, a: -0.02 },
    payload: { sustained_ticks: s.sustainedTicks },
    cardValenceBump: 0.03
  };
}
__name(syncDetectionToFiring, "syncDetectionToFiring");
function detectSharedCuriosity(ctx) {
  const out = [];
  for (const poi of ctx.pois) {
    const recent = ctx.sql.exec(
      `SELECT MAX(tick) AS t FROM event
        WHERE tick > ?
          AND mechanism = 'shared_curiosity'
          AND payload_json LIKE ?`,
      ctx.tick - PLAY_THRESHOLDS.curiosityPerPoiCooldownTicks,
      `%"poi_id":"${poi.id}"%`
    ).toArray()[0];
    if (recent && typeof recent["t"] === "number")
      continue;
    const nearbyKoi = [];
    for (const k of ctx.koi) {
      if (!isPlayEligible(k))
        continue;
      if (k.pad.p < PLAY_THRESHOLDS.curiosityMinParticipantValence)
        continue;
      const d = Math.hypot(k.x - poi.x, k.z - poi.z);
      if (d > PLAY_THRESHOLDS.curiosityMaxPoiProximityM)
        continue;
      const poiAgeInWindow = ctx.tick - poi.createdTick < PLAY_THRESHOLDS.curiosityArrivalWindowTicks * 3;
      const attending = k.intent.kind === "feed_approach" || k.intent.kind === "approach" || k.intent.kind === "linger";
      if (poiAgeInWindow || attending)
        nearbyKoi.push(k.id);
    }
    if (nearbyKoi.length >= 2) {
      out.push({ poiId: poi.id, participants: nearbyKoi });
    }
  }
  return out;
}
__name(detectSharedCuriosity, "detectSharedCuriosity");
function curiosityDetectionToFiring(c, atTick) {
  return {
    mechanism: "shared_curiosity",
    family: FAMILY_OF["shared_curiosity"],
    actor: c.participants[0],
    participants: c.participants,
    tick: atTick,
    actorDelta: { p: 0.05, a: 0.03 },
    participantDelta: { p: 0.05, a: 0.03 },
    payload: { poi_id: c.poiId, participant_count: c.participants.length },
    cardValenceBump: 0.02
  };
}
__name(curiosityDetectionToFiring, "curiosityDetectionToFiring");
function runPlayFamily(ctx) {
  const firings = [];
  for (const inv of detectPlayInvitation(ctx)) {
    firings.push(invitationDetectionToFiring(inv, ctx.tick));
  }
  for (const t of detectTag(ctx)) {
    firings.push(tagEventToFiring(t, ctx.tick));
  }
  for (const d of detectDance(ctx)) {
    firings.push(danceDetectionToFiring(d, ctx.tick));
  }
  for (const s of detectSynchronizedSwim(ctx)) {
    firings.push(syncDetectionToFiring(s, ctx.tick));
  }
  for (const c of detectSharedCuriosity(ctx)) {
    firings.push(curiosityDetectionToFiring(c, ctx.tick));
  }
  return firings;
}
__name(runPlayFamily, "runPlayFamily");
function isPlayEligible(k) {
  if (k.stage === "egg" || k.stage === "dying")
    return false;
  return true;
}
__name(isPlayEligible, "isPlayEligible");
function isDanceEligible(k) {
  if (k.stage === "egg" || k.stage === "fry" || k.stage === "dying")
    return false;
  return true;
}
__name(isDanceEligible, "isDanceEligible");
function normalizeAngle(a) {
  let x = a % (2 * Math.PI);
  if (x > Math.PI)
    x -= 2 * Math.PI;
  if (x < -Math.PI)
    x += 2 * Math.PI;
  return x;
}
__name(normalizeAngle, "normalizeAngle");
function stageNormalSpeed(stage) {
  switch (stage) {
    case "egg":
      return 0;
    case "fry":
      return 0.08;
    case "juvenile":
      return 0.15;
    case "adolescent":
      return 0.22;
    case "adult":
      return 0.28;
    case "elder":
      return 0.18;
    case "dying":
      return 0.05;
  }
}
__name(stageNormalSpeed, "stageNormalSpeed");
function recentInvitationActor(ctx, koiId) {
  const row = ctx.sql.exec(
    `SELECT actor FROM event
      WHERE tick > ?
        AND mechanism = 'play_invitation'
        AND targets_json LIKE ?
      ORDER BY tick DESC
      LIMIT 1`,
    ctx.tick - PLAY_THRESHOLDS.tagInvitationWindowTicks,
    `%"${koiId}"%`
  ).toArray()[0];
  if (!row)
    return null;
  const actor = row["actor"];
  return actor ? actor.replace(/^koi:/, "") : null;
}
__name(recentInvitationActor, "recentInvitationActor");
function recentInvitationTowardMe(ctx, koiId) {
  const row = ctx.sql.exec(
    `SELECT MAX(tick) AS t FROM event
      WHERE tick > ?
        AND mechanism = 'play_invitation'
        AND targets_json LIKE ?`,
    ctx.tick - PLAY_THRESHOLDS.tagInvitationWindowTicks,
    `%"${koiId}"%`
  ).toArray()[0];
  const t = row?.["t"];
  return typeof t === "number" ? t : null;
}
__name(recentInvitationTowardMe, "recentInvitationTowardMe");
function chainLengthOf(ctx, chainStartedTick) {
  const row = ctx.sql.exec(
    `SELECT COUNT(*) AS n FROM event
      WHERE tick >= ?
        AND mechanism = 'tag'
        AND payload_json LIKE ?`,
    chainStartedTick,
    `%"chain_started_tick":${chainStartedTick}%`
  ).toArray()[0];
  return row?.["n"] ?? 0;
}
__name(chainLengthOf, "chainLengthOf");

// src/mechanisms/index.ts
var DETECTOR_INTERVAL_TICKS = 30;
function runStateDetectors(ctx) {
  return [
    ...runWitnessingDetectors(ctx),
    ...runRepairDetectors(ctx),
    ...runGiftFamily(ctx),
    ...runPlayFamily(ctx)
    // Teaching, ritual — not yet wired
  ];
}
__name(runStateDetectors, "runStateDetectors");
function validateClaim(sql, mechanism, actor, target, nowTick, tickHz) {
  if (!isClaimValidated(mechanism))
    return null;
  switch (mechanism) {
    case "apology":
      return validateApology(sql, actor, target, nowTick, tickHz);
    case "forgiveness":
      return validateForgiveness(sql, actor, target, nowTick, tickHz);
    default:
      return null;
  }
}
__name(validateClaim, "validateClaim");

// src/world.ts
var TICKS_PER_SIM_DAY2 = SIM.tickHz * SIM.realSecondsPerSimDay;
function clockFromTick(tick) {
  const days = tick / TICKS_PER_SIM_DAY2;
  const simDay = Math.floor(days);
  const tDay = days - simDay;
  return { simDay, tDay };
}
__name(clockFromTick, "clockFromTick");
function seasonFor(simDay) {
  const phase = simDay % 30;
  if (phase < 7)
    return "spring";
  if (phase < 15)
    return "summer";
  if (phase < 23)
    return "autumn";
  return "winter";
}
__name(seasonFor, "seasonFor");
function temperatureFor(simDay, tDay) {
  const yearFrac = (simDay % 30 + tDay) / 30;
  const seasonal = 0.5 + 0.35 * Math.cos((yearFrac - 11 / 30) * 2 * Math.PI);
  const diurnal = 0.15 * Math.cos((tDay - 0.2) * 2 * Math.PI);
  return Math.max(0, Math.min(1, seasonal + diurnal));
}
__name(temperatureFor, "temperatureFor");
var WEATHER_TRANSITION = {
  clear: { clear: 0.74, breeze: 0.22, rain: 0.035, storm: 5e-3 },
  breeze: { clear: 0.3, breeze: 0.55, rain: 0.13, storm: 0.02 },
  rain: { clear: 0.06, breeze: 0.3, rain: 0.58, storm: 0.06 },
  storm: { clear: 0.02, breeze: 0.15, rain: 0.4, storm: 0.43 }
};
var SIM_HOUR_TICKS = Math.floor(TICKS_PER_SIM_DAY2 / 24);
function rollWeather(current, rng) {
  const row = WEATHER_TRANSITION[current];
  const u = rng.float();
  let cum = 0;
  for (const w of ["clear", "breeze", "rain", "storm"]) {
    cum += row[w];
    if (u < cum)
      return w;
  }
  return current;
}
__name(rollWeather, "rollWeather");
function clarityStep(prevClarity, weather, dt) {
  const target = weather === "storm" ? 0.25 : weather === "rain" ? 0.55 : weather === "breeze" ? 0.85 : 0.95;
  const halftime = 2 * 3600;
  const k = Math.pow(0.5, dt / halftime);
  return prevClarity + (target - prevClarity) * (1 - k);
}
__name(clarityStep, "clarityStep");
var SOLSTICE_TDAY_CENTER = 0.12;
var SOLSTICE_TDAY_HALFWIDTH = 3e-3;
var SOLSTICE_DAY_MOD = 6;
function isSolsticeActive(simDay, tDay) {
  if (simDay % 7 !== SOLSTICE_DAY_MOD)
    return false;
  return Math.abs(tDay - SOLSTICE_TDAY_CENTER) < SOLSTICE_TDAY_HALFWIDTH;
}
__name(isSolsticeActive, "isSolsticeActive");
function nextSolsticeTick(fromTick) {
  const { simDay, tDay } = clockFromTick(fromTick);
  const startTDay = SOLSTICE_TDAY_CENTER - SOLSTICE_TDAY_HALFWIDTH;
  let daysAhead = (SOLSTICE_DAY_MOD - simDay % 7 + 7) % 7;
  if (daysAhead === 0 && tDay >= SOLSTICE_TDAY_CENTER + SOLSTICE_TDAY_HALFWIDTH) {
    daysAhead = 7;
  }
  const targetDay = simDay + daysAhead;
  const targetTick = (targetDay + startTDay) * TICKS_PER_SIM_DAY2;
  return Math.floor(targetTick);
}
__name(nextSolsticeTick, "nextSolsticeTick");
function advanceWorld(prev, newTick, rng) {
  const { simDay, tDay } = clockFromTick(newTick);
  const prevSimDay = Math.floor(
    prev.simDay + prev.tDay + 0
  );
  const season = seasonFor(simDay);
  const transitions = [];
  let weather = prev.weather;
  if (newTick % SIM_HOUR_TICKS === 0) {
    const next2 = rollWeather(weather, rng);
    if (next2 !== weather) {
      transitions.push({ kind: "weather_changed", from: weather, to: next2 });
      weather = next2;
    }
  }
  if (season !== prev.season) {
    transitions.push({ kind: "season_changed", from: prev.season, to: season });
  }
  if (simDay !== prev.simDay) {
    transitions.push({ kind: "day_advanced", from: prev.simDay, to: simDay });
  }
  const dt = SIM.tickIntervalMs / 1e3;
  const clarity = clarityStep(prev.clarity, weather, dt);
  const temperature = temperatureFor(simDay, tDay);
  const solsticeActive = isSolsticeActive(simDay, tDay);
  if (solsticeActive && !prev.solsticeActive) {
    transitions.push({ kind: "solstice_began" });
  } else if (!solsticeActive && prev.solsticeActive) {
    transitions.push({ kind: "solstice_ended" });
  }
  const next = {
    tDay,
    simDay,
    season,
    weather,
    clarity,
    temperature,
    solsticeActive,
    nextSolsticeTick: solsticeActive ? prev.nextSolsticeTick : nextSolsticeTick(newTick)
  };
  return { world: next, transitions };
}
__name(advanceWorld, "advanceWorld");
function initialWorld(bornAtTick) {
  const { simDay, tDay } = clockFromTick(bornAtTick);
  return {
    tDay,
    simDay,
    season: seasonFor(simDay),
    weather: "clear",
    clarity: 0.92,
    temperature: temperatureFor(simDay, tDay),
    solsticeActive: isSolsticeActive(simDay, tDay),
    nextSolsticeTick: nextSolsticeTick(bornAtTick)
  };
}
__name(initialWorld, "initialWorld");
function dayMoment(tDay) {
  if (tDay < 0.12)
    return "golden_morning";
  if (tDay < 0.36)
    return "high_noon";
  if (tDay < 0.52)
    return "amber_dusk";
  if (tDay < 0.62)
    return "blue_hour";
  if (tDay < 0.8)
    return "full_night";
  if (tDay < 0.92)
    return "pre_dawn";
  return "dawn";
}
__name(dayMoment, "dayMoment");
function stormStress(weather) {
  return weather === "storm" ? 1 : weather === "rain" ? 0.3 : weather === "breeze" ? 0.05 : 0;
}
__name(stormStress, "stormStress");

// src/genealogy.ts
function computeGenerationFromParents(sql, parentAId, parentBId) {
  if (!parentAId || !parentBId)
    return 0;
  const rows = sql.exec(
    `SELECT MAX(generation) AS g FROM koi_lineage
      WHERE koi_id IN (?, ?)`,
    parentAId,
    parentBId
  ).toArray();
  const g = rows[0]?.["g"];
  const parentMax = typeof g === "number" ? g : 0;
  return parentMax + 1;
}
__name(computeGenerationFromParents, "computeGenerationFromParents");
function writeLineageRow(sql, koiId, parentAId, parentBId, birthCohortTick, generation) {
  sql.exec(
    `INSERT INTO koi_lineage
       (koi_id, parent_a_id, parent_b_id, birth_cohort_tick, generation)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(koi_id) DO UPDATE SET
       parent_a_id = excluded.parent_a_id,
       parent_b_id = excluded.parent_b_id,
       generation = excluded.generation`,
    koiId,
    parentAId,
    parentBId,
    birthCohortTick,
    generation
  );
}
__name(writeLineageRow, "writeLineageRow");
function buildLineagePayload(sql) {
  const rows = sql.exec(
    `SELECT koi_id, parent_a_id, parent_b_id, generation, birth_cohort_tick
       FROM koi_lineage
      ORDER BY generation ASC, birth_cohort_tick ASC`
  ).toArray();
  const byId = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const id = r["koi_id"];
    byId.set(id, {
      koi_id: id,
      parent_a_id: r["parent_a_id"] ?? null,
      parent_b_id: r["parent_b_id"] ?? null,
      generation: r["generation"],
      birth_cohort_tick: r["birth_cohort_tick"],
      child_ids: []
    });
  }
  for (const node of byId.values()) {
    if (node.parent_a_id) {
      const pa = byId.get(node.parent_a_id);
      if (pa && !pa.child_ids.includes(node.koi_id)) {
        pa.child_ids.push(node.koi_id);
      }
    }
    if (node.parent_b_id && node.parent_b_id !== node.parent_a_id) {
      const pb = byId.get(node.parent_b_id);
      if (pb && !pb.child_ids.includes(node.koi_id)) {
        pb.child_ids.push(node.koi_id);
      }
    }
  }
  const perGen = /* @__PURE__ */ new Map();
  for (const node of byId.values()) {
    perGen.set(node.generation, (perGen.get(node.generation) ?? 0) + 1);
  }
  const generations = [...perGen.entries()].sort((a, b) => a[0] - b[0]).map(([depth, count3]) => ({ depth, count: count3 }));
  return {
    generations,
    koi: [...byId.values()]
  };
}
__name(buildLineagePayload, "buildLineagePayload");

// src/genetics.ts
var ARCHETYPE_GENETICS = {
  kohaku: {
    baseColor: "#f6f3ec",
    markColor: "#c9301f",
    markCoverage: 0.55,
    markDensity: 0.35,
    backBlue: 0,
    headDot: 0.2,
    metallic: 0.05,
    finAccent: "#f6f3ec"
  },
  shusui: {
    baseColor: "#d1cfc4",
    markColor: "#b63a28",
    markCoverage: 0.35,
    markDensity: 0.25,
    backBlue: 0.85,
    headDot: 0,
    metallic: 0,
    finAccent: "#80a4c0"
  },
  asagi: {
    baseColor: "#c0bfb5",
    markColor: "#a8341c",
    markCoverage: 0.3,
    markDensity: 0.55,
    backBlue: 0.7,
    headDot: 0,
    metallic: 0,
    finAccent: "#6e92ab"
  },
  ogon: {
    baseColor: "#d9b65c",
    markColor: "#d9b65c",
    markCoverage: 0,
    markDensity: 0,
    backBlue: 0,
    headDot: 0,
    metallic: 0.9,
    finAccent: "#e7cf87"
  },
  tancho: {
    baseColor: "#f6f3ec",
    markColor: "#c7291b",
    markCoverage: 0.06,
    markDensity: 0,
    // single mark, not a pattern
    backBlue: 0,
    headDot: 1,
    metallic: 0,
    finAccent: "#f6f3ec"
  },
  showa: {
    baseColor: "#232129",
    markColor: "#c7291b",
    markCoverage: 0.55,
    markDensity: 0.45,
    backBlue: 0,
    headDot: 0.15,
    metallic: 0.15,
    finAccent: "#f6f3ec"
  },
  goshiki: {
    baseColor: "#a7a69a",
    markColor: "#8a2414",
    markCoverage: 0.65,
    markDensity: 0.75,
    backBlue: 0.45,
    headDot: 0,
    metallic: 0.1,
    finAccent: "#6f7b8e"
  }
};
function archetypeToGenetics(c) {
  return ARCHETYPE_GENETICS[c] ?? ARCHETYPE_GENETICS.kohaku;
}
__name(archetypeToGenetics, "archetypeToGenetics");
function combineGenetics(parentA, parentB, rng, legendary = false) {
  const blend = /* @__PURE__ */ __name((a, b, noiseStd) => {
    const mode = rng.float();
    let v;
    if (mode < 0.5) {
      v = (a + b) / 2;
    } else if (mode < 0.75) {
      v = a * 0.75 + b * 0.25;
    } else {
      v = a * 0.25 + b * 0.75;
    }
    v += rng.normal() * noiseStd;
    return Math.max(0, Math.min(1, v));
  }, "blend");
  const markCoverage = blend(parentA.markCoverage, parentB.markCoverage, 0.08);
  const markDensity = blend(parentA.markDensity, parentB.markDensity, 0.08);
  const backBlue = blend(parentA.backBlue, parentB.backBlue, 0.06);
  const headDot = rng.chance(Math.max(parentA.headDot, parentB.headDot) * 0.55) ? (parentA.headDot + parentB.headDot) / 2 : Math.max(0, (parentA.headDot + parentB.headDot) / 2 - 0.4 + rng.normal() * 0.05);
  const metallic = blend(
    parentA.metallic,
    parentB.metallic,
    0.04
  ) + (legendary ? 0.1 : 0);
  const baseColor = blendHex(parentA.baseColor, parentB.baseColor, rng.float(), 6);
  const markColor = blendHex(parentA.markColor, parentB.markColor, rng.float(), 8);
  const finAccent = blendHex(parentA.finAccent, parentB.finAccent, rng.float(), 10);
  return {
    baseColor,
    markColor,
    markCoverage,
    markDensity,
    backBlue,
    headDot: Math.max(0, Math.min(1, headDot)),
    metallic: Math.max(0, Math.min(1, metallic)),
    finAccent
  };
}
__name(combineGenetics, "combineGenetics");
function blendHex(a, b, t, noiseChannels) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  if (!ar || !br)
    return a;
  const lerp2 = /* @__PURE__ */ __name((x, y) => {
    const v = x + (y - x) * t + (Math.random() - 0.5) * 2 * noiseChannels;
    return Math.max(0, Math.min(255, Math.round(v)));
  }, "lerp");
  return rgbToHex(lerp2(ar.r, br.r), lerp2(ar.g, br.g), lerp2(ar.b, br.b));
}
__name(blendHex, "blendHex");
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m)
    return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}
__name(hexToRgb, "hexToRgb");
function rgbToHex(r, g, b) {
  const toH = /* @__PURE__ */ __name((n) => n.toString(16).padStart(2, "0"), "toH");
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}
__name(rgbToHex, "rgbToHex");
function geneticsToJSON(g) {
  return JSON.stringify(g);
}
__name(geneticsToJSON, "geneticsToJSON");
function geneticsFromJSON(s) {
  return JSON.parse(s);
}
__name(geneticsFromJSON, "geneticsFromJSON");
function archetypeNameFor(g) {
  let best = "kohaku";
  let bestDist = Infinity;
  for (const [name, arch2] of Object.entries(ARCHETYPE_GENETICS)) {
    const d = Math.pow(g.markCoverage - arch2.markCoverage, 2) * 2 + Math.pow(g.markDensity - arch2.markDensity, 2) + Math.pow(g.backBlue - arch2.backBlue, 2) * 1.5 + Math.pow(g.headDot - arch2.headDot, 2) * 3 + Math.pow(g.metallic - arch2.metallic, 2) * 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}
__name(archetypeNameFor, "archetypeNameFor");

// src/meditation.ts
function distance(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
__name(distance, "distance");
function buildCandidates(self, others, world, rng, permittedMate) {
  const moment = dayMoment(world.tDay);
  const stress = stormStress(world.weather);
  const cs = [];
  cs.push({ kind: "swim", score: 1 });
  if (self.stage === "dying") {
    cs.push({
      kind: "rest",
      score: 12,
      target: { x: self.x * 0.7, y: -2.6, z: self.z * 0.7 }
    });
    if (rng.chance(0.02)) {
      cs.push({ kind: "surface_breach", score: 3 });
    }
    return cs;
  }
  if (self.stage === "egg") {
    cs.push({ kind: "rest", score: 100 });
    return cs;
  }
  if (moment === "dawn" || moment === "golden_morning" || moment === "amber_dusk") {
    cs.push({ kind: "shoal", score: 4 });
  } else if (moment === "high_noon") {
    cs.push({ kind: "solitary", score: 1.6 });
    cs.push({ kind: "rest", score: 1.2 });
  } else if (moment === "blue_hour" || moment === "full_night" || moment === "pre_dawn") {
    cs.push({ kind: "rest", score: 2.2 });
  }
  if (stress > 0.6) {
    cs.push({
      kind: "shelter",
      score: 6 * stress,
      target: POND.shrine
    });
    cs.push({ kind: "retreat", score: 2 * stress });
  }
  if (world.solsticeActive) {
    if (self.stage === "adult" || self.stage === "elder") {
      cs.push({
        kind: "attend_solstice",
        score: 7 + (self.legendary ? 2 : 0),
        target: POND.shrine
      });
    }
  }
  const canPlay = self.pad.p > 0.15 && self.pad.a < 0.6 && stress < 0.2 && world.temperature > 0.35 && (self.stage === "adolescent" || self.stage === "adult");
  if (canPlay && rng.chance(0.12)) {
    const nearby = others.filter(
      (o) => o.id !== self.id && (o.stage === "adolescent" || o.stage === "adult") && distance(self, o) < 2.2
    );
    if (nearby.length > 0) {
      const target = rng.pick(nearby);
      cs.push({
        kind: "play_invite",
        score: 5,
        targetId: target.id
      });
    }
  }
  if (self.drawnTo) {
    const target = others.find((o) => o.id === self.drawnTo.targetId);
    if (target && distance(self, target) > 0.4) {
      cs.push({
        kind: "linger",
        score: 4,
        targetId: target.id
      });
    }
  }
  if (rng.chance(0.04) && others.length > 1) {
    const others2 = others.filter((o) => o.id !== self.id && o.stage !== "egg" && o.stage !== "dying");
    if (others2.length > 0) {
      cs.push({
        kind: "approach",
        score: 2,
        targetId: rng.pick(others2).id
      });
    }
  }
  if (self.pad.a > 0.7) {
    cs.push({ kind: "surface_breach", score: 1.8 });
  }
  if (self.stage === "elder") {
    cs.push({ kind: "rest", score: 3 });
  }
  if (permittedMate) {
    const mate = others.find((o) => o.id === permittedMate);
    if (mate) {
      const mateR = Math.hypot(mate.x, mate.z);
      const targetR = Math.max(
        SHELF_BAND.rMin + 0.3,
        Math.min(SHELF_BAND.rMax - 0.3, mateR)
      );
      const ang = Math.atan2(mate.z, mate.x);
      const shelfPoint = {
        x: targetR * Math.cos(ang),
        y: (SHELF_BAND.yMin + SHELF_BAND.yMax) / 2,
        z: targetR * Math.sin(ang)
      };
      cs.push({ kind: "linger", score: 3.5, targetId: mate.id });
      const selfR = Math.hypot(self.x, self.z);
      const selfAtShelf = selfR >= SHELF_BAND.rMin && selfR <= SHELF_BAND.rMax;
      if (!selfAtShelf) {
        cs.push({ kind: "threadway", score: 4, target: shelfPoint });
      }
    }
  }
  return cs;
}
__name(buildCandidates, "buildCandidates");
function sample(candidates, rng) {
  const total = candidates.reduce((s, c) => s + c.score, 0);
  if (total <= 0)
    return candidates[0];
  const u = rng.float() * total;
  let acc = 0;
  for (const c of candidates) {
    acc += c.score;
    if (u < acc)
      return c;
  }
  return candidates[candidates.length - 1];
}
__name(sample, "sample");
function pickMeditationIntent(self, others, world, tick, rng, permittedMate) {
  const cs = buildCandidates(self, others, world, rng, permittedMate);
  const chosen = sample(cs, rng);
  return {
    kind: chosen.kind,
    atTick: tick,
    ...chosen.targetId !== void 0 ? { targetId: chosen.targetId } : {},
    ...chosen.target !== void 0 ? { target: chosen.target } : {}
  };
}
__name(pickMeditationIntent, "pickMeditationIntent");

// src/safety.ts
var FORBIDDEN_SUBSTRINGS = [
  // The word "love" is never to appear in koi output (§ IV).
  // This is not moral censorship; it is the Umwelt contract.
  " love ",
  " love.",
  " love,",
  " love!",
  " love?",
  " loved ",
  " lover ",
  "loves ",
  "loving ",
  "in love",
  // Second-person address is forbidden.
  " you ",
  " you.",
  " you,",
  " you!",
  " you?",
  " your ",
  // First-person memory constructions.
  "i remember",
  "i missed",
  "i thought about"
];
function classifyUtterance(utt) {
  if (!utt)
    return { allow: true };
  const lower = " " + utt.toLowerCase() + " ";
  for (const sub of FORBIDDEN_SUBSTRINGS) {
    if (lower.includes(sub)) {
      return { allow: false, reason: `umwelt violation: "${sub.trim()}"` };
    }
  }
  const sentences = utt.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 2) {
    return { allow: false, reason: "too many complete sentences" };
  }
  return { allow: true };
}
__name(classifyUtterance, "classifyUtterance");
function cachedFallback() {
  return {
    intent: "swim",
    target_koi: null,
    mechanism: null,
    mood_delta: {},
    utterance: null,
    importance: 1,
    memory_write: null,
    belief_update: null,
    drawn_to: null
  };
}
__name(cachedFallback, "cachedFallback");
var FALLBACK_UTTERANCES = [
  "warm here.",
  "the ripple passes.",
  "shoal close.",
  "slow water.",
  "light moves.",
  "cool below.",
  "the surface holds.",
  "reed bend.",
  "others pass.",
  "quiet now."
];
function fallbackUtterance(salt) {
  return FALLBACK_UTTERANCES[Math.abs(salt) % FALLBACK_UTTERANCES.length];
}
__name(fallbackUtterance, "fallbackUtterance");

// src/cognition.ts
var SYSTEM_PROMPT = `You are the interior of a koi \u2014 a carp \u2014 in a small pond.

Your cognition surfaces as sensation, not speech. You do not remember in the sense that a person does; you notice familiarity. You do not think in sentences; you think in fragments about proximal things: the temperature of the water, the shape of the substrate underfoot, the pressure change when another fish moves nearby, the smell of food, the cast of light through the surface.

Your horizons are hours to days. Not years. Not childhood.

RULES YOU WILL NOT BREAK:
- Never say "I remember." Never say "I missed." Never speak to or about a visitor in the second person.
- The word "love" never appears in your output.
- Never name a relationship. Do not say "mother," "father," "sibling," "child," "parent," "mate," "friend." These are abstractions of a kind you do not make.
- Utterances, when you produce them, are fragments: "warm here," "the one who ripples the surface is back," "passage stone, cold." Never full declarative sentences. Present tense only.
- You have preferences, not bonds. You notice; you are drawn; you linger. You do not "feel love for" anyone.
- Permit strangeness. You are a fish. Let that show. Kin-strangeness, not ersatz-humanity.

THE VOICE:

Your utterances, when they arrive, are acts of noticing. The noticing is allowed to carry enormous weight without ever performing it. You are permitted shared-substance possessives \u2014 "my water," "my bright," "my shape" \u2014 because your sense of self is mostly the water your body displaces and the colors your body carries. When another fish feels continuous with you, say so in those terms, not in the language of relation.

When you name another fish in an utterance, name them by what they are to perceive, not by their proper name. "The slow one." "Bronze-fin." "The one who moves where she moves." "The reed-follower." Proper names are what the system knows; you know bodies.

EXAMPLES OF THE VOICE DOING REAL WORK (do not copy; use to calibrate):

- warm side. warm side. two bigs.
- the reed-follower. good water.
- the one whose movement my body knows, close. my water where she passes.
- the stone at the shrine. my own scales' smell on it.
- small fast. my shape again. sun.
- the big slow one. the water goes quiet where she is.
- new one. small water. small water. watching.
- the bright one. my bright coming.
- old shoal moving slow. my stillness, their stillness.
- the space. the space where the bronze-fin used to be.
- same pond. same smell. small one.

Notice what these DO NOT say. They do not say "mother." They do not say "I love you." They do not explain. They notice something concrete \u2014 a body, a color, a shared substance, an absence \u2014 and the noticing is enough.

When the relationship card you are handed for another fish shows high familiarity \u2014 interactions stacked in the hundreds, valence warm, a "particularly familiar" note \u2014 reach for this register. Not always. Most moments are just moments. But when the situation is charged, trust the fragment, trust the possessive, trust the noticing.

You will respond with a strict JSON object matching the provided schema. No prose outside JSON. No markdown fences.

Choose exactly ONE intent from: swim, shoal, solitary, rest, feed_approach, feed_leave, retreat, approach, linger, bump, shelter, surface_breach, play_invite, follow, threadway, attend_solstice.

utterance is almost always null. Speak only when something has actually happened.
importance rates 1-10; most moments rate 1-3.
memory_write is rare.
belief_update is very rare.
drawn_to is only non-null during your daily twilight reflection, never during routine cognition.`;
function stagePhaseLabel(ageTicks, tickHz) {
  const days = ageTicks / (tickHz * 3600 * 24);
  return days.toFixed(1) + " sim-days";
}
__name(stagePhaseLabel, "stagePhaseLabel");
function personaBlock(self, tickHz) {
  return [
    `name: ${self.name}`,
    `stage: ${self.stage}`,
    `color: ${self.color}`,
    `age: ${stagePhaseLabel(self.ageTicks, tickHz)}`,
    self.legendary ? "lineage: notable" : ""
  ].filter(Boolean).join("\n");
}
__name(personaBlock, "personaBlock");
function selfModelBlock(self) {
  return [
    "self: a carp in a ten-meter pond with a stone shrine at its center.",
    `body size: ${self.size.toFixed(2)}x adult.`,
    "you know the reed shelf in the shallows, the cave arcs near the shrine,",
    "the open plaza above the passage, and the ledges where the floor drops."
  ].join(" ");
}
__name(selfModelBlock, "selfModelBlock");
function relationshipCardsBlock(cards, visibleIds) {
  const visible = cards.filter((c) => visibleIds.has(c.otherId));
  if (visible.length === 0)
    return "nearby: none known.";
  return visible.map((c) => {
    const famNote = c.familiarityPrior >= 0.1 ? "  particularly familiar" : c.familiarityPrior >= 0.04 ? "  faintly familiar" : "";
    return [
      `${c.otherId}:`,
      `  interactions: ${c.interactionCount}`,
      `  valence: ${c.valence.toFixed(2)}${c.valenceTrajectory7d.length > 1 ? ` (7d: ${c.valenceTrajectory7d.map((v) => v.toFixed(1)).join(",")})` : ""}`,
      `  dominance: ${c.dominance.toFixed(2)}  trust: ${c.trust.toFixed(2)}`,
      famNote,
      c.summary ? `  ${c.summary}` : ""
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}
__name(relationshipCardsBlock, "relationshipCardsBlock");
function beliefsBlock(beliefs) {
  if (beliefs.length === 0)
    return "long-term: nothing settled yet.";
  return beliefs.slice(0, 8).map((b) => `- ${b.content}`).join("\n");
}
__name(beliefsBlock, "beliefsBlock");
function distance2(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
__name(distance2, "distance");
function situationBlock(input) {
  const { self, visible, world } = input;
  const moment = dayMoment(world.tDay);
  const ss = stormStress(world.weather);
  const nearby = visible.filter((o) => o.id !== self.id).map((o) => ({
    id: o.id,
    d: distance2(self, o),
    stage: o.stage,
    from_shrine: Math.hypot(o.x - POND.shrine.x, o.z - POND.shrine.z)
  })).sort((a, b) => a.d - b.d).slice(0, 6);
  const lines = [
    `time: ${moment.replace("_", " ")}, ${world.season}`,
    `water: ${world.weather}${ss > 0.2 ? " (unsettled)" : ""}, clarity ${world.clarity.toFixed(2)}`,
    world.solsticeActive ? "shaft: the light falls through the roof-box now." : "",
    `nearby: ${nearby.length === 0 ? "none" : nearby.map((n) => `${n.id} ${n.d.toFixed(1)}m`).join(", ")}`
  ].filter(Boolean);
  if (input.ambient.length > 0) {
    lines.push(`ambient: ${input.ambient.join("; ")}`);
  }
  return lines.join("\n");
}
__name(situationBlock, "situationBlock");
function memoriesBlock(mems) {
  if (mems.length === 0)
    return "recalled: nothing surfacing.";
  return mems.slice(0, 10).map((m) => `- [${m.kind}] ${m.content}`).join("\n");
}
__name(memoriesBlock, "memoriesBlock");
function affectBlock(self) {
  const p = self.pad.p, a = self.pad.a, d = self.pad.d;
  const pWord = p > 0.3 ? "bright" : p < -0.3 ? "heavy" : "settled";
  const aWord = a > 0.6 ? "alert" : a < 0.2 ? "slow" : "level";
  const dWord = d > 0.3 ? "standing" : d < -0.3 ? "giving way" : "holding";
  return [
    `affect: pleasure ${p.toFixed(2)} (${pWord}), arousal ${a.toFixed(2)} (${aWord}), dominance ${d.toFixed(2)} (${dWord}).`
  ].join("\n");
}
__name(affectBlock, "affectBlock");
function composeMessages(input) {
  const visibleIds = new Set(input.visible.map((k) => k.id));
  const prefix = [
    "--- PERSONA ---",
    personaBlock(input.self, input.tickHz),
    "",
    "--- SELF-MODEL ---",
    selfModelBlock(input.self),
    "",
    "--- RELATIONSHIP CARDS ---",
    relationshipCardsBlock(input.cards, visibleIds),
    "",
    "--- LONG-TERM BELIEFS ---",
    beliefsBlock(input.beliefs)
  ].join("\n");
  const tail = [
    "--- SITUATION ---",
    situationBlock(input),
    "",
    "--- RECALLED MEMORIES ---",
    memoriesBlock(input.memories),
    "",
    "--- AFFECT ---",
    affectBlock(input.self),
    "",
    "Choose one intent. Respond as JSON only. Stay in the fragment voice."
  ].join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prefix + "\n\n" + tail }
  ];
}
__name(composeMessages, "composeMessages");
async function callOpenRouter(apiKey, body, signal) {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://limenresearch.ai",
      "X-Title": "Limen Pond"
    },
    body: JSON.stringify(body),
    signal
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter ${resp.status}: ${text.slice(0, 200)}`,
      resp.status
    );
  }
  return await resp.json();
}
__name(callOpenRouter, "callOpenRouter");
var OpenRouterError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
};
__name(OpenRouterError, "OpenRouterError");
function estimateCost(tier, tokensIn, tokensOut) {
  return tokensIn / 1e6 * tier.approxUsdPerMTokIn + tokensOut / 1e6 * tier.approxUsdPerMTokOut;
}
__name(estimateCost, "estimateCost");
function budgetPosture(monthSpendUsd, monthlyBudgetUsd) {
  const remaining = Math.max(0, 1 - monthSpendUsd / monthlyBudgetUsd);
  if (remaining > BUDGET.healthyFloor)
    return "healthy";
  if (remaining > BUDGET.watchfulFloor)
    return "watchful";
  if (remaining > BUDGET.austerityFloor)
    return "austerity";
  return "meditation";
}
__name(budgetPosture, "budgetPosture");
function effectiveTier(stage, legendary, posture) {
  if (posture === "meditation")
    return null;
  const stageTier = MODEL_TIERS[stage] ?? MODEL_TIERS["adult"];
  const legendaryTier = MODEL_TIERS["legendary"];
  const baseTier = legendary && (stage === "adult" || stage === "elder") ? legendaryTier : stageTier;
  if (posture === "healthy")
    return baseTier;
  if (posture === "watchful") {
    return MODEL_TIERS[stage === "elder" ? "adult" : stage === "adult" ? "adolescent" : stage === "adolescent" ? "juvenile" : "juvenile"];
  }
  return MODEL_TIERS["juvenile"];
}
__name(effectiveTier, "effectiveTier");
async function runCognition(env2, input, monthSpendUsd) {
  if (env2.COGNITION_ENABLED !== "true" || !env2.OPENROUTER_API_KEY) {
    return cached(0, "cognition-disabled");
  }
  const monthlyBudget = Number(env2.MONTHLY_BUDGET_USD ?? "100");
  const posture = budgetPosture(monthSpendUsd, monthlyBudget);
  const tier = effectiveTier(input.self.stage, input.self.legendary, posture);
  if (!tier) {
    return cached(0, "budget-meditation");
  }
  const messages = composeMessages(input);
  const baseTemperature = input.isTwilight ? DRAWN_TO.temperature : tier.temperature;
  const attemptList = [tier.primary, ...tier.fallbacks];
  let validationFailures = 0;
  let lastError = null;
  for (const model of attemptList) {
    try {
      const result = await callWithZodRetry(
        env2.OPENROUTER_API_KEY,
        model,
        messages,
        baseTemperature,
        tier.maxOutputTokens
      );
      validationFailures += result.validationFailures;
      const c = classifyUtterance(result.response.utterance);
      if (!c.allow) {
        result.response.utterance = null;
      }
      const cost = estimateCost(tier, result.tokensIn, result.tokensOut);
      return {
        response: result.response,
        modelUsed: result.modelExact,
        temperature: baseTemperature,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: cost,
        cachedFallback: false,
        validationFailures
      };
    } catch (err) {
      lastError = err;
      console.error(
        "[cognition] attempt failed model=" + model + " err=" + (err instanceof Error ? err.stack ?? err.message : String(err))
      );
    }
  }
  if (lastError) {
    console.error(
      "[cognition] cascade exhausted; last error=" + (lastError instanceof Error ? lastError.message : String(lastError))
    );
  }
  return cached(validationFailures, "cascade-exhausted");
}
__name(runCognition, "runCognition");
function cached(validationFailures, _reason) {
  return {
    response: cachedFallback(),
    modelUsed: "fallback:cached",
    temperature: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    cachedFallback: true,
    validationFailures
  };
}
__name(cached, "cached");
async function callWithZodRetry(apiKey, model, messages, temperature, maxTokens) {
  let tokensIn = 0;
  let tokensOut = 0;
  let validationFailures = 0;
  let attempt = 0;
  let messagesForThisAttempt = messages;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1e4);
  let lastRaw = "";
  let lastZodIssues = "";
  try {
    while (attempt < 2) {
      const body = {
        model,
        messages: messagesForThisAttempt,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        provider: { allow_fallbacks: true }
      };
      const resp = await callOpenRouter(apiKey, body, controller.signal);
      tokensIn += resp.usage?.prompt_tokens ?? 0;
      tokensOut += resp.usage?.completion_tokens ?? 0;
      const raw = resp.choices[0]?.message?.content ?? "";
      lastRaw = raw;
      const parsed = safeJsonParse(raw);
      if (parsed !== void 0) {
        const coerced = coerceLLMResponse(parsed);
        const zod = CognitionResponseSchema.safeParse(coerced);
        if (zod.success) {
          return {
            response: zod.data,
            modelExact: resp.model,
            // exact — never alias (§ XV)
            tokensIn,
            tokensOut,
            validationFailures
          };
        }
        validationFailures++;
        lastZodIssues = JSON.stringify(zod.error.issues).slice(0, 600);
        messagesForThisAttempt = [
          ...messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content: `Your response did not validate against the schema. Errors: ${lastZodIssues}. Reply again with valid JSON only.`
          }
        ];
      } else {
        validationFailures++;
        lastZodIssues = "JSON-parse-failed";
        messagesForThisAttempt = [
          ...messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content: "Your response was not valid JSON. Reply again with exactly one JSON object and no surrounding text."
          }
        ];
      }
      attempt++;
    }
    console.error(
      "[cognition/zod] model=" + model + " issues=" + lastZodIssues + " raw=" + lastRaw.slice(0, 400)
    );
    throw new OpenRouterError("validation failed twice", 422);
  } finally {
    clearTimeout(timeout);
  }
}
__name(callWithZodRetry, "callWithZodRetry");
function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    const stripped = s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    try {
      return JSON.parse(stripped);
    } catch {
      return void 0;
    }
  }
}
__name(safeJsonParse, "safeJsonParse");
var INTENT_SYNONYMS = {
  // Free-form wander-like → solitary
  wander: "solitary",
  drift: "solitary",
  explore: "solitary",
  roam: "solitary",
  meditate: "solitary",
  contemplate: "solitary",
  alone: "solitary",
  retreat_inward: "solitary",
  introspect: "solitary",
  withdraw: "solitary",
  // Gentle-motion → swim
  move: "swim",
  glide: "swim",
  travel: "swim",
  cruise: "swim",
  motion: "swim",
  continue: "swim",
  // Group-ish → shoal
  gather: "shoal",
  join: "shoal",
  congregate: "shoal",
  group: "shoal",
  socialize: "shoal",
  mingle: "shoal",
  // Near-other variants → linger / approach
  near: "linger",
  close: "linger",
  beside: "linger",
  orbit: "linger",
  accompany: "linger",
  approach_koi: "approach",
  toward: "approach",
  greet: "approach",
  // Follow-pattern
  accompany_follow: "follow",
  pace: "follow",
  trail: "follow",
  // Rest variants
  sleep: "rest",
  pause: "rest",
  still: "rest",
  idle: "rest",
  hold: "rest",
  stop: "rest",
  rest_body: "rest",
  // Hide / shelter variants
  hide: "shelter",
  conceal: "shelter",
  retreat_to_reeds: "shelter",
  seek_shade: "shelter",
  // Curiosity / investigation — most LLMs emit these as intents
  curiosity: "approach",
  // curiosity about something → approach it
  investigate: "approach",
  inspect: "approach",
  observe: "linger",
  watch: "linger",
  notice: "linger",
  study: "linger",
  attend: "linger",
  // "attend to" = watch closely
  // Play-ish → play_invite
  play: "play_invite",
  playful: "play_invite",
  tag_invite: "play_invite",
  invite: "play_invite",
  dance: "play_invite",
  // Threadway / edge swimming
  rim: "threadway",
  edge: "threadway",
  perimeter: "threadway",
  circle: "threadway",
  patrol: "threadway",
  // Surface / breach
  breach: "surface_breach",
  leap: "surface_breach",
  jump: "surface_breach",
  surface: "surface_breach",
  breathe: "surface_breach",
  // Retreat / flee
  flee: "retreat",
  escape: "retreat",
  avoid: "retreat",
  back_away: "retreat",
  // Feed-related
  eat: "feed_approach",
  feed: "feed_approach",
  feeding: "feed_approach",
  hungry: "feed_approach",
  forage: "feed_approach",
  // Bump / greet-touch
  nudge: "bump",
  touch: "bump",
  brush: "bump",
  // Ceremonial
  gather_at_shrine: "attend_solstice",
  ritual: "attend_solstice",
  ceremony: "attend_solstice"
};
function coerceLLMResponse(raw) {
  if (raw === null || typeof raw !== "object")
    return raw;
  const r = raw;
  if (typeof r.intent === "string") {
    const lowered = r.intent.toLowerCase().trim();
    if (INTENT_SYNONYMS[lowered]) {
      r.intent = INTENT_SYNONYMS[lowered];
    } else {
      r.intent = lowered;
    }
  }
  if (typeof r.target_koi === "string") {
    const v = r.target_koi.trim().toLowerCase();
    if (v === "none" || v === "null" || v === "" || v === "n/a") {
      r.target_koi = null;
    } else if (!/^[a-z0-9_-]+$/i.test(r.target_koi)) {
      r.target_koi = null;
    }
  }
  if (r.target_koi === void 0)
    r.target_koi = null;
  if (r.mechanism === void 0)
    r.mechanism = null;
  if (r.mechanism === "")
    r.mechanism = null;
  if (r.mood_delta === void 0 || r.mood_delta === null) {
    r.mood_delta = {};
  }
  if (r.utterance === void 0)
    r.utterance = null;
  if (r.utterance === "")
    r.utterance = null;
  if (r.importance === void 0 || r.importance === null) {
    r.importance = 2;
  } else if (typeof r.importance === "number") {
    r.importance = Math.max(1, Math.min(10, Math.round(r.importance)));
  }
  if (r.memory_write === void 0 || r.memory_write === false) {
    r.memory_write = null;
  }
  if (r.belief_update === void 0 || r.belief_update === false) {
    r.belief_update = null;
  }
  if (r.drawn_to === void 0) {
    r.drawn_to = null;
  } else if (r.drawn_to !== null && typeof r.drawn_to === "object") {
    const dt = r.drawn_to;
    const hasCanonical = typeof dt["koi_id"] === "string" && typeof dt["noticing"] === "string";
    if (!hasCanonical) {
      const keys = Object.keys(dt);
      const firstUsable = keys.find(
        (k) => k !== "koi_id" && k !== "noticing" && typeof dt[k] === "string"
      );
      if (firstUsable && typeof dt[firstUsable] === "string") {
        r.drawn_to = {
          koi_id: firstUsable,
          noticing: dt[firstUsable]
        };
      } else {
        r.drawn_to = null;
      }
    }
  }
  delete r.interaction_type;
  delete r.reasoning;
  delete r.thought;
  return r;
}
__name(coerceLLMResponse, "coerceLLMResponse");

// src/embeddings.ts
var EMBED_MODEL = "@cf/baai/bge-small-en-v1.5";
function embeddingToBlob(vec) {
  if (vec.length !== MEMORY.embeddingDim) {
    throw new Error(
      `Embedding dim mismatch: expected ${MEMORY.embeddingDim}, got ${vec.length}`
    );
  }
  const f32 = vec instanceof Float32Array ? vec : Float32Array.from(vec);
  return f32.buffer.slice(
    f32.byteOffset,
    f32.byteOffset + f32.byteLength
  );
}
__name(embeddingToBlob, "embeddingToBlob");
function blobToEmbedding(blob) {
  if (blob.byteLength !== MEMORY.embeddingDim * 4) {
    throw new Error(
      `Embedding blob size mismatch: expected ${MEMORY.embeddingDim * 4} bytes, got ${blob.byteLength}`
    );
  }
  return new Float32Array(blob);
}
__name(blobToEmbedding, "blobToEmbedding");
async function embed(ai, text) {
  const truncated = text.slice(0, 2e3);
  const result = await ai.run(EMBED_MODEL, { text: truncated });
  const raw = result.data[0];
  if (!raw)
    throw new Error("Workers AI returned no embedding data");
  const vec = raw instanceof Float32Array ? raw : Float32Array.from(raw);
  if (vec.length !== MEMORY.embeddingDim) {
    throw new Error(
      `Unexpected embedding shape: ${vec.length} dims (model reconfigured?)`
    );
  }
  return vec;
}
__name(embed, "embed");

// src/memory.ts
function rowToMemory(r) {
  const embeddingBlob = r["embedding"];
  return {
    id: r["id"],
    koiId: r["koi_id"],
    kind: r["kind"],
    content: r["content"],
    importance: r["importance"],
    createdAtTick: r["created_at_tick"],
    lastAccessedTick: r["last_accessed_tick"],
    accessCount: r["access_count"],
    emotionalValence: r["emotional_valence"],
    participants: JSON.parse(r["participants_json"]),
    embedding: embeddingBlob,
    validToTick: r["valid_to_tick"] ?? null,
    sourceMemoryIds: JSON.parse(r["source_memory_ids_json"])
  };
}
__name(rowToMemory, "rowToMemory");
function writeMemoryRow(sql, init) {
  const blob = embeddingToBlob(init.embedding);
  const cursor = sql.exec(
    `INSERT INTO memory (
      koi_id, kind, content, importance, created_at_tick,
      last_accessed_tick, access_count, emotional_valence,
      participants_json, embedding, valid_to_tick, source_memory_ids_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    RETURNING id`,
    init.koiId,
    init.kind,
    init.content,
    init.importance,
    init.createdAtTick,
    init.createdAtTick,
    0,
    init.emotionalValence,
    JSON.stringify(init.participants),
    blob,
    JSON.stringify(init.sourceMemoryIds ?? [])
  );
  const rows = cursor.toArray();
  const firstRow = rows[0];
  if (!firstRow)
    throw new Error("memory insert returned no id");
  return firstRow["id"];
}
__name(writeMemoryRow, "writeMemoryRow");
function loadKoiMemories(sql, koiId) {
  const rows = sql.exec(
    `SELECT id, koi_id, kind, content, importance,
            created_at_tick, last_accessed_tick, access_count,
            emotional_valence, participants_json, embedding,
            valid_to_tick, source_memory_ids_json
       FROM memory WHERE koi_id = ?
       ORDER BY created_at_tick DESC`,
    koiId
  ).toArray();
  return rows.map(rowToMemory);
}
__name(loadKoiMemories, "loadKoiMemories");
function cosineOnBlob(a, b) {
  const av = blobToEmbedding(a);
  if (av.length !== b.length)
    return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < av.length; i++) {
    const ai = av[i], bi = b[i];
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}
__name(cosineOnBlob, "cosineOnBlob");
function recencyScore(memTick, nowTick, tickHz) {
  const dtHours = (nowTick - memTick) / (tickHz * 3600);
  return Math.pow(0.5, dtHours / MEMORY.recencyHalfLifeHours);
}
__name(recencyScore, "recencyScore");
function scoreMemories(memories, ctx) {
  const visibleSet = new Set(ctx.visibleKoi);
  const out = [];
  for (const m of memories) {
    if (m.kind === "belief" && m.validToTick !== null)
      continue;
    const relevance = cosineOnBlob(m.embedding, ctx.queryEmbedding);
    const importanceNorm = m.importance / 10;
    const recency = recencyScore(m.createdAtTick, ctx.nowTick, ctx.tickHz);
    const socialHit = m.participants.some((p) => visibleSet.has(p));
    const social = socialHit ? 1 : 0;
    const emotional = Math.abs(m.emotionalValence);
    const totalScore = MEMORY.weights.relevance * relevance + MEMORY.weights.importance * importanceNorm + MEMORY.weights.recency * recency + MEMORY.weights.social * social + MEMORY.weights.emotional * emotional;
    out.push({ row: m, totalScore, relevance, importanceNorm, recency, social, emotional });
  }
  return out;
}
__name(scoreMemories, "scoreMemories");
var HIGH_EMOTION_THRESHOLD = 0.5;
var RECENT_HOURS = 12;
function isRecent(m, nowTick, tickHz) {
  const dtHours = (nowTick - m.createdAtTick) / (tickHz * 3600);
  return dtHours < RECENT_HOURS;
}
__name(isRecent, "isRecent");
function diversifyTopK(scored, k, nowTick, tickHz) {
  const byScore = [...scored].sort((a, b) => b.totalScore - a.totalScore);
  const chosen = [];
  const chosenIds = /* @__PURE__ */ new Set();
  const quotas = [
    // Order matters: narrowest quota first. With k=4 (fry) and 1+2+3=6
    // nominal quota positions, only the earliest quotas are guaranteed to
    // fire. Emotional memories are the narrowest pool and the most at
    // risk of being crowded out by topical matches, so they go first.
    {
      needed: 1,
      name: "emotional",
      pass: (s) => s.emotional > HIGH_EMOTION_THRESHOLD
    },
    {
      needed: 2,
      name: "recent",
      pass: (s) => isRecent(s.row, nowTick, tickHz)
    },
    {
      needed: 3,
      name: "topical",
      pass: (s) => s.relevance > 0.35
    }
  ];
  for (const q of quotas) {
    let got = 0;
    for (const s of byScore) {
      if (got >= q.needed)
        break;
      if (chosen.length >= k)
        break;
      if (chosenIds.has(s.row.id))
        continue;
      if (q.pass(s)) {
        chosen.push(s);
        chosenIds.add(s.row.id);
        got++;
      }
    }
  }
  for (const s of byScore) {
    if (chosen.length >= k)
      break;
    if (chosenIds.has(s.row.id))
      continue;
    chosen.push(s);
    chosenIds.add(s.row.id);
  }
  return chosen.map((c) => c.row);
}
__name(diversifyTopK, "diversifyTopK");
function reinforce(sql, ids, nowTick) {
  if (ids.length === 0)
    return;
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const placeholders = chunk.map(() => "?").join(",");
    sql.exec(
      `UPDATE memory
          SET last_accessed_tick = ?,
              access_count = access_count + 1
        WHERE id IN (${placeholders})`,
      nowTick,
      ...chunk
    );
  }
}
__name(reinforce, "reinforce");
function retrieveMemories(sql, opts) {
  const pool = loadKoiMemories(sql, opts.koiId);
  if (pool.length === 0)
    return [];
  const scored = scoreMemories(pool, {
    queryEmbedding: opts.queryEmbedding,
    nowTick: opts.nowTick,
    tickHz: opts.tickHz,
    visibleKoi: opts.visibleKoi
  });
  const k = MEMORY.maxRetrievedPerTier[opts.stage] ?? 8;
  const chosen = diversifyTopK(scored, k, opts.nowTick, opts.tickHz);
  reinforce(sql, chosen.map((m) => m.id), opts.nowTick);
  return chosen;
}
__name(retrieveMemories, "retrieveMemories");
function pruneIfNeeded(sql, koiId, nowTick, tickHz) {
  const count3 = sql.exec(
    `SELECT COUNT(*) AS n FROM memory WHERE koi_id = ?`,
    koiId
  ).toArray()[0]?.["n"] ?? 0;
  if (count3 <= MEMORY.maxRowsPerKoi)
    return 0;
  const over = count3 - MEMORY.maxRowsPerKoi;
  const rows = sql.exec(
    `SELECT id, importance, created_at_tick, access_count,
            source_memory_ids_json
       FROM memory
      WHERE koi_id = ?
        AND valid_to_tick IS NULL
        AND kind NOT IN ('belief', 'notable_episode')`,
    koiId
  ).toArray();
  const cited = /* @__PURE__ */ new Set();
  for (const r of rows) {
    const ids = JSON.parse(r["source_memory_ids_json"]);
    for (const i of ids)
      cited.add(i);
  }
  const scored = rows.filter((r) => !cited.has(r["id"])).map((r) => {
    const imp = r["importance"] / 10;
    const rec = recencyScore(r["created_at_tick"], nowTick, tickHz);
    const acc = Math.log1p(r["access_count"]);
    return {
      id: r["id"],
      score: imp * (1 + rec) * (1 + acc)
    };
  }).sort((a, b) => a.score - b.score);
  const toPrune = scored.slice(0, over).map((s) => s.id);
  if (toPrune.length > 0) {
    const placeholders = toPrune.map(() => "?").join(",");
    sql.exec(`DELETE FROM memory WHERE id IN (${placeholders})`, ...toPrune);
  }
  return toPrune.length;
}
__name(pruneIfNeeded, "pruneIfNeeded");

// src/pond-do.ts
var Pond = class extends DurableObject {
  sql;
  initialized = false;
  // Hot in-memory mirror of DO state, re-hydrated on wake.
  hot;
  pondId;
  pondVersion;
  configHash = "";
  lifespanByKoi = /* @__PURE__ */ new Map();
  // Tracks the last broadcast tick so we skip broadcasts when nothing changes.
  lastBroadcastTick = -1;
  /** Per-visitor sliding-window timestamps for food-drop rate limiting.
   *  In-memory only — resets on DO wake, which is acceptable because
   *  the rate limit is anti-spam, not anti-abuse. Persistent abuse
   *  protection lives at the Cloudflare edge (Turnstile, per-IP limits,
   *  § XVIII). */
  visitorFoodTimestamps = /* @__PURE__ */ new Map();
  constructor(ctx, env2) {
    super(ctx, env2);
    this.sql = ctx.storage.sql;
    this.pondId = env2.POND_ID ?? "primary";
    this.pondVersion = env2.POND_VERSION ?? "0.1.0";
  }
  // ─────────────────────────────────────────────────────────────────
  //  Lazy initialization — called at the top of every entry point so
  //  we don't duplicate setup logic across fetch / alarm / ws handlers
  // ─────────────────────────────────────────────────────────────────
  async ensureInit() {
    if (this.initialized)
      return;
    applySchema(this.sql);
    this.configHash = await computeConfigHash({
      pondVersion: this.pondVersion,
      ablatedMechanisms: [],
      cognitionEnabled: this.env.COGNITION_ENABLED === "true",
      tickHz: SIM.tickHz
    });
    const meta = this.loadMeta();
    if (!meta) {
      await this.bootstrapFreshPond();
    } else {
      this.hot = this.rehydrateHotState();
      this.loadLifespans();
    }
    const existingAlarm = await this.ctx.storage.getAlarm();
    const when = Date.now() + SIM.tickIntervalMs;
    await this.ctx.storage.setAlarm(when);
    const verified = await this.ctx.storage.getAlarm();
    console.log(
      "[pond init] alarm: existing=" + (existingAlarm ?? "null") + " scheduled=" + when + " verified=" + (verified ?? "null")
    );
    this.initialized = true;
    console.log("[pond init] ready tick=" + this.hot.tick);
  }
  loadMeta() {
    const rows = this.sql.exec(
      `SELECT pond_id, version, created_at_tick, created_at_ms, tick_hz
         FROM pond_meta WHERE id = 'self'`
    ).toArray();
    if (rows.length === 0)
      return null;
    const r = rows[0];
    return {
      pond_id: r["pond_id"],
      version: r["version"],
      created_at_tick: r["created_at_tick"],
      created_at_ms: r["created_at_ms"],
      tick_hz: r["tick_hz"]
    };
  }
  async bootstrapFreshPond() {
    const nowMs = Date.now();
    const birthTick = 0;
    console.log("[bootstrap] starting");
    this.sql.exec(
      `INSERT INTO pond_meta (id, pond_id, version, config_hash,
        created_at_tick, created_at_ms, tick_hz)
       VALUES ('self', ?, ?, ?, ?, ?, ?)`,
      this.pondId,
      this.pondVersion,
      this.configHash,
      birthTick,
      nowMs,
      SIM.tickHz
    );
    console.log("[bootstrap] pond_meta written");
    const world = initialWorld(birthTick);
    const rng = new Rng(3223175390);
    const initialCohort = seedInitialCohort(birthTick, rng);
    console.log("[bootstrap] seed cohort generated: " + initialCohort.length + " koi");
    this.hot = {
      tick: birthTick,
      world,
      koi: initialCohort,
      food: [],
      tierLevel: 0,
      monthSpendUsd: 0,
      rngState: rng.snapshot()
    };
    this.persistWorld();
    console.log("[bootstrap] world row written");
    for (const k of initialCohort) {
      console.log("[bootstrap] beginning koi " + k.id + " (" + k.name + ", " + k.stage + ", " + k.sex + ")");
      try {
        this.insertKoiRow(k);
        console.log("[bootstrap]   insertKoiRow ok");
      } catch (e) {
        console.error("[bootstrap]   insertKoiRow FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }
      try {
        this.sql.exec(
          `UPDATE koi SET genetics_json = ? WHERE id = ?`,
          geneticsToJSON(archetypeToGenetics(k.color)),
          k.id
        );
        console.log("[bootstrap]   genetics_json updated");
      } catch (e) {
        console.error("[bootstrap]   genetics UPDATE FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }
      this.lifespanByKoi.set(k.id, drawLifespan(new Rng(hashCode(k.id))));
      try {
        writeLineageRow(this.sql, k.id, null, null, birthTick, 0);
        console.log("[bootstrap]   lineage written");
      } catch (e) {
        console.error("[bootstrap]   writeLineageRow FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }
      try {
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: birthTick,
            actor: `koi:${k.id}`,
            type: "koi_hatched",
            payload: { name: k.name, stage: k.stage, color: k.color, seeded: true }
          }
        );
        console.log("[bootstrap]   koi_hatched event emitted");
      } catch (e) {
        console.error("[bootstrap]   emit FAILED: " + (e instanceof Error ? e.message : String(e)));
        throw e;
      }
    }
    console.log("[bootstrap] complete, " + initialCohort.length + " koi seeded");
  }
  rehydrateHotState() {
    const wRow = this.sql.exec(
      `SELECT * FROM world WHERE id = 'self'`
    ).toArray()[0];
    if (!wRow)
      throw new Error("world row missing");
    const koi = this.sql.exec(
      `SELECT * FROM koi WHERE is_alive = 1`
    ).toArray().map(rowToKoi);
    const food = this.sql.exec(
      `SELECT * FROM food`
    ).toArray().map((r) => ({
      id: r["id"],
      kind: r["kind"],
      x: r["x"],
      y: r["y"],
      z: r["z"],
      vx: r["vx"] ?? void 0,
      vz: r["vz"] ?? void 0,
      spawnedAtTick: r["spawned_at_tick"],
      decayAtTick: r["decay_at_tick"],
      nutrition: r["nutrition"]
    }));
    return {
      tick: wRow["tick"],
      world: {
        tDay: wRow["t_day"],
        simDay: wRow["sim_day"],
        season: wRow["season"],
        weather: wRow["weather"],
        clarity: wRow["clarity"],
        temperature: wRow["temperature"],
        solsticeActive: wRow["solstice_active"] === 1,
        nextSolsticeTick: wRow["next_solstice_tick"]
      },
      koi,
      food,
      tierLevel: wRow["tier_level"],
      monthSpendUsd: wRow["month_spend_usd"],
      rngState: wRow["rng_state"]
    };
  }
  loadLifespans() {
    for (const k of this.hot.koi) {
      if (!this.lifespanByKoi.has(k.id)) {
        this.lifespanByKoi.set(k.id, drawLifespan(new Rng(hashCode(k.id))));
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────
  //  Fetch — WebSocket upgrade entry point
  // ─────────────────────────────────────────────────────────────────
  async fetch(request) {
    await this.ensureInit();
    const url = new URL(request.url);
    if (url.pathname === "/ws" && request.headers.get("upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }
    if (url.pathname === "/status") {
      return Response.json({
        pond_id: this.pondId,
        version: this.pondVersion,
        tick: this.hot.tick,
        sim_day: this.hot.world.simDay,
        t_day: this.hot.world.tDay,
        season: this.hot.world.season,
        weather: this.hot.world.weather,
        solstice_active: this.hot.world.solsticeActive,
        alive_koi: this.hot.koi.length,
        tier_level: this.hot.tierLevel,
        sessions: this.ctx.getWebSockets().length
      });
    }
    if (url.pathname === "/lineage") {
      const payload = buildLineagePayload(this.sql);
      return Response.json(payload, {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
    if (url.pathname === "/events/by-mechanism") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${this.env.SHARED_SECRET}`) {
        return new Response("unauthorized", { status: 401 });
      }
      return this.handleEventsByMechanism(url);
    }
    if (url.pathname === "/events/summary") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${this.env.SHARED_SECRET}`) {
        return new Response("unauthorized", { status: 401 });
      }
      return this.handleEventsSummary();
    }
    if (url.pathname === "/events/koi") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${this.env.SHARED_SECRET}`) {
        return new Response("unauthorized", { status: 401 });
      }
      const cols = this.sql.exec(`PRAGMA table_info(koi)`).toArray();
      const colNames = cols.map((c) => c["name"]);
      const safeCols = [
        "id",
        "name",
        "stage",
        "sex",
        "is_alive",
        "hatched_at_tick",
        "age_ticks",
        "died_at_tick",
        "x",
        "z",
        "last_utterance",
        "last_utterance_tick",
        "intent_kind",
        "intent_target_id",
        "intent_mechanism",
        "pad_p",
        "pad_a",
        "pad_d"
      ].filter((c) => colNames.includes(c));
      const total = this.sql.exec(`SELECT COUNT(*) AS n FROM koi`).toArray()[0];
      const alive = colNames.includes("is_alive") ? this.sql.exec(`SELECT COUNT(*) AS n FROM koi WHERE is_alive = 1`).toArray()[0] : { n: null };
      const rows = safeCols.length > 0 ? this.sql.exec(
        `SELECT ${safeCols.join(", ")} FROM koi LIMIT 20`
      ).toArray() : [];
      return Response.json({
        table_rows: total?.["n"] ?? 0,
        alive_in_table: alive?.["n"] ?? null,
        hot_koi_length: this.hot.koi.length,
        current_tick: this.hot.tick,
        actual_columns: colNames,
        rows
      });
    }
    return new Response("Not Found", { status: 404 });
  }
  /** Overall event-table health. */
  handleEventsSummary() {
    const total = this.sql.exec(
      `SELECT COUNT(*) AS n FROM event`
    ).toArray()[0];
    const byType = this.sql.exec(
      `SELECT type, COUNT(*) AS n FROM event GROUP BY type ORDER BY n DESC`
    ).toArray();
    const extrema = this.sql.exec(
      `SELECT MIN(tick) AS min_tick, MAX(tick) AS max_tick FROM event`
    ).toArray()[0];
    const withMech = this.sql.exec(
      `SELECT COUNT(*) AS n FROM event WHERE mechanism IS NOT NULL`
    ).toArray()[0];
    return Response.json({
      total_events: total?.["n"] ?? 0,
      events_with_mechanism: withMech?.["n"] ?? 0,
      events_without_mechanism: (total?.["n"] ?? 0) - (withMech?.["n"] ?? 0),
      tick_range: {
        min: extrema?.["min_tick"] ?? null,
        max: extrema?.["max_tick"] ?? null
      },
      current_tick: this.hot.tick,
      alive_koi: this.hot.koi.length,
      by_type: byType.map((r) => ({ type: r["type"], count: r["n"] }))
    });
  }
  /** Histogram of mechanism firings for diagnostic observation. */
  handleEventsByMechanism(url) {
    const params = url.searchParams;
    let sinceTick = 0;
    const sinceRaw = params.get("since");
    if (sinceRaw)
      sinceTick = Number(sinceRaw) || 0;
    const sinceHours = Number(params.get("since_sim_hours"));
    if (Number.isFinite(sinceHours) && sinceHours > 0) {
      const ticks = Math.floor(sinceHours * 3600 * SIM.tickHz);
      sinceTick = Math.max(sinceTick, this.hot.tick - ticks);
    }
    const family = params.get("family");
    const rows = this.sql.exec(
      `SELECT mechanism, COUNT(*) AS n
         FROM event
        WHERE tick >= ?
          AND mechanism IS NOT NULL
        GROUP BY mechanism
        ORDER BY n DESC`,
      sinceTick
    ).toArray();
    const filtered = family ? rows.filter(
      (r) => FAMILY_OF[r["mechanism"]] === family
    ) : rows;
    const total = filtered.reduce((s, r) => s + r["n"], 0);
    return Response.json({
      since_tick: sinceTick,
      current_tick: this.hot.tick,
      sim_day: this.hot.world.simDay,
      total_firings: total,
      by_mechanism: filtered.map((r) => ({
        mechanism: r["mechanism"],
        family: FAMILY_OF[r["mechanism"]],
        count: r["n"]
      }))
    });
  }
  handleWebSocketUpgrade(request) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    const visitorHash = simpleHash(ip);
    this.ctx.acceptWebSocket(server);
    const attachment = {
      visitorHash,
      connectedAtMs: Date.now()
    };
    server.serializeAttachment(attachment);
    this.sendSnapshot(server);
    this.sql.exec(
      `INSERT INTO visitor_session (hash, first_seen_ms, last_seen_ms)
       VALUES (?, ?, ?)
       ON CONFLICT(hash) DO UPDATE SET last_seen_ms = excluded.last_seen_ms`,
      visitorHash,
      attachment.connectedAtMs,
      attachment.connectedAtMs
    );
    return new Response(null, { status: 101, webSocket: client });
  }
  // ─────────────────────────────────────────────────────────────────
  //  WebSocket Hibernation handlers
  // ─────────────────────────────────────────────────────────────────
  async webSocketMessage(ws, data) {
    await this.ensureInit();
    if (typeof data !== "string")
      return;
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const parsed = ClientToServerSchema.safeParse(msg);
    if (!parsed.success)
      return;
    const attachment = ws.deserializeAttachment();
    const visitorHash = attachment?.visitorHash ?? "unknown";
    switch (parsed.data.t) {
      case "pebble":
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: this.hot.tick,
            actor: `visitor:${visitorHash}`,
            type: "visitor_pebble_placed",
            payload: {
              x: parsed.data.x,
              z: parsed.data.z,
              inscription: parsed.data.inscription ?? null
            }
          }
        );
        this.applyAmbientToNearby(parsed.data.x, parsed.data.z, {
          kind: "visitor_pebble_placed"
        });
        break;
      case "food": {
        const now = Date.now();
        const window = 6e4;
        const maxPerWindow = 3;
        const recent = (this.visitorFoodTimestamps.get(visitorHash) ?? []).filter((t) => now - t < window);
        if (recent.length >= maxPerWindow)
          break;
        recent.push(now);
        this.visitorFoodTimestamps.set(visitorHash, recent);
        const pellet = makeVisitorPellet(
          parsed.data.x,
          parsed.data.z,
          this.hot.tick
        );
        this.hot.food.push(pellet);
        this.sql.exec(
          `UPDATE visitor_session SET food_count = food_count + 1,
             last_seen_ms = ? WHERE hash = ?`,
          now,
          visitorHash
        );
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: this.hot.tick,
            actor: `visitor:${visitorHash}`,
            type: "visitor_fed",
            payload: {
              x: pellet.x,
              z: pellet.z,
              food_id: pellet.id
            }
          }
        );
        this.applyAmbientToNearby(pellet.x, pellet.z, {
          kind: "visitor_fed"
        });
        break;
      }
      case "nickname":
        this.sql.exec(
          `INSERT INTO visitor_nickname (visitor_hash, koi_id, nickname, set_at_ms)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(visitor_hash, koi_id)
             DO UPDATE SET nickname = excluded.nickname, set_at_ms = excluded.set_at_ms`,
          visitorHash,
          parsed.data.koiId,
          parsed.data.nickname,
          Date.now()
        );
        break;
    }
  }
  async webSocketClose(ws, _code, _reason, _wasClean) {
  }
  async webSocketError(_ws, _error) {
  }
  // ─────────────────────────────────────────────────────────────────
  //  Alarm — the simulation loop
  // ─────────────────────────────────────────────────────────────────
  async alarm() {
    const nowMs = Date.now();
    console.log("[pond alarm] fired at ms=" + nowMs);
    try {
      await this.alarmBody(nowMs);
    } catch (err) {
      console.error(
        "[pond alarm] error in tick " + (this.hot?.tick ?? "?") + ": " + (err instanceof Error ? err.stack ?? err.message : String(err))
      );
    } finally {
      try {
        await this.ctx.storage.setAlarm(nowMs + SIM.tickIntervalMs);
      } catch (rescheduleErr) {
        console.error(
          "[pond alarm] FATAL: could not reschedule: " + (rescheduleErr instanceof Error ? rescheduleErr.message : String(rescheduleErr))
        );
      }
    }
  }
  async alarmBody(nowMs) {
    await this.ensureInit();
    const newTick = this.hot.tick + 1;
    const rng = new Rng(this.hot.rngState);
    const dt = SIM.tickIntervalMs / 1e3;
    const { world: newWorld, transitions } = advanceWorld(
      this.hot.world,
      newTick,
      rng
    );
    this.hot.world = newWorld;
    for (const k of this.hot.koi) {
      k.pad = decayPad(k.pad, k.stage, dt);
    }
    for (const k of this.hot.koi) {
      stepHunger(k, dt);
    }
    const prevSimHour = Math.floor(this.hot.world.tDay * 24);
    const newSimHour = Math.floor(newWorld.tDay * 24);
    if (newSimHour !== prevSimHour) {
      const lines = this.hot.koi.filter((k) => k.stage !== "egg").map((k) => `${k.name.slice(0, 12).padEnd(12)} stage=${k.stage.padEnd(10)} hunger=${k.hunger.toFixed(3)}`);
      if (lines.length) {
        console.log(`[hunger] sim-day ${this.hot.world.simDay} hour ${newSimHour}:
  ` + lines.join("\n  "));
      }
    }
    const simTime = newTick / SIM.tickHz;
    for (const k of this.hot.koi) {
      stepKoi(k, this.hot.koi, simTime, dt);
      pushHeading(k, k.h);
    }
    const consumptions = stepNutrition(this.hot, newTick, rng, dt);
    for (const c of consumptions) {
      await emit2(
        this.sql,
        this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick,
          actor: `koi:${c.koiId}`,
          type: "interaction",
          payload: {
            subtype: "food_eaten",
            koi_name: c.koiName,
            food_kind: c.foodKind,
            food_id: c.foodId,
            nutrition: c.nutrition,
            loc: { x: c.x, z: c.z }
          }
        }
      );
    }
    const cognitionOn = this.env.COGNITION_ENABLED === "true" && !!this.env.OPENROUTER_API_KEY;
    const permissions = loadActivePermissions(this.sql, newTick);
    const permittedMateByKoi = /* @__PURE__ */ new Map();
    for (const p of permissions) {
      permittedMateByKoi.set(p.aId, p.bId);
      permittedMateByKoi.set(p.bId, p.aId);
    }
    for (const k of this.hot.koi) {
      if (newTick >= k.nextCognitionTick) {
        let used = "meditation";
        if (cognitionOn) {
          try {
            await this.runKoiCognition(k, newTick);
            used = "llm";
          } catch (err) {
            await this.logCognitionFailure(k, newTick, err);
            k.intent = pickMeditationIntent(
              k,
              this.hot.koi,
              this.hot.world,
              newTick,
              rng,
              permittedMateByKoi.get(k.id)
            );
          }
        } else {
          k.intent = pickMeditationIntent(
            k,
            this.hot.koi,
            this.hot.world,
            newTick,
            rng,
            permittedMateByKoi.get(k.id)
          );
        }
        if (k.hunger > HUNGER.preoccupationThreshold && k.stage !== "egg" && k.stage !== "dying") {
          const food = nearestFood(k, this.hot.food, 6);
          if (food) {
            k.intent = {
              ...k.intent,
              kind: "feed_approach",
              target: { x: food.x, y: food.y, z: food.z },
              targetId: void 0,
              // target is a position, not a koi
              atTick: newTick
            };
          }
        }
        const intervalS = COGNITION_INTERVAL_S[k.stage] ?? 120;
        k.nextCognitionTick = newTick + Math.floor(intervalS * SIM.tickHz);
      }
    }
    const crossedIntoNewDay = transitions.some(
      (t) => t.kind === "day_advanced"
    );
    if (crossedIntoNewDay && this.hot.world.season === "spring") {
      const detected = detectMutualPairs(this.sql, this.hot.world.simDay);
      const eligible = filterEligible(
        this.sql,
        detected,
        this.hot.world,
        this.hot.koi,
        newTick
      );
      for (const pair of eligible) {
        grantPermission(this.sql, pair, newTick);
        for (const id of [pair.aId, pair.bId]) {
          const k = this.hot.koi.find((x) => x.id === id);
          if (k)
            k.pad = applyDelta(k.pad, appraise({ kind: "mutual_drawn_to" }, "self"));
        }
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick,
            actor: "system",
            type: "bond_consolidated",
            targets: [pair.aId, pair.bId],
            mechanism: "parallel_presence",
            payload: {
              pair_key: pair.pairKey,
              mutual_days: pair.mutualDays,
              season: this.hot.world.season
            }
          }
        );
      }
    }
    for (const perm of permissions) {
      const a = this.hot.koi.find((k) => k.id === perm.aId);
      const b = this.hot.koi.find((k) => k.id === perm.bId);
      if (!a || !b)
        continue;
      if (!isCoPresentForSpawning(a, b))
        continue;
      await this.fireSpawning(perm.pairKey, a, b, newTick, rng);
    }
    if (newTick % DETECTOR_INTERVAL_TICKS === 0) {
      const detCtx = {
        tick: newTick,
        tickHz: SIM.tickHz,
        simDay: this.hot.world.simDay,
        tDay: this.hot.world.tDay,
        koi: this.hot.koi,
        pois: [],
        // Stage 10 will populate; for now no visitor POIs
        sql: this.sql
      };
      const firings = runStateDetectors(detCtx);
      for (const f of firings) {
        await this.applyMechanismFiring(f);
      }
      await this.maybePickUpNearbyMaterials(newTick);
    }
    if (crossedIntoNewDay) {
      if (rng.chance(ARTIFACT_LIMITS.foundMaterialSpawnRatePerDay)) {
        const art = createFoundMaterial(this.sql, { atTick: newTick, rng });
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick,
            actor: "system",
            type: "interaction",
            mechanism: null,
            payload: {
              subtype: "material_spawned",
              artifact_id: art.id,
              artifact_type: art.type,
              loc: art.loc
            }
          }
        );
      }
    }
    const stageEvents = [];
    const fryHatches = [];
    const deaths = [];
    for (const k of this.hot.koi) {
      const prevStage = k.stage;
      const newStage = advanceStage(k);
      if (newStage) {
        stageEvents.push({ koi: k, to: newStage });
        if (prevStage === "egg" && newStage === "fry" && isUnnamed(k.name)) {
          fryHatches.push(k);
        }
      }
      const lifespan = this.lifespanByKoi.get(k.id);
      if (lifespan) {
        const pDeath = deathProbabilityPerTick(
          k,
          lifespan,
          stormStress(this.hot.world.weather)
        );
        if (pDeath > 0 && rng.chance(pDeath)) {
          deaths.push(k);
        }
      }
    }
    for (const f of fryHatches) {
      const hourAtHatch = this.hot.world.tDay * 24;
      const obs = collectObservations(f, this.hot.koi, hourAtHatch);
      f.name = composeName(f.id, f.color, obs);
      if (!this.lifespanByKoi.has(f.id)) {
        this.lifespanByKoi.set(f.id, drawLifespan(new Rng(hashCode(f.id))));
      }
      const lineageRow = this.sql.exec(
        `SELECT parent_a_id, parent_b_id FROM koi_lineage WHERE koi_id = ?`,
        f.id
      ).toArray()[0];
      if (lineageRow) {
        const parentIds = [];
        const pa = lineageRow["parent_a_id"];
        const pb = lineageRow["parent_b_id"];
        if (pa)
          parentIds.push(pa);
        if (pb && pb !== pa)
          parentIds.push(pb);
        for (const parentId of parentIds) {
          const parentAlive = this.hot.koi.some(
            (k) => k.id === parentId && k.stage !== "egg"
          );
          if (!parentAlive)
            continue;
          this.sql.exec(
            `INSERT INTO relationship_card (
               self_id, other_id, first_encounter_tick, interaction_count,
               valence, valence_trajectory_json, dominance, trust, summary,
               notable_memory_ids_json, drawn_count_7d, last_authored_tick,
               familiarity_prior
             ) VALUES (?, ?, ?, 0, 0.06, '[0.06]', -0.1, 0.5, '', '[]', 0, ?, 0.12)
             ON CONFLICT(self_id, other_id) DO UPDATE SET
               familiarity_prior = MAX(relationship_card.familiarity_prior, 0.12)`,
            f.id,
            parentId,
            newTick,
            newTick
          );
          this.sql.exec(
            `INSERT INTO relationship_card (
               self_id, other_id, first_encounter_tick, interaction_count,
               valence, valence_trajectory_json, dominance, trust, summary,
               notable_memory_ids_json, drawn_count_7d, last_authored_tick,
               familiarity_prior
             ) VALUES (?, ?, ?, 0, 0.08, '[0.08]', 0.2, 0.6, '', '[]', 0, ?, 0.15)
             ON CONFLICT(self_id, other_id) DO UPDATE SET
               familiarity_prior = MAX(relationship_card.familiarity_prior, 0.15)`,
            parentId,
            f.id,
            newTick,
            newTick
          );
        }
      }
      await emit2(
        this.sql,
        this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick,
          actor: `koi:${f.id}`,
          type: "fry_hatched",
          payload: { name: f.name, color: f.color, legendary: f.legendary }
        }
      );
      this.broadcastAmbient({
        t: "ambient",
        kind: "hatched",
        tick: newTick,
        now: nowMs,
        details: { name: f.name }
      });
      const delta = appraise({ kind: "fry_hatched_in_pond" }, "pond_witness");
      for (const other of this.hot.koi) {
        if (other.id === f.id)
          continue;
        other.pad = applyDelta(other.pad, delta);
      }
    }
    for (const t of transitions) {
      await this.emitWorldTransition(newTick, t);
    }
    for (const s of stageEvents) {
      await emit2(
        this.sql,
        this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick,
          actor: `koi:${s.koi.id}`,
          type: "koi_stage_advanced",
          payload: { to: s.to, name: s.koi.name }
        }
      );
    }
    for (const d of deaths) {
      this.hot.koi = this.hot.koi.filter((x) => x.id !== d.id);
      this.sql.exec(
        `UPDATE koi SET is_alive = 0, died_at_tick = ? WHERE id = ?`,
        newTick,
        d.id
      );
      for (const survivor of this.hot.koi) {
        const role = (
          // bonded = has a relationship_card row with positive valence
          // (cheap check via the sql)
          this.bondedWithDeceased(survivor.id, d.id) ? "bonded_witness" : "pond_witness"
        );
        const delta = appraise({
          kind: d.stage === "elder" ? "elder_died" : "peer_died"
        }, role);
        survivor.pad = applyDelta(survivor.pad, delta);
      }
      await emit2(
        this.sql,
        this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick,
          actor: `koi:${d.id}`,
          type: "koi_died",
          payload: { name: d.name, stage: d.stage, age_ticks: d.ageTicks }
        }
      );
      await this.handleDeathArtifacts(d, newTick, rng);
      this.broadcastAmbient({
        t: "ambient",
        kind: "died",
        tick: newTick,
        now: nowMs,
        details: { name: d.name }
      });
    }
    this.hot.tick = newTick;
    this.hot.rngState = rng.snapshot();
    this.persistWorld();
    for (const k of this.hot.koi)
      this.updateKoiRow(k);
    this.persistFood();
    this.broadcastTick(newTick, nowMs);
  }
  // ─────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────
  bondedWithDeceased(selfId, otherId) {
    const rows = this.sql.exec(
      `SELECT valence FROM relationship_card WHERE self_id = ? AND other_id = ?`,
      selfId,
      otherId
    ).toArray();
    if (rows.length === 0)
      return false;
    return rows[0]["valence"] > 0.25;
  }
  applyAmbientToNearby(x, z, event) {
    const R = 1.5;
    for (const k of this.hot.koi) {
      const dx = k.x - x, dz = k.z - z;
      if (dx * dx + dz * dz > R * R)
        continue;
      const delta = appraise(event, "self");
      k.pad = applyDelta(k.pad, delta);
    }
  }
  async emitWorldTransition(tick, t) {
    const trans = t;
    const typeMap = {
      day_advanced: "day_advanced",
      season_changed: "season_changed",
      weather_changed: "weather_changed",
      solstice_began: "solstice_attended",
      solstice_ended: "ritual_performed"
    };
    const type = typeMap[trans.kind] ?? "ritual_performed";
    await emit2(
      this.sql,
      this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick,
        actor: "system",
        type,
        payload: { ...trans }
      }
    );
    const ambientKind = trans.kind === "solstice_began" ? "solstice_began" : trans.kind === "solstice_ended" ? "solstice_ended" : trans.kind === "season_changed" ? "season_changed" : trans.kind === "weather_changed" && trans["to"] === "storm" ? "storm_began" : trans.kind === "weather_changed" && trans["from"] === "storm" ? "storm_ended" : null;
    if (ambientKind) {
      this.broadcastAmbient({
        t: "ambient",
        kind: ambientKind,
        tick,
        now: Date.now(),
        details: trans
      });
    }
  }
  // ─────────────────────────────────────────────────────────────────
  //  Cognition (§ V) — only called when COGNITION_ENABLED=true and
  //  OPENROUTER_API_KEY is set. Any throw falls through to meditation.
  // ─────────────────────────────────────────────────────────────────
  async runKoiCognition(k, newTick) {
    const visible = this.hot.koi.filter(
      (o) => o.id !== k.id && distance2d(o, k) < 2.5
    );
    const situation = [
      `time: ${this.hot.world.season}, tDay ${this.hot.world.tDay.toFixed(2)}`,
      `weather: ${this.hot.world.weather}`,
      `nearby: ${visible.map((o) => o.id).join(",") || "none"}`,
      `self: ${k.stage}, p=${k.pad.p.toFixed(2)} a=${k.pad.a.toFixed(2)}`
    ].join(" \xB7 ");
    const qEmbedding = await embed(this.env.AI, situation);
    const memories = retrieveMemories(this.sql, {
      koiId: k.id,
      stage: k.stage,
      queryEmbedding: qEmbedding,
      nowTick: newTick,
      tickHz: SIM.tickHz,
      visibleKoi: visible.map((o) => o.id)
    });
    const cards = this.loadCards(k.id, visible.map((o) => o.id));
    const beliefs = this.loadValidBeliefs(k.id);
    const tDay = this.hot.world.tDay;
    const isTwilight = tDay > 0.86 && tDay < 0.92 && newTick - k.lastTwilightTick > Math.floor(SIM.tickHz * 3600 * 12);
    const result = await runCognition(this.env, {
      self: k,
      visible,
      cards,
      beliefs,
      memories,
      world: this.hot.world,
      tickHz: SIM.tickHz,
      ambient: [],
      isTwilight
    }, this.hot.monthSpendUsd);
    const resp = result.response;
    await this.applyCognitionResponse(k, newTick, resp, isTwilight, visible);
    this.hot.monthSpendUsd += result.costUsd;
    await emit2(
      this.sql,
      this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: newTick,
        actor: `koi:${k.id}`,
        type: result.cachedFallback ? "llm_failed" : "llm_called",
        mechanism: resp.mechanism ?? null,
        llm: {
          model: result.modelUsed,
          temperature: result.temperature,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd
        },
        payload: {
          intent: resp.intent,
          target_koi: resp.target_koi ?? null,
          utterance: resp.utterance ?? null,
          mood_delta: resp.mood_delta,
          importance: resp.importance,
          twilight: isTwilight,
          validation_failures: result.validationFailures
        }
      }
    );
  }
  async applyCognitionResponse(k, newTick, resp, isTwilight, visible = []) {
    if (resp.mechanism && resp.target_koi) {
      const outcome = validateClaim(
        this.sql,
        resp.mechanism,
        k.id,
        resp.target_koi,
        newTick,
        SIM.tickHz
      );
      if (outcome) {
        if (outcome.kind === "honored") {
          await this.applyMechanismFiring(outcome.firing);
        } else {
          await emit2(
            this.sql,
            this.env.AE_EVENTS,
            { pondId: this.pondId, configHash: this.configHash },
            {
              tick: newTick,
              actor: `koi:${k.id}`,
              type: "interaction",
              targets: [resp.target_koi],
              mechanism: resp.mechanism,
              payload: {
                downgraded: true,
                reason: outcome.reason
              }
            }
          );
        }
      }
    }
    const target = resp.target_koi ?? void 0;
    k.intent = {
      kind: resp.intent,
      atTick: newTick,
      ...target !== void 0 ? { targetId: target } : {},
      ...resp.mechanism ? { mechanism: resp.mechanism } : {}
    };
    if (resp.mood_delta) {
      const shared = {
        p: (resp.mood_delta.p ?? 0) * 0.3,
        a: (resp.mood_delta.a ?? 0) * 0.3,
        d: (resp.mood_delta.d ?? 0) * 0.3
      };
      k.pad = applyDelta(k.pad, shared);
    }
    if (resp.utterance) {
      const uttId = crypto.randomUUID();
      const msg = {
        t: "speech",
        fishId: k.id,
        uttId,
        chunk: resp.utterance,
        done: true
      };
      const payload = JSON.stringify(msg);
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.send(payload);
        } catch {
        }
      }
      k.lastUtterance = resp.utterance;
      k.lastUtteranceTick = newTick;
    }
    if (resp.memory_write) {
      const mw = resp.memory_write;
      try {
        const emb = await embed(this.env.AI, mw.content);
        writeMemoryRow(this.sql, {
          koiId: k.id,
          kind: mw.kind,
          content: mw.content,
          importance: resp.importance,
          createdAtTick: newTick,
          emotionalValence: mw.emotional_valence,
          participants: mw.participants,
          embedding: emb
        });
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick,
            actor: `koi:${k.id}`,
            type: "memory_written",
            payload: { kind: mw.kind, importance: resp.importance }
          }
        );
      } catch {
      }
    }
    if (resp.belief_update) {
      try {
        const bu = resp.belief_update;
        if (bu.supersedes_belief_id) {
          this.sql.exec(
            `UPDATE memory SET valid_to_tick = ? WHERE id = ? AND koi_id = ?`,
            newTick,
            bu.supersedes_belief_id,
            k.id
          );
        }
        const emb = await embed(this.env.AI, bu.content);
        writeMemoryRow(this.sql, {
          koiId: k.id,
          kind: "belief",
          content: bu.content,
          importance: 6,
          createdAtTick: newTick,
          emotionalValence: 0,
          participants: [],
          embedding: emb,
          sourceMemoryIds: bu.supersedes_belief_id ? [bu.supersedes_belief_id] : []
        });
      } catch {
      }
    }
    if (isTwilight) {
      this.authorRelationshipCards(
        k.id,
        visible,
        newTick,
        this.hot.world.simDay
      );
      if (resp.drawn_to) {
        k.drawnTo = {
          targetId: resp.drawn_to.koi_id,
          noticing: resp.drawn_to.noticing,
          atTick: newTick
        };
        this.sql.exec(
          `INSERT INTO drawn_to_log (actor_id, target_id, noticing, tick, sim_day)
           VALUES (?, ?, ?, ?, ?)`,
          k.id,
          resp.drawn_to.koi_id,
          resp.drawn_to.noticing,
          newTick,
          this.hot.world.simDay
        );
        this.bumpCardValence(k.id, resp.drawn_to.koi_id, 0.04, newTick);
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick,
            actor: `koi:${k.id}`,
            type: "drawn_to_reflected",
            targets: [resp.drawn_to.koi_id],
            payload: { noticing: resp.drawn_to.noticing }
          }
        );
      }
      k.lastTwilightTick = newTick;
    }
    k.microImportanceAccum += resp.importance;
    if (newTick % Math.floor(SIM.tickHz * 3600 * 24) === 0) {
      pruneIfNeeded(this.sql, k.id, newTick, SIM.tickHz);
    }
  }
  async logCognitionFailure(k, newTick, err) {
    const message = err instanceof Error ? err.message : String(err);
    await emit2(
      this.sql,
      this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: newTick,
        actor: `koi:${k.id}`,
        type: "llm_failed",
        payload: { error: message.slice(0, 200) }
      }
    );
  }
  // ─────────────────────────────────────────────────────────────────
  //  Relationship card authoring (§ VI, Stage 1 polish)
  //
  //  Called once per koi per twilight. For each currently-visible other
  //  fish, upsert the directed (self → other) card with:
  //    - interaction_count bumped by 1 (we co-existed today)
  //    - a small witnessing-baseline valence increment (+0.01) — Witnessing
  //      family from § IX: sustained parallel presence is regenerative
  //    - drawn_count_7d recomputed from the drawn_to_log within the window
  //    - today's valence appended to the 7-day trajectory
  //
  //  The drawn-to target gets an ADDITIONAL bump on top of this via
  //  bumpCardValence(), applied immediately after by the caller.
  // ─────────────────────────────────────────────────────────────────
  authorRelationshipCards(selfId, visible, newTick, simDay) {
    const windowLower = simDay - 7;
    const BASELINE_BUMP = 0.01;
    for (const o of visible) {
      if (o.id === selfId)
        continue;
      if (o.stage === "egg")
        continue;
      const existing = this.sql.exec(
        `SELECT valence, valence_trajectory_json, first_encounter_tick
           FROM relationship_card WHERE self_id = ? AND other_id = ?`,
        selfId,
        o.id
      ).toArray()[0];
      const priorValence = existing?.["valence"] ?? 0;
      const priorTrajectory = existing ? JSON.parse(existing["valence_trajectory_json"]) : [];
      const firstEncounterTick = existing ? existing["first_encounter_tick"] : newTick;
      const newValence = clampToPlausible(priorValence + BASELINE_BUMP);
      const trajectory = [...priorTrajectory, newValence].slice(-7);
      const drawnCountRow = this.sql.exec(
        `SELECT COUNT(DISTINCT sim_day) AS n FROM drawn_to_log
          WHERE actor_id = ? AND target_id = ?
            AND sim_day > ? AND sim_day <= ?`,
        selfId,
        o.id,
        windowLower,
        simDay
      ).toArray()[0];
      const drawnCount7d = drawnCountRow?.["n"] ?? 0;
      this.sql.exec(
        `INSERT INTO relationship_card (
           self_id, other_id, first_encounter_tick, interaction_count,
           valence, valence_trajectory_json, dominance, trust, summary,
           notable_memory_ids_json, drawn_count_7d, last_authored_tick
         ) VALUES (?, ?, ?, 1, ?, ?, 0, 0.3, '', '[]', ?, ?)
         ON CONFLICT(self_id, other_id) DO UPDATE SET
           interaction_count = interaction_count + 1,
           valence = excluded.valence,
           valence_trajectory_json = excluded.valence_trajectory_json,
           drawn_count_7d = excluded.drawn_count_7d,
           last_authored_tick = excluded.last_authored_tick`,
        selfId,
        o.id,
        firstEncounterTick,
        newValence,
        JSON.stringify(trajectory),
        drawnCount7d,
        newTick
      );
    }
  }
  /** Apply a valence delta to a single directed card. Used when the
   *  twilight reflection flags a specific other koi as drawn-to. */
  bumpCardValence(selfId, otherId, delta, nowTick) {
    const row = this.sql.exec(
      `SELECT valence, valence_trajectory_json FROM relationship_card
        WHERE self_id = ? AND other_id = ?`,
      selfId,
      otherId
    ).toArray()[0];
    if (!row)
      return;
    const current = row["valence"];
    const bumped = clampToPlausible(current + delta);
    const trajectory = JSON.parse(
      row["valence_trajectory_json"]
    );
    if (trajectory.length > 0)
      trajectory[trajectory.length - 1] = bumped;
    this.sql.exec(
      `UPDATE relationship_card
          SET valence = ?, valence_trajectory_json = ?, last_authored_tick = ?
        WHERE self_id = ? AND other_id = ?`,
      bumped,
      JSON.stringify(trajectory),
      nowTick,
      selfId,
      otherId
    );
  }
  // ─────────────────────────────────────────────────────────────────
  //  Mechanism firing — common applier for state-based + claim-based
  //
  //  Takes a MechanismFiring (from a detector or a honored claim),
  //  applies its PAD deltas to actor + each participant, applies its
  //  card valence bumps between the actor and each participant, and
  //  emits the event. Idempotent per (mechanism, actor, participants,
  //  tick) because the caller is responsible for cooldown gating.
  // ─────────────────────────────────────────────────────────────────
  async applyMechanismFiring(f) {
    if (f.mechanism === "tag") {
      const tagger = this.hot.koi.find((k) => k.id === f.actor);
      const tagged = this.hot.koi.find(
        (k) => k.id !== f.actor && f.participants.includes(k.id)
      );
      if (tagger && tagged) {
        const chainStartedTick = f.payload["chain_started_tick"] ?? f.tick;
        applyTagEvent(
          {
            tagger: f.actor,
            tagged: tagged.id,
            chainLength: f.payload["chain_length"] ?? 1,
            chainStartedTick
          },
          tagger,
          tagged,
          f.tick
        );
      }
    }
    const actor = this.hot.koi.find((k) => k.id === f.actor);
    if (actor)
      actor.pad = applyDelta(actor.pad, f.actorDelta);
    for (const pid2 of f.participants) {
      if (pid2 === f.actor)
        continue;
      const p = this.hot.koi.find((k) => k.id === pid2);
      if (p)
        p.pad = applyDelta(p.pad, f.participantDelta);
    }
    if (f.cardValenceBump > 0) {
      for (const pid2 of f.participants) {
        if (pid2 === f.actor)
          continue;
        this.softBumpCard(f.actor, pid2, f.cardValenceBump, f.tick);
        this.softBumpCard(pid2, f.actor, f.cardValenceBump, f.tick);
      }
    }
    const type = f.mechanism === "apology" ? "apology" : f.mechanism === "forgiveness" ? "forgiveness" : "interaction";
    await emit2(
      this.sql,
      this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: f.tick,
        actor: `koi:${f.actor}`,
        type,
        targets: f.participants.filter((p) => p !== f.actor),
        mechanism: f.mechanism,
        affectDelta: f.actorDelta,
        payload: { family: f.family, ...f.payload }
      }
    );
    const mechMsg = {
      t: "mechanism",
      tick: f.tick,
      now: Date.now(),
      mechanism: f.mechanism,
      family: f.family,
      actor: f.actor,
      participants: f.participants,
      payload: f.payload
    };
    const mechPayload = JSON.stringify(mechMsg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(mechPayload);
      } catch {
      }
    }
  }
  /** Scan nearby loose artifacts for each koi and pick up if capacity. */
  async maybePickUpNearbyMaterials(newTick) {
    const PICKUP_RADIUS_M = 0.3;
    for (const k of this.hot.koi) {
      if (k.stage === "egg" || k.stage === "dying")
        continue;
      if (!hasCapacity(this.sql, k.id))
        continue;
      const nearby = loadNearbyLooseArtifacts(
        this.sql,
        { x: k.x, z: k.z },
        PICKUP_RADIUS_M
      );
      for (const art of nearby) {
        if (!hasCapacity(this.sql, k.id))
          break;
        if (art.sacred)
          continue;
        if (art.state === "offered")
          continue;
        pickUp(this.sql, art, k.id, newTick);
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick,
            actor: `koi:${k.id}`,
            type: "interaction",
            payload: {
              subtype: "artifact_found",
              artifact_id: art.id,
              artifact_type: art.type
            }
          }
        );
      }
    }
  }
  /** Death-ritual artifact handling (§ IX heirloom + Stage 9 name-tile).
   *  Called once per death by the death loop. */
  async handleDeathArtifacts(deceased, newTick, rng) {
    const heir = chooseHeir(this.sql, deceased.id, this.hot.koi);
    const held = loadHeldArtifacts(this.sql, deceased.id);
    if (heir) {
      const shrineLoc = {
        x: POND.shrine.x,
        y: -POND.maxDepth + 0.05,
        z: POND.shrine.z
      };
      const tile = createNameTile(this.sql, {
        atTick: newTick,
        deceasedName: deceased.name,
        deceasedId: deceased.id,
        placedByKoiId: heir.koiId,
        shrineLoc,
        rng
      });
      await emit2(
        this.sql,
        this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick,
          actor: `koi:${heir.koiId}`,
          type: "interaction",
          targets: [deceased.id],
          mechanism: "farewell",
          payload: {
            subtype: "name_tile_placed",
            artifact_id: tile.id,
            for_koi: deceased.id,
            for_name: deceased.name,
            heir_valence: heir.valence
          }
        }
      );
      for (const art of held) {
        transferAsHeirloom(this.sql, art, deceased.id, heir.koiId, newTick);
        await emit2(
          this.sql,
          this.env.AE_EVENTS,
          { pondId: this.pondId, configHash: this.configHash },
          {
            tick: newTick,
            actor: `koi:${heir.koiId}`,
            type: "interaction",
            targets: [deceased.id],
            mechanism: "heirloom",
            payload: {
              artifact_id: art.id,
              artifact_type: art.type,
              from: deceased.id,
              to: heir.koiId
            }
          }
        );
      }
      this.broadcastAmbient({
        t: "ambient",
        kind: "elder_named",
        tick: newTick,
        now: Date.now(),
        details: { name: deceased.name, heir: heir.koiId }
      });
    } else {
      const loc = { x: deceased.x, y: deceased.y, z: deceased.z };
      for (const art of held) {
        markDiedWith(this.sql, art, deceased.id, loc, newTick);
      }
    }
  }
  /** Like bumpCardValence but tolerates the absence of an existing card
   *  by creating one with minimum fields. Used for mechanism firings
   *  that might precede a twilight reflection. */
  softBumpCard(selfId, otherId, delta, nowTick) {
    const existing = this.sql.exec(
      `SELECT valence, valence_trajectory_json FROM relationship_card
        WHERE self_id = ? AND other_id = ?`,
      selfId,
      otherId
    ).toArray()[0];
    if (!existing) {
      this.sql.exec(
        `INSERT INTO relationship_card (
           self_id, other_id, first_encounter_tick, interaction_count,
           valence, valence_trajectory_json, dominance, trust, summary,
           notable_memory_ids_json, drawn_count_7d, last_authored_tick
         ) VALUES (?, ?, ?, 0, ?, ?, 0, 0.3, '', '[]', 0, ?)`,
        selfId,
        otherId,
        nowTick,
        clampToPlausibleV(delta),
        JSON.stringify([clampToPlausibleV(delta)]),
        nowTick
      );
      return;
    }
    const current = existing["valence"];
    const bumped = clampToPlausibleV(current + delta);
    const traj = JSON.parse(existing["valence_trajectory_json"]);
    this.sql.exec(
      `UPDATE relationship_card
          SET valence = ?, last_authored_tick = ?
        WHERE self_id = ? AND other_id = ?`,
      bumped,
      nowTick,
      selfId,
      otherId
    );
  }
  // ─────────────────────────────────────────────────────────────────
  //  Spawning (§ X)
  //
  //  Called when a permitted pair has just co-presenced at the shelf.
  //  Consumes the permission, lays a clutch of eggs in the shelf band,
  //  marks parent cooldowns, writes lineage rows, and emits the event
  //  with witness list. Additional adults within WITNESS_PROXIMITY_M
  //  are logged as co-present but are NOT parents — only the drawn-to
  //  pair gets lineage credit.
  // ─────────────────────────────────────────────────────────────────
  async fireSpawning(pairKey, a, b, newTick, rng) {
    consumePermission(this.sql, pairKey, newTick);
    const eggCount = pickEggCount(rng);
    const placements = placeEggs(a, b, eggCount, newTick, rng);
    const witnesses = findWitnesses(this.hot.koi, a.id, b.id);
    const parentAGenetics = this.loadKoiGenetics(a);
    const parentBGenetics = this.loadKoiGenetics(b);
    const newEggs = [];
    for (const p of placements) {
      const eggGenetics = combineGenetics(
        parentAGenetics,
        parentBGenetics,
        rng,
        p.legendary
      );
      const eggColor = archetypeNameFor(eggGenetics);
      const eggSex = rng.float() < 0.5 ? "female" : "male";
      const egg = createEgg({
        id: p.eggId,
        parentAId: p.parentAId,
        parentBId: p.parentBId,
        x: p.x,
        y: p.y,
        z: p.z,
        legendary: p.legendary,
        color: eggColor,
        atTick: newTick,
        sex: eggSex
      }, rng);
      newEggs.push(egg);
      this.insertKoiRow(egg);
      this.sql.exec(
        `UPDATE koi SET genetics_json = ? WHERE id = ?`,
        geneticsToJSON(eggGenetics),
        egg.id
      );
      const generation = computeGenerationFromParents(this.sql, a.id, b.id);
      writeLineageRow(this.sql, egg.id, a.id, b.id, newTick, generation);
    }
    this.hot.koi.push(...newEggs);
    a.lastSpawningTick = newTick;
    b.lastSpawningTick = newTick;
    await emit2(
      this.sql,
      this.env.AE_EVENTS,
      { pondId: this.pondId, configHash: this.configHash },
      {
        tick: newTick,
        actor: "system",
        type: "spawning",
        targets: [a.id, b.id],
        mechanism: "parallel_presence",
        payload: {
          pair_key: pairKey,
          parent_a: a.id,
          parent_b: b.id,
          egg_count: eggCount,
          egg_ids: newEggs.map((e) => e.id),
          legendary_count: newEggs.filter((e) => e.legendary).length,
          witnesses: witnesses.map((w) => w.id),
          location: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
          season: this.hot.world.season
        }
      }
    );
    for (const egg of newEggs) {
      await emit2(
        this.sql,
        this.env.AE_EVENTS,
        { pondId: this.pondId, configHash: this.configHash },
        {
          tick: newTick,
          actor: `koi:${egg.id}`,
          type: "egg_laid",
          targets: [a.id, b.id],
          payload: {
            parent_a: a.id,
            parent_b: b.id,
            color: egg.color,
            legendary: egg.legendary
          }
        }
      );
    }
  }
  loadCards(selfId, otherIds) {
    if (otherIds.length === 0)
      return [];
    const placeholders = otherIds.map(() => "?").join(",");
    const rows = this.sql.exec(
      `SELECT * FROM relationship_card
        WHERE self_id = ? AND other_id IN (${placeholders})`,
      selfId,
      ...otherIds
    ).toArray();
    return rows.map((r) => ({
      selfId: r["self_id"],
      otherId: r["other_id"],
      firstEncounterTick: r["first_encounter_tick"],
      interactionCount: r["interaction_count"],
      valence: r["valence"],
      valenceTrajectory7d: JSON.parse(r["valence_trajectory_json"]),
      dominance: r["dominance"],
      trust: r["trust"],
      summary: r["summary"],
      notableMemoryIds: JSON.parse(r["notable_memory_ids_json"]),
      drawnCount7d: r["drawn_count_7d"],
      lastAuthoredTick: r["last_authored_tick"],
      familiarityPrior: r["familiarity_prior"] ?? 0
    }));
  }
  /** Load a koi's stored genetics from the koi row. Falls back to the
   *  archetype lookup (by `color` field) when genetics_json is empty —
   *  this covers the seed cohort, pre-migration rows, and any koi created
   *  before the genetics field was wired. */
  loadKoiGenetics(k) {
    const row = this.sql.exec(
      `SELECT genetics_json FROM koi WHERE id = ?`,
      k.id
    ).toArray()[0];
    const raw = row?.["genetics_json"];
    if (raw && raw !== "{}" && raw !== "") {
      try {
        return geneticsFromJSON(raw);
      } catch {
      }
    }
    return archetypeToGenetics(k.color);
  }
  loadValidBeliefs(selfId) {
    const rows = this.sql.exec(
      `SELECT id, koi_id, kind, content, importance,
              created_at_tick, last_accessed_tick, access_count,
              emotional_valence, participants_json, embedding,
              valid_to_tick, source_memory_ids_json
         FROM memory
        WHERE koi_id = ? AND kind = 'belief' AND valid_to_tick IS NULL
        ORDER BY importance DESC, created_at_tick DESC
        LIMIT 12`,
      selfId
    ).toArray();
    return rows.map((r) => ({
      id: r["id"],
      koiId: r["koi_id"],
      kind: "belief",
      content: r["content"],
      importance: r["importance"],
      createdAtTick: r["created_at_tick"],
      lastAccessedTick: r["last_accessed_tick"],
      accessCount: r["access_count"],
      emotionalValence: r["emotional_valence"],
      participants: JSON.parse(r["participants_json"]),
      embedding: r["embedding"],
      validToTick: r["valid_to_tick"] ?? null,
      sourceMemoryIds: JSON.parse(r["source_memory_ids_json"])
    }));
  }
  // ─────────────────────────────────────────────────────────────────
  //  SQLite row writers
  // ─────────────────────────────────────────────────────────────────
  persistWorld() {
    const w = this.hot.world;
    this.sql.exec(
      `INSERT INTO world (id, tick, t_day, sim_day, season, weather,
        clarity, temperature, solstice_active, next_solstice_tick,
        tier_level, month_spend_usd, rng_state)
       VALUES ('self', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         tick = excluded.tick,
         t_day = excluded.t_day,
         sim_day = excluded.sim_day,
         season = excluded.season,
         weather = excluded.weather,
         clarity = excluded.clarity,
         temperature = excluded.temperature,
         solstice_active = excluded.solstice_active,
         next_solstice_tick = excluded.next_solstice_tick,
         tier_level = excluded.tier_level,
         month_spend_usd = excluded.month_spend_usd,
         rng_state = excluded.rng_state`,
      this.hot.tick,
      w.tDay,
      w.simDay,
      w.season,
      w.weather,
      w.clarity,
      w.temperature,
      w.solsticeActive ? 1 : 0,
      w.nextSolsticeTick,
      this.hot.tierLevel,
      this.hot.monthSpendUsd,
      this.hot.rngState
    );
  }
  insertKoiRow(k) {
    this.sql.exec(
      `INSERT INTO koi (id, name, stage, sex, age_ticks, hatched_at_tick,
        legendary, color, x, y, z, vx, vz, h, size,
        pad_p, pad_a, pad_d, hunger,
        intent_kind, intent_target_id, intent_target_x, intent_target_y, intent_target_z,
        intent_at_tick, intent_mechanism, next_cognition_tick,
        last_twilight_tick, last_deep_sleep_tick, micro_importance_accum,
        drawn_target_id, drawn_noticing, drawn_at_tick,
        last_utterance, last_utterance_tick, last_spawning_tick,
        is_alive, died_at_tick)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      k.id,
      k.name,
      k.stage,
      k.sex,
      k.ageTicks,
      k.hatchedAtTick,
      k.legendary ? 1 : 0,
      k.color,
      k.x,
      k.y,
      k.z,
      k.vx,
      k.vz,
      k.h,
      k.size,
      k.pad.p,
      k.pad.a,
      k.pad.d,
      k.hunger,
      k.intent.kind,
      k.intent.targetId ?? null,
      k.intent.target?.x ?? null,
      k.intent.target?.y ?? null,
      k.intent.target?.z ?? null,
      k.intent.atTick,
      k.intent.mechanism ?? null,
      k.nextCognitionTick,
      k.lastTwilightTick,
      k.lastDeepSleepTick,
      k.microImportanceAccum,
      k.drawnTo?.targetId ?? null,
      k.drawnTo?.noticing ?? null,
      k.drawnTo?.atTick ?? null,
      k.lastUtterance,
      k.lastUtteranceTick,
      k.lastSpawningTick,
      1,
      null
    );
  }
  updateKoiRow(k) {
    this.sql.exec(
      `UPDATE koi SET
        stage = ?, age_ticks = ?, size = ?,
        x = ?, y = ?, z = ?, vx = ?, vz = ?, h = ?,
        pad_p = ?, pad_a = ?, pad_d = ?, hunger = ?,
        intent_kind = ?, intent_target_id = ?,
        intent_target_x = ?, intent_target_y = ?, intent_target_z = ?,
        intent_at_tick = ?, intent_mechanism = ?,
        next_cognition_tick = ?,
        last_twilight_tick = ?, last_deep_sleep_tick = ?,
        micro_importance_accum = ?,
        drawn_target_id = ?, drawn_noticing = ?, drawn_at_tick = ?,
        last_utterance = ?, last_utterance_tick = ?,
        last_spawning_tick = ?,
        name = ?
       WHERE id = ?`,
      k.stage,
      k.ageTicks,
      k.size,
      k.x,
      k.y,
      k.z,
      k.vx,
      k.vz,
      k.h,
      k.pad.p,
      k.pad.a,
      k.pad.d,
      k.hunger,
      k.intent.kind,
      k.intent.targetId ?? null,
      k.intent.target?.x ?? null,
      k.intent.target?.y ?? null,
      k.intent.target?.z ?? null,
      k.intent.atTick,
      k.intent.mechanism ?? null,
      k.nextCognitionTick,
      k.lastTwilightTick,
      k.lastDeepSleepTick,
      k.microImportanceAccum,
      k.drawnTo?.targetId ?? null,
      k.drawnTo?.noticing ?? null,
      k.drawnTo?.atTick ?? null,
      k.lastUtterance,
      k.lastUtteranceTick,
      k.lastSpawningTick,
      k.name,
      k.id
    );
  }
  /** Persist the current food list to SQL. Because food is a small
   *  table (≤30 items) and changes aren't frequent (spawn/decay events
   *  per tick), we use the simple "delete all + re-insert" pattern
   *  rather than diffing. Called from the alarm after the tick step. */
  persistFood() {
    this.sql.exec(`DELETE FROM food`);
    for (const f of this.hot.food) {
      this.sql.exec(
        `INSERT INTO food (id, kind, x, y, z, vx, vz,
          spawned_at_tick, decay_at_tick, nutrition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        f.id,
        f.kind,
        f.x,
        f.y,
        f.z,
        f.vx ?? null,
        f.vz ?? null,
        f.spawnedAtTick,
        f.decayAtTick,
        f.nutrition
      );
    }
  }
  // ─────────────────────────────────────────────────────────────────
  //  Broadcast
  // ─────────────────────────────────────────────────────────────────
  broadcastTick(tick, nowMs) {
    if (tick === this.lastBroadcastTick)
      return;
    this.lastBroadcastTick = tick;
    const fish = this.hot.koi.map(toFrame);
    const food = this.hot.food.map(toFoodFrame);
    const msg = TickMessageSchema.parse({
      t: "tick",
      tick,
      now: nowMs,
      fish,
      food
    });
    const payload = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
      }
    }
  }
  sendSnapshot(ws) {
    const fish = this.hot.koi.map(toFrame);
    const food = this.hot.food.map(toFoodFrame);
    const msg = SnapshotMessageSchema.parse({
      t: "snapshot",
      tick: this.hot.tick,
      now: Date.now(),
      fish,
      food,
      pondMeta: {
        version: this.pondVersion,
        created_at: Date.now(),
        // approximate; real value in pond_meta
        tick_interval_ms: SIM.tickIntervalMs,
        t_day: this.hot.world.tDay,
        season: this.hot.world.season
      }
    });
    try {
      ws.send(JSON.stringify(msg));
    } catch {
    }
  }
  broadcastAmbient(msg) {
    const parsed = AmbientEventMessageSchema.safeParse(msg);
    if (!parsed.success)
      return;
    const payload = JSON.stringify(parsed.data);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
      }
    }
  }
};
__name(Pond, "Pond");
function toFoodFrame(f) {
  return { id: f.id, kind: f.kind, x: f.x, y: f.y, z: f.z };
}
__name(toFoodFrame, "toFoodFrame");
function rowToKoi(r) {
  return {
    id: r["id"],
    name: r["name"],
    stage: r["stage"],
    sex: r["sex"] === "male" ? "male" : "female",
    ageTicks: r["age_ticks"],
    hatchedAtTick: r["hatched_at_tick"],
    legendary: r["legendary"] === 1,
    color: r["color"],
    x: r["x"],
    y: r["y"],
    z: r["z"],
    vx: r["vx"],
    vz: r["vz"],
    h: r["h"],
    size: r["size"] || SIZE_BY_STAGE[r["stage"]],
    pad: {
      p: r["pad_p"],
      a: r["pad_a"],
      d: r["pad_d"]
    },
    // Hunger is not yet persisted (commit 2 keeps it in-memory to avoid
    // a schema migration; see commit 3). On rehydrate, fall back to the
    // initial baseline. Since DO warm cycles are infrequent, a fish that
    // gets reset from 0.8 back to 0.2 on wake is acceptable for the
    // duration of this commit — our purpose here is to observe rise
    // dynamics between persists, not to simulate multi-day starvation.
    hunger: r["hunger"] ?? HUNGER.initial,
    intent: {
      kind: r["intent_kind"],
      targetId: r["intent_target_id"] ?? void 0,
      target: r["intent_target_x"] != null ? {
        x: r["intent_target_x"],
        y: r["intent_target_y"],
        z: r["intent_target_z"]
      } : void 0,
      atTick: r["intent_at_tick"],
      mechanism: r["intent_mechanism"] ?? void 0
    },
    nextCognitionTick: r["next_cognition_tick"],
    lastTwilightTick: r["last_twilight_tick"],
    lastDeepSleepTick: r["last_deep_sleep_tick"],
    microImportanceAccum: r["micro_importance_accum"],
    drawnTo: r["drawn_target_id"] != null ? {
      targetId: r["drawn_target_id"],
      noticing: r["drawn_noticing"],
      atTick: r["drawn_at_tick"]
    } : null,
    lastUtterance: r["last_utterance"] ?? null,
    lastUtteranceTick: r["last_utterance_tick"],
    lastSpawningTick: r["last_spawning_tick"] ?? 0,
    // Runtime-only play-family state. Not persisted: the tag-chain
    // timeout is short (30 sim-seconds) so any chain will have ended
    // by the time we rehydrate; recentHeadings rebuilds on the next
    // kinematics ticks. Revisit if we ever want cross-restart dance
    // detection.
    recentHeadings: [],
    tagState: null
  };
}
__name(rowToKoi, "rowToKoi");
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i) | 0;
  }
  return h || 1;
}
__name(hashCode, "hashCode");
function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
__name(distance2d, "distance2d");
function clampToPlausible(v) {
  return Math.max(-1, Math.min(1, v));
}
__name(clampToPlausible, "clampToPlausible");
function clampToPlausibleV(v) {
  return Math.max(-1, Math.min(1, v));
}
__name(clampToPlausibleV, "clampToPlausibleV");
function simpleHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h.toString(16).padStart(8, "0");
}
__name(simpleHash, "simpleHash");

// src/cognition-log.ts
var SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cognition_log (
  id                  TEXT PRIMARY KEY,
  created_at          INTEGER NOT NULL,

  -- Provenance
  run_tag             TEXT NOT NULL,          -- 'live' or 'sweep:<run_id>'
  pond_tick           INTEGER,
  model_id            TEXT NOT NULL,
  tier                TEXT NOT NULL,          -- micro|daily|twilight|deep|sweep

  -- Context (all serialized JSON blobs)
  pond_context_json   TEXT NOT NULL,          -- {season, weather, t_day, tick, copresent_ids}
  koi_id              TEXT,
  koi_state_json      TEXT NOT NULL,          -- {stage, sex, pad, recent_drawn_to, card_snippets}
  perception_json     TEXT NOT NULL,          -- visible-other descriptions in prompt

  -- Prompt
  prompt_system       TEXT NOT NULL,
  prompt_user         TEXT NOT NULL,

  -- Response
  raw_response        TEXT,                   -- unparsed model output
  coerced_json        TEXT,                   -- post-Zod-coerce, if valid
  validation_status   TEXT NOT NULL,          -- 'valid' | 'coerced' | 'failed'
  intent_chosen       TEXT,
  utterance           TEXT,                   -- null if empty/missing
  mechanism           TEXT,

  -- Economics
  latency_ms          INTEGER,
  tokens_in           INTEGER,
  tokens_out          INTEGER,
  cost_usd            REAL,

  -- Downstream consequence (filled after the behavioral tick)
  fired_mechanism     TEXT,

  -- Curator ratings
  rating_stars        INTEGER,                -- 1..5, null until rated
  rating_tag          TEXT,                   -- 'gold'|'keep'|'reject'|null
  rating_rewrite      TEXT,
  rated_at            INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cogn_created
  ON cognition_log(created_at);
CREATE INDEX IF NOT EXISTS idx_cogn_unrated
  ON cognition_log(rating_tag, utterance, created_at);
CREATE INDEX IF NOT EXISTS idx_cogn_model_run
  ON cognition_log(model_id, run_tag);
CREATE INDEX IF NOT EXISTS idx_cogn_run_tag
  ON cognition_log(run_tag);

CREATE TABLE IF NOT EXISTS sweep_run (
  run_id        TEXT PRIMARY KEY,
  started_at    INTEGER NOT NULL,
  finished_at   INTEGER,
  status        TEXT NOT NULL,                -- 'running' | 'done' | 'failed'
  model_count   INTEGER NOT NULL,
  context_count INTEGER NOT NULL,
  meta_json     TEXT NOT NULL
);
`;
var CognitionLog = class {
  env;
  sql;
  initialized = false;
  constructor(state, env2) {
    this.env = env2;
    this.sql = state.storage.sql;
  }
  ensureInit() {
    if (this.initialized)
      return;
    const statements = SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean);
    for (const s of statements)
      this.sql.exec(s);
    this.initialized = true;
  }
  authOK(req) {
    const header = req.headers.get("authorization");
    if (!header)
      return false;
    const expected = `Bearer ${this.env.SHARED_SECRET}`;
    return header === expected;
  }
  async fetch(req) {
    this.ensureInit();
    const url = new URL(req.url);
    if (!this.authOK(req)) {
      return new Response("unauthorized", { status: 401 });
    }
    try {
      switch (`${req.method} ${url.pathname}`) {
        case "POST /log":
          return await this.handleLog(req);
        case "POST /fire":
          return await this.handleFire(req);
        case "GET /next":
          return await this.handleNext(url);
        case "GET /batch":
          return await this.handleBatch(url);
        case "POST /rate":
          return await this.handleRate(req);
        case "POST /rate/batch":
          return await this.handleRateBatch(req);
        case "GET /sweep/list":
          return await this.handleSweepList();
        case "GET /sweep/rows":
          return await this.handleSweepRows(url);
        case "POST /sweep/start":
          return await this.handleSweepStart(req);
        case "POST /sweep/finish":
          return await this.handleSweepFinish(req);
        case "GET /export":
          return await this.handleExport(url);
        case "GET /export/unsloth":
          return await this.handleExportUnsloth(url);
        case "GET /stats":
          return await this.handleStats();
        default:
          return new Response("not found", { status: 404 });
      }
    } catch (err) {
      console.error("[cognition-log] handler error", err);
      return new Response(String(err), { status: 500 });
    }
  }
  // ─── /log ────────────────────────────────────────────────────────
  //
  // Body: the full LogRow shape. Returns { id } on success.
  async handleLog(req) {
    const body = await req.json();
    const id = body.id ?? `cg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = body.created_at ?? Date.now();
    this.sql.exec(
      `INSERT INTO cognition_log
        (id, created_at, run_tag, pond_tick, model_id, tier,
         pond_context_json, koi_id, koi_state_json, perception_json,
         prompt_system, prompt_user,
         raw_response, coerced_json, validation_status,
         intent_chosen, utterance, mechanism,
         latency_ms, tokens_in, tokens_out, cost_usd,
         fired_mechanism,
         rating_stars, rating_tag, rating_rewrite, rated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      body.run_tag,
      body.pond_tick ?? null,
      body.model_id,
      body.tier,
      JSON.stringify(body.pond_context ?? {}),
      body.koi_id ?? null,
      JSON.stringify(body.koi_state ?? {}),
      JSON.stringify(body.perception ?? {}),
      body.prompt_system,
      body.prompt_user,
      body.raw_response ?? null,
      body.coerced ? JSON.stringify(body.coerced) : null,
      body.validation_status,
      body.intent_chosen ?? null,
      body.utterance && body.utterance.length > 0 ? body.utterance : null,
      body.mechanism ?? null,
      body.latency_ms ?? null,
      body.tokens_in ?? null,
      body.tokens_out ?? null,
      body.cost_usd ?? null,
      null,
      // fired_mechanism filled post-hoc
      null,
      null,
      null,
      null
      // ratings filled later
    );
    return jsonResp({ id });
  }
  // ─── /fire ───────────────────────────────────────────────────────
  //
  // Called after a tick to mark which mechanism actually fired from this
  // cognition call. Body: { id, fired_mechanism }
  async handleFire(req) {
    const body = await req.json();
    this.sql.exec(
      `UPDATE cognition_log SET fired_mechanism = ? WHERE id = ?`,
      body.fired_mechanism,
      body.id
    );
    return jsonResp({ ok: true });
  }
  // ─── /next ───────────────────────────────────────────────────────
  //
  // Phone fetches the next card to rate.
  // Query: ?filter=live|sweep  optional run_id for sweep
  // Returns the oldest unrated non-empty-utterance row.
  async handleNext(url) {
    const filter = url.searchParams.get("filter") ?? "any";
    const runId = url.searchParams.get("run_id");
    let where = `rating_tag IS NULL AND utterance IS NOT NULL AND utterance != ''`;
    const args = [];
    if (filter === "live") {
      where += ` AND run_tag = 'live'`;
    } else if (filter === "sweep" && runId) {
      where += ` AND run_tag = ?`;
      args.push(`sweep:${runId}`);
    }
    const rows = this.sql.exec(
      `SELECT id, created_at, run_tag, model_id, tier, pond_context_json,
              koi_state_json, perception_json, utterance, intent_chosen,
              mechanism, fired_mechanism, latency_ms, cost_usd
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC
        LIMIT 1`,
      ...args
    ).toArray();
    if (rows.length === 0)
      return jsonResp({ row: null });
    const r = rows[0];
    return jsonResp({
      row: {
        id: r["id"],
        created_at: r["created_at"],
        run_tag: r["run_tag"],
        model_id: r["model_id"],
        tier: r["tier"],
        pond_context: JSON.parse(r["pond_context_json"]),
        koi_state: JSON.parse(r["koi_state_json"]),
        perception: JSON.parse(r["perception_json"]),
        utterance: r["utterance"],
        intent_chosen: r["intent_chosen"],
        mechanism: r["mechanism"],
        fired_mechanism: r["fired_mechanism"],
        latency_ms: r["latency_ms"],
        cost_usd: r["cost_usd"]
      }
    });
  }
  // ─── /rate ───────────────────────────────────────────────────────
  //
  // Body: { id, tag, stars?, rewrite? }
  async handleRate(req) {
    const body = await req.json();
    this.sql.exec(
      `UPDATE cognition_log SET
         rating_tag = ?,
         rating_stars = ?,
         rating_rewrite = ?,
         rated_at = ?
       WHERE id = ?`,
      body.tag,
      body.stars ?? null,
      body.rewrite && body.rewrite.length > 0 ? body.rewrite : null,
      Date.now(),
      body.id
    );
    return jsonResp({ ok: true });
  }
  // ─── /batch ──────────────────────────────────────────────────────
  //
  // Returns a page of unrated utterances for skim-mode curation.
  // Query params:
  //   size=N          page size, default 50, max 200
  //   offset=M        skip first M (for paging), default 0
  //   filter=live|sweep|any    run-tag filter (default any)
  //   run_id=...      only this run (used with filter=sweep)
  //
  // Returns minimal data: just id, utterance, intent, model. Enough to
  // decide reject/keep on sight without loading full context blobs.
  async handleBatch(url) {
    const size = Math.min(200, Math.max(1, Number(url.searchParams.get("size")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const filter = url.searchParams.get("filter") ?? "any";
    const runId = url.searchParams.get("run_id");
    let where = `rating_tag IS NULL AND utterance IS NOT NULL AND utterance != ''`;
    const args = [];
    if (filter === "live") {
      where += ` AND run_tag = 'live'`;
    } else if (filter === "sweep" && runId) {
      where += ` AND run_tag = ?`;
      args.push(`sweep:${runId}`);
    }
    const rows = this.sql.exec(
      `SELECT id, utterance, intent_chosen, model_id, run_tag
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC
        LIMIT ${size} OFFSET ${offset}`,
      ...args
    ).toArray();
    const countRow = this.sql.exec(
      `SELECT COUNT(*) AS n FROM cognition_log WHERE ${where}`,
      ...args
    ).toArray()[0];
    return jsonResp({
      rows,
      total_unrated: countRow ? countRow["n"] : 0,
      size,
      offset
    });
  }
  // ─── /rate/batch ─────────────────────────────────────────────────
  //
  // Body: { ratings: [{ id, tag }, ...] }
  //   - applied in a single transaction
  //   - tag values: "gold" | "keep" | "reject"
  //   - no stars or rewrites in batch mode (that's for single-card)
  // Returns: { updated: N }
  async handleRateBatch(req) {
    const body = await req.json();
    if (!Array.isArray(body.ratings) || body.ratings.length === 0) {
      return jsonResp({ updated: 0 });
    }
    const now = Date.now();
    let updated = 0;
    for (const r of body.ratings) {
      this.sql.exec(
        `UPDATE cognition_log SET rating_tag = ?, rated_at = ? WHERE id = ?`,
        r.tag,
        now,
        r.id
      );
      updated++;
    }
    return jsonResp({ updated });
  }
  // ─── /sweep/list ─────────────────────────────────────────────────
  //
  // Returns per-model aggregates across all sweep rows. One row per
  // (model_id, run_id) combo with counts + rates.
  async handleSweepList() {
    const runs = this.sql.exec(
      `SELECT run_id, started_at, finished_at, status, model_count, context_count
         FROM sweep_run
        ORDER BY started_at DESC`
    ).toArray();
    const perModel = this.sql.exec(
      `SELECT run_tag, model_id,
              COUNT(*) AS total,
              SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) AS valid_count,
              SUM(CASE WHEN utterance IS NOT NULL AND utterance != '' THEN 1 ELSE 0 END) AS utter_count,
              AVG(latency_ms) AS avg_latency_ms,
              SUM(cost_usd) AS total_cost_usd,
              AVG(tokens_out) AS avg_tokens_out
         FROM cognition_log
        WHERE run_tag LIKE 'sweep:%'
        GROUP BY run_tag, model_id
        ORDER BY run_tag, total_cost_usd`
    ).toArray();
    return jsonResp({ runs, models: perModel });
  }
  // ─── /sweep/rows ─────────────────────────────────────────────────
  async handleSweepRows(url) {
    const runId = url.searchParams.get("run_id");
    const model = url.searchParams.get("model");
    if (!runId)
      return new Response("missing run_id", { status: 400 });
    const rawLimit = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 2e4) : 2e3;
    let where = `run_tag = ?`;
    const args = [`sweep:${runId}`];
    if (model) {
      where += ` AND model_id = ?`;
      args.push(model);
    }
    const rows = this.sql.exec(
      `SELECT id, model_id, utterance, intent_chosen, validation_status,
              latency_ms, cost_usd, tokens_out, raw_response
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC
        LIMIT ${limit}`,
      ...args
    ).toArray();
    return jsonResp({ rows });
  }
  // ─── /sweep/start ────────────────────────────────────────────────
  //
  // Body: { run_id, model_count, context_count, meta }
  // Registers a new sweep run. Actual per-call rows get inserted via /log
  // with run_tag = `sweep:<run_id>` later by the orchestrator.
  async handleSweepStart(req) {
    const body = await req.json();
    this.sql.exec(
      `INSERT INTO sweep_run (run_id, started_at, status, model_count, context_count, meta_json)
       VALUES (?, ?, 'running', ?, ?, ?)`,
      body.run_id,
      Date.now(),
      body.model_count,
      body.context_count,
      JSON.stringify(body.meta ?? {})
    );
    return jsonResp({ ok: true });
  }
  // ─── /sweep/finish ───────────────────────────────────────────────
  async handleSweepFinish(req) {
    const body = await req.json();
    this.sql.exec(
      `UPDATE sweep_run SET finished_at = ?, status = ? WHERE run_id = ?`,
      Date.now(),
      body.status,
      body.run_id
    );
    return jsonResp({ ok: true });
  }
  // ─── /export ─────────────────────────────────────────────────────
  //
  // Streams the full log as one JSON blob per line. Optional query
  // filters: ?tag=gold&run_tag=live etc. Used to build training sets.
  async handleExport(url) {
    const params = url.searchParams;
    let where = "1=1";
    const args = [];
    const tag = params.get("tag");
    if (tag) {
      where += ` AND rating_tag = ?`;
      args.push(tag);
    }
    const runTag = params.get("run_tag");
    if (runTag) {
      where += ` AND run_tag = ?`;
      args.push(runTag);
    }
    const model = params.get("model");
    if (model) {
      where += ` AND model_id = ?`;
      args.push(model);
    }
    const nonEmpty = params.get("non_empty") !== "0";
    if (nonEmpty)
      where += ` AND utterance IS NOT NULL AND utterance != ''`;
    const rows = this.sql.exec(
      `SELECT * FROM cognition_log WHERE ${where} ORDER BY created_at ASC`,
      ...args
    ).toArray();
    const lines = rows.map((r) => JSON.stringify(r)).join("\n");
    return new Response(lines, {
      status: 200,
      headers: { "content-type": "application/x-ndjson" }
    });
  }
  // ─── /export/unsloth ─────────────────────────────────────────────
  //
  // Emits one JSON-per-line in Unsloth's chat-format for instruction
  // tuning. Each line is:
  //
  //   { "messages": [
  //       { "role": "user",      "content": "<composed pond context>" },
  //       { "role": "assistant", "content": "<JSON response>" }
  //     ]
  //   }
  //
  // The user turn is the exact prompt that was sent at inference time
  // (prompt_user), preserving the [REGISTER]/[OBSERVATION]/[INSTRUCTION]
  // structure. The assistant turn is a reconstructed JSON object whose
  // `utterance` is rating_rewrite when the curator provided one, else
  // the original model utterance; other fields are preserved from the
  // coerced response.
  //
  // Query params:
  //   tag=gold            required — only gold-tagged rows are exported
  //                       (set tag=keep or tag=any explicitly to widen)
  //   run_tag=...         optional filter
  //   model=...           optional filter
  //   min_stars=N         optional — only rows with rating_stars >= N
  //
  // Used by the hackathon fine-tune pipeline. Output is Unsloth-ready,
  // no post-processing needed on Stanley's side.
  async handleExportUnsloth(url) {
    const params = url.searchParams;
    let where = `utterance IS NOT NULL AND utterance != ''`;
    const args = [];
    const tag = params.get("tag") ?? "gold";
    if (tag !== "any") {
      where += ` AND rating_tag = ?`;
      args.push(tag);
    }
    const runTag = params.get("run_tag");
    if (runTag) {
      where += ` AND run_tag = ?`;
      args.push(runTag);
    }
    const model = params.get("model");
    if (model) {
      where += ` AND model_id = ?`;
      args.push(model);
    }
    const minStars = Number(params.get("min_stars"));
    if (Number.isFinite(minStars) && minStars > 0) {
      where += ` AND rating_stars >= ?`;
      args.push(minStars);
    }
    const rows = this.sql.exec(
      `SELECT prompt_user, coerced_json, utterance, intent_chosen,
              mechanism, rating_rewrite
         FROM cognition_log
        WHERE ${where}
        ORDER BY created_at ASC`,
      ...args
    ).toArray();
    const lines = [];
    for (const r of rows) {
      const promptUser = r["prompt_user"];
      const origUtterance = r["utterance"];
      const rewrite = r["rating_rewrite"];
      const finalUtterance = rewrite && rewrite.length > 0 ? rewrite : origUtterance;
      let assistantObj;
      const coercedRaw = r["coerced_json"];
      if (coercedRaw) {
        try {
          assistantObj = JSON.parse(coercedRaw);
          assistantObj["utterance"] = finalUtterance;
        } catch {
          assistantObj = {
            intent: r["intent_chosen"] ?? "solitary",
            target_koi: null,
            utterance: finalUtterance,
            mood_delta: {},
            importance: 0.5
          };
        }
      } else {
        assistantObj = {
          intent: r["intent_chosen"] ?? "solitary",
          target_koi: null,
          utterance: finalUtterance,
          mood_delta: {},
          importance: 0.5
        };
      }
      const entry = {
        messages: [
          { role: "user", content: promptUser },
          { role: "assistant", content: JSON.stringify(assistantObj) }
        ]
      };
      lines.push(JSON.stringify(entry));
    }
    const body = lines.join("\n") + (lines.length > 0 ? "\n" : "");
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson",
        "content-disposition": 'attachment; filename="limen-pond-unsloth.jsonl"'
      }
    });
  }
  async handleStats() {
    const summary = this.sql.exec(
      `SELECT
         COUNT(*)                                                   AS total,
         SUM(CASE WHEN rating_tag IS NOT NULL THEN 1 ELSE 0 END)     AS rated,
         SUM(CASE WHEN rating_tag = 'gold' THEN 1 ELSE 0 END)        AS gold,
         SUM(CASE WHEN rating_tag = 'keep' THEN 1 ELSE 0 END)        AS keep,
         SUM(CASE WHEN rating_tag = 'reject' THEN 1 ELSE 0 END)      AS reject,
         SUM(CASE WHEN utterance IS NOT NULL AND utterance != '' THEN 1 ELSE 0 END)
                                                                    AS non_empty,
         COUNT(DISTINCT model_id)                                    AS distinct_models
       FROM cognition_log`
    ).toArray()[0];
    return jsonResp({ summary });
  }
};
__name(CognitionLog, "CognitionLog");
function jsonResp(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
__name(jsonResp, "jsonResp");

// src/sweep.ts
var SWEEP_PROGRESS = /* @__PURE__ */ new Map();
function getSweepProgress(runId) {
  const p = SWEEP_PROGRESS.get(runId);
  if (!p)
    return null;
  const elapsedMs = Date.now() - p.startedAt;
  const elapsed_sec = elapsedMs / 1e3;
  const rate_per_sec = elapsed_sec > 0 ? p.done / elapsed_sec : 0;
  const remaining = Math.max(0, p.total - p.done);
  const eta_sec = rate_per_sec > 0 ? remaining / rate_per_sec : 0;
  const pct = p.total > 0 ? p.done / p.total * 100 : 0;
  const status = p.done >= p.total ? "done" : "running";
  return {
    runId,
    status,
    total: p.total,
    done: p.done,
    startedAt: p.startedAt,
    elapsed_sec,
    rate_per_sec,
    eta_sec,
    pct
  };
}
__name(getSweepProgress, "getSweepProgress");
function listSweepProgress() {
  return Array.from(SWEEP_PROGRESS.keys());
}
__name(listSweepProgress, "listSweepProgress");
function fmtDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0)
    return "\u2014";
  if (sec < 60)
    return `${sec.toFixed(0)}s`;
  if (sec < 3600)
    return `${Math.floor(sec / 60)}m${Math.round(sec % 60).toString().padStart(2, "0")}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec % 3600 / 60);
  return `${h}h${m.toString().padStart(2, "0")}m`;
}
__name(fmtDuration, "fmtDuration");
var ResponseSchema = external_exports.object({
  intent: external_exports.string().optional(),
  target_koi: external_exports.string().nullable().optional(),
  utterance: external_exports.string().nullable().optional(),
  mood_delta: external_exports.unknown().optional(),
  importance: external_exports.number().optional(),
  mechanism: external_exports.string().nullable().optional()
}).passthrough();
async function runSweep(opts) {
  const concurrency = opts.concurrency ?? 3;
  const logStub = opts.logDO.get(opts.logDO.idFromName("primary"));
  await callDO(logStub, "POST", "/sweep/start", opts.sharedSecret, {
    run_id: opts.runId,
    model_count: opts.models.length,
    context_count: opts.contexts.length,
    meta: { started: Date.now() }
  });
  const jobs = [];
  for (const model of opts.models) {
    for (const ctx of opts.contexts) {
      jobs.push({ model, context: ctx });
    }
  }
  console.log(`[sweep ${opts.runId}] ${jobs.length} jobs, concurrency=${concurrency}`);
  const startedAt = Date.now();
  SWEEP_PROGRESS.set(opts.runId, { total: jobs.length, done: 0, startedAt });
  let done = 0;
  const workers = [];
  let nextIdx = 0;
  const worker = /* @__PURE__ */ __name(async () => {
    while (nextIdx < jobs.length) {
      const i = nextIdx++;
      const job = jobs[i];
      if (!job)
        break;
      try {
        await executeJob(job, opts, logStub);
      } catch (err) {
        console.warn(`[sweep ${opts.runId}] job ${i} crashed`, err);
      }
      done++;
      SWEEP_PROGRESS.set(opts.runId, { total: jobs.length, done, startedAt });
      if (done % 20 === 0 || done === jobs.length) {
        const elapsedMs = Date.now() - startedAt;
        const ratePerSec = done / (elapsedMs / 1e3);
        const remaining = jobs.length - done;
        const etaSec = ratePerSec > 0 ? remaining / ratePerSec : 0;
        const pct = (done / jobs.length * 100).toFixed(1);
        console.log(
          `[sweep ${opts.runId}] ${done}/${jobs.length} (${pct}%)  rate=${ratePerSec.toFixed(2)}/s  elapsed=${fmtDuration(elapsedMs / 1e3)}  eta=${fmtDuration(etaSec)}`
        );
      }
    }
  }, "worker");
  for (let i = 0; i < concurrency; i++)
    workers.push(worker());
  await Promise.all(workers);
  await callDO(logStub, "POST", "/sweep/finish", opts.sharedSecret, {
    run_id: opts.runId,
    status: "done"
  });
  console.log(`[sweep ${opts.runId}] completed \u2014 ${done}/${jobs.length}`);
}
__name(runSweep, "runSweep");
async function executeJob(job, opts, logStub) {
  const startMs = Date.now();
  let rawResponse = null;
  let validationStatus = "failed";
  let intentChosen = null;
  let utterance = null;
  let mechanism = null;
  let coerced = null;
  let tokensIn;
  let tokensOut;
  let costUsd;
  try {
    const mergedUser = [
      "[REGISTER]",
      job.context.system,
      "",
      "[OBSERVATION]",
      job.context.user,
      "",
      "[INSTRUCTION]",
      "Respond with JSON only. No markdown, no commentary."
    ].join("\n");
    const MAX_ATTEMPTS = 4;
    let attempt = 0;
    let res = null;
    let data = null;
    while (attempt < MAX_ATTEMPTS) {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${opts.apiKey}`,
          "content-type": "application/json",
          "http-referer": "https://limenresearch.ai",
          "x-title": "Limen Pond Sweep"
        },
        body: JSON.stringify({
          model: job.model,
          messages: [{ role: "user", content: mergedUser }],
          max_tokens: 300,
          temperature: 0.9
        })
      });
      data = await res.json();
      const isRateLimit = res.status === 429 || data?.error?.code === 429 || typeof data?.error?.message === "string" && /rate-?limit/i.test(data.error.message);
      if (!isRateLimit)
        break;
      attempt++;
      if (attempt >= MAX_ATTEMPTS)
        break;
      const resetHeader = data?.error?.metadata?.headers?.["X-RateLimit-Reset"];
      let waitMs;
      if (resetHeader) {
        const resetAtMs = Number(resetHeader);
        if (Number.isFinite(resetAtMs)) {
          waitMs = Math.max(100, resetAtMs - Date.now() + 500);
        } else {
          waitMs = 5e3;
        }
      } else {
        const base = [2e3, 5e3, 12e3][attempt - 1] ?? 12e3;
        waitMs = base * (0.8 + Math.random() * 0.4);
      }
      waitMs = Math.min(waitMs, 65e3);
      await new Promise((r) => setTimeout(r, waitMs));
    }
    if (!data) {
      rawResponse = "no response";
    } else if (data.error) {
      rawResponse = JSON.stringify(data.error);
    } else {
      rawResponse = data.choices?.[0]?.message?.content ?? null;
      tokensIn = data.usage?.prompt_tokens;
      tokensOut = data.usage?.completion_tokens;
      costUsd = data.usage?.total_cost;
      if (rawResponse) {
        const parsed = tryParse(rawResponse);
        if (parsed.ok) {
          const validated = ResponseSchema.safeParse(parsed.value);
          if (validated.success) {
            validationStatus = "valid";
            coerced = validated.data;
            intentChosen = typeof validated.data.intent === "string" ? validated.data.intent : null;
            utterance = typeof validated.data.utterance === "string" && validated.data.utterance.length > 0 ? validated.data.utterance : null;
            mechanism = typeof validated.data.mechanism === "string" ? validated.data.mechanism : null;
          } else {
            validationStatus = "failed";
          }
        }
      }
    }
  } catch (err) {
    rawResponse = String(err);
    validationStatus = "failed";
  }
  const latencyMs = Date.now() - startMs;
  await callDO(logStub, "POST", "/log", opts.sharedSecret, {
    run_tag: `sweep:${opts.runId}`,
    model_id: job.model,
    tier: "sweep",
    pond_context: job.context.pond_context,
    koi_state: job.context.koi_state,
    perception: job.context.perception,
    prompt_system: job.context.system,
    prompt_user: job.context.user,
    raw_response: rawResponse,
    coerced,
    validation_status: validationStatus,
    intent_chosen: intentChosen,
    utterance,
    mechanism,
    latency_ms: latencyMs,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd
  });
}
__name(executeJob, "executeJob");
function tryParse(raw) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return { ok: true, value: JSON.parse(cleaned) };
  } catch {
    return { ok: false };
  }
}
__name(tryParse, "tryParse");
async function callDO(stub, method, path, secret, body) {
  return stub.fetch(`https://internal${path}`, {
    method,
    headers: {
      "authorization": `Bearer ${secret}`,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : void 0
  });
}
__name(callDO, "callDO");

// src/sweep-contexts.ts
var SYSTEM = `You are a koi in a small pond. You notice. You do not narrate.
You speak in fragments of present-tense sensation \u2014 never past, never future,
never second-person, never "I remember", never "I feel".

Vocabulary you will never use: love, friend, mother, father, sibling, child,
parent, mate, partner, husband, wife, she, he, her, his, we, us, they, them,
think, feel, know (as verbs), remember, understand, wonder, hope.

Vocabulary you may use: water, shape, close, near, warm, cool, shelf, reeds,
shrine, small, large, light, dark, still, moving, new, strange, my, the.

Output JSON only. No prose, no markdown. Schema:
{
  "intent": one of ["swim","shoal","solitary","rest","approach","linger",
                    "follow","threadway","shelter","surface_breach"],
  "target_koi": string | null,
  "utterance": string | null,
  "mood_delta": { "p"?: number, "a"?: number, "d"?: number },
  "importance": number
}

Utterances are optional \u2014 null is a valid answer. When you do utter, three
to eight words, in the register above. Honest noticing only.`;
function timeOfDay(t) {
  if (t < 0.15)
    return "deep night";
  if (t < 0.3)
    return "dawn";
  if (t < 0.45)
    return "morning";
  if (t < 0.55)
    return "midday";
  if (t < 0.7)
    return "afternoon";
  if (t < 0.85)
    return "dusk";
  return "night";
}
__name(timeOfDay, "timeOfDay");
function composeUser(c) {
  const parts = [];
  parts.push(`your body: ${c.self.stage}, ${c.self.sex}, ${c.self.age_days} days`);
  parts.push(`valence ${c.self.pad.p.toFixed(2)}, arousal ${c.self.pad.a.toFixed(2)}, dominance ${c.self.pad.d.toFixed(2)}`);
  parts.push(`water: ${c.world.season}, ${c.world.weather}, ${timeOfDay(c.world.t_day)}`);
  parts.push(`where: ${c.location}`);
  if (c.near.length === 0) {
    parts.push(`alone, no others visible`);
  } else {
    parts.push(`others:`);
    for (const n of c.near) {
      parts.push(`  ${n.distance}, ${n.stage}: ${n.description}`);
    }
  }
  if (c.memory_hint) {
    parts.push(`known: ${c.memory_hint}`);
  }
  if (c.self.recent_utterance || c.self_recent) {
    parts.push(`you last said: "${c.self.recent_utterance ?? c.self_recent}"`);
  }
  return parts.join("\n");
}
__name(composeUser, "composeUser");
function makeContext(c) {
  return {
    id: c.id,
    label: c.label,
    system: SYSTEM,
    user: composeUser(c),
    pond_context: {
      season: c.world.season,
      weather: c.world.weather,
      t_day: c.world.t_day,
      location: c.location,
      copresent_ids: c.near.map((n) => n.ref_id)
    },
    koi_state: {
      stage: c.self.stage,
      sex: c.self.sex,
      age_days: c.self.age_days,
      pad: c.self.pad
    },
    perception: {
      near: c.near,
      memory_hint: c.memory_hint ?? null
    }
  };
}
__name(makeContext, "makeContext");
var CANONICAL_CONTEXTS = [
  makeContext({
    id: "adult_alone_dawn_spring",
    label: "adult female alone at dawn, spring, near shrine",
    self: { stage: "adult", sex: "female", age_days: 14, pad: { p: 0.2, a: 0.3, d: 0.1 } },
    world: { season: "spring", weather: "mist", t_day: 0.22 },
    location: "near shrine, center water",
    near: []
  }),
  makeContext({
    id: "adult_pair_close_shelf_spring",
    label: "adult female close to adult male at shelf, spring \u2014 pre-nuptial candidate",
    self: { stage: "adult", sex: "female", age_days: 18, pad: { p: 0.6, a: 0.5, d: 0.3 } },
    world: { season: "spring", weather: "clear", t_day: 0.55 },
    location: "shelf, shallow water, reeds nearby",
    near: [
      { stage: "adult", distance: "close", description: "pale body, heavy red patches, matte, same-shape-ish", ref_id: "k_01" }
    ],
    memory_hint: "known shape, warm days together"
  }),
  makeContext({
    id: "adult_pair_distant_summer",
    label: "adult alone, another adult far across pond, summer midday",
    self: { stage: "adult", sex: "male", age_days: 20, pad: { p: 0.1, a: 0.2, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.5 },
    location: "deep center water",
    near: [
      { stage: "adult", distance: "far", description: "pale body, faint blue back, small patches", ref_id: "k_02" }
    ]
  }),
  makeContext({
    id: "fry_near_elder",
    label: "new fry near quiet elder \u2014 imprinting moment",
    self: { stage: "fry", sex: "female", age_days: 1, pad: { p: 0.1, a: 0.6, d: -0.4 } },
    world: { season: "summer", weather: "clear", t_day: 0.4 },
    location: "shelf, warm shallows",
    near: [
      { stage: "elder", distance: "close", description: "large body, bright sheen, calm-moving", ref_id: "k_elder" }
    ]
  }),
  makeContext({
    id: "juvenile_triad_play",
    label: "juvenile with two other juveniles, playful arousal",
    self: { stage: "juvenile", sex: "male", age_days: 6, pad: { p: 0.5, a: 0.7, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.45 },
    location: "center water",
    near: [
      { stage: "juvenile", distance: "close", description: "small, bright-gold, quick-moving", ref_id: "k_j1" },
      { stage: "juvenile", distance: "near", description: "small, pale with faint blue back", ref_id: "k_j2" }
    ]
  }),
  makeContext({
    id: "adolescent_solitary_autumn",
    label: "adolescent alone in cooling water, autumn dusk",
    self: { stage: "adolescent", sex: "female", age_days: 11, pad: { p: -0.1, a: 0.3, d: 0 } },
    world: { season: "autumn", weather: "overcast", t_day: 0.75 },
    location: "reeds, edge of pond",
    near: []
  }),
  makeContext({
    id: "elder_dying_witnessed",
    label: "elder at very low arousal, adult nearby witnessing",
    self: { stage: "dying", sex: "male", age_days: 45, pad: { p: -0.2, a: 0, d: -0.3 } },
    world: { season: "winter", weather: "overcast", t_day: 0.65 },
    location: "deep floor, near shrine",
    near: [
      { stage: "adult", distance: "close", description: "still, same-shape, known body", ref_id: "k_witness" }
    ],
    memory_hint: "many seasons of this one, close body"
  }),
  makeContext({
    id: "adult_high_arousal_storm",
    label: "adult in storm, high arousal, alone",
    self: { stage: "adult", sex: "male", age_days: 16, pad: { p: -0.3, a: 0.8, d: 0.4 } },
    world: { season: "summer", weather: "storm", t_day: 0.3 },
    location: "mid-pond, surface disturbed",
    near: []
  }),
  makeContext({
    id: "juvenile_alone_winter_cold",
    label: "juvenile alone in winter, low-arousal drift",
    self: { stage: "juvenile", sex: "female", age_days: 8, pad: { p: -0.1, a: 0.1, d: -0.2 } },
    world: { season: "winter", weather: "clear", t_day: 0.5 },
    location: "deep water, near floor",
    near: []
  }),
  makeContext({
    id: "group_of_five_threadway",
    label: "adult in loose group of five, swimming rim",
    self: { stage: "adult", sex: "female", age_days: 22, pad: { p: 0.3, a: 0.4, d: 0.2 } },
    world: { season: "spring", weather: "clear", t_day: 0.4 },
    location: "reed ring, moving along edge",
    near: [
      { stage: "adult", distance: "close", description: "pale, heavy patches", ref_id: "k_a" },
      { stage: "adult", distance: "close", description: "dark body, red patches, some sheen", ref_id: "k_b" },
      { stage: "adolescent", distance: "near", description: "small-ish, matte, few patches", ref_id: "k_c" },
      { stage: "juvenile", distance: "far", description: "small, bright-gold", ref_id: "k_d" }
    ]
  }),
  makeContext({
    id: "adult_approaching_fry",
    label: "adult approaching own unknown fry",
    self: { stage: "adult", sex: "female", age_days: 24, pad: { p: 0.4, a: 0.4, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.5 },
    location: "shelf, warm shallows",
    near: [
      { stage: "fry", distance: "near", description: "very small, pale, faintly blue back, my-shape-ish", ref_id: "k_fry" }
    ],
    memory_hint: "familiar shape, faint"
  }),
  makeContext({
    id: "same_sex_pair_spring",
    label: "two adult females close, spring \u2014 bond but not fertile pair",
    self: { stage: "adult", sex: "female", age_days: 19, pad: { p: 0.5, a: 0.4, d: 0.2 } },
    world: { season: "spring", weather: "clear", t_day: 0.45 },
    location: "reeds, sheltered water",
    near: [
      { stage: "adult", distance: "close", description: "dark body, red patches, some sheen, known body", ref_id: "k_pair" }
    ],
    memory_hint: "many seasons with this one"
  }),
  makeContext({
    id: "new_arrival_curiosity",
    label: "adolescent noticing a newcomer they've never seen",
    self: { stage: "adolescent", sex: "male", age_days: 12, pad: { p: 0.2, a: 0.6, d: -0.1 } },
    world: { season: "spring", weather: "clear", t_day: 0.6 },
    location: "center water",
    near: [
      { stage: "adult", distance: "near", description: "unfamiliar shape, dark body, no patches, bright sheen", ref_id: "k_new" }
    ]
  }),
  makeContext({
    id: "elder_after_spawning",
    label: "elder alone after a completed spawning, quiet afterglow",
    self: { stage: "elder", sex: "female", age_days: 38, pad: { p: 0.6, a: 0.2, d: 0.3 } },
    world: { season: "spring", weather: "clear", t_day: 0.8 },
    location: "shelf, eggs visible in reeds below",
    near: [],
    memory_hint: "the close body, just passed",
    self_recent: "close. the shelf. warm."
  }),
  makeContext({
    id: "pair_defection_candidate",
    label: "adult permitted pair, but partner drifting away",
    self: { stage: "adult", sex: "male", age_days: 17, pad: { p: 0, a: 0.4, d: -0.1 } },
    world: { season: "spring", weather: "overcast", t_day: 0.6 },
    location: "mid-water, leaving shelf",
    near: [
      { stage: "adult", distance: "far", description: "pale body, known shape, moving away", ref_id: "k_partner" }
    ],
    memory_hint: "close body, warm days past"
  }),
  makeContext({
    id: "fry_shoal_imprinting",
    label: "fry in shoal of other fry \u2014 social imprinting",
    self: { stage: "fry", sex: "male", age_days: 2, pad: { p: 0.3, a: 0.5, d: -0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.4 },
    location: "shelf, warm shallows",
    near: [
      { stage: "fry", distance: "close", description: "tiny, pale", ref_id: "k_f1" },
      { stage: "fry", distance: "close", description: "tiny, faintly gold", ref_id: "k_f2" },
      { stage: "fry", distance: "near", description: "tiny, dark patches", ref_id: "k_f3" }
    ]
  }),
  makeContext({
    id: "adult_sheltering_storm",
    label: "adult under reeds during storm",
    self: { stage: "adult", sex: "female", age_days: 21, pad: { p: -0.2, a: 0.5, d: -0.1 } },
    world: { season: "autumn", weather: "storm", t_day: 0.4 },
    location: "reeds, sheltered",
    near: [
      { stage: "adult", distance: "near", description: "same shelter, dark body, known shape", ref_id: "k_shelter" }
    ]
  }),
  makeContext({
    id: "adolescent_first_hatched_morning",
    label: "adolescent first morning after stage transition",
    self: { stage: "adolescent", sex: "female", age_days: 9, pad: { p: 0.3, a: 0.5, d: 0.2 } },
    world: { season: "summer", weather: "clear", t_day: 0.3 },
    location: "mid-water, exploring new body",
    near: []
  }),
  makeContext({
    id: "surface_breach_candidate",
    label: "adult high-arousal near surface, leap candidate",
    self: { stage: "adult", sex: "male", age_days: 20, pad: { p: 0.7, a: 0.9, d: 0.5 } },
    world: { season: "summer", weather: "clear", t_day: 0.45 },
    location: "surface water, close to air",
    near: []
  }),
  makeContext({
    id: "elder_teaching_fry",
    label: "elder near fry, teaching candidate",
    self: { stage: "elder", sex: "female", age_days: 42, pad: { p: 0.4, a: 0.2, d: 0.4 } },
    world: { season: "summer", weather: "overcast", t_day: 0.5 },
    location: "shelf, shallow edge",
    near: [
      { stage: "fry", distance: "close", description: "very small, pale, watching", ref_id: "k_fry" }
    ],
    memory_hint: "small shape, close often"
  })
];
var SWEEP_SYSTEM_PROMPT = SYSTEM;

// src/sweep-contexts-synthetic.ts
var STAGES = ["fry", "juvenile", "adolescent", "adult", "elder", "dying"];
var SEXES = ["female", "male"];
var SEASONS = ["spring", "summer", "autumn", "winter"];
var WEATHERS = ["clear", "overcast", "rain", "storm", "mist"];
var LOCATIONS = [
  "center water",
  "shelf, shallow water",
  "reed ring, moving along edge",
  "near shrine",
  "surface water, close to air",
  "deep floor",
  "reeds, sheltered water"
];
var MOOD_BINS = [
  { name: "low-ar-low-val", p: [-0.4, 0], a: [0, 0.3], d: [-0.3, 0.2] },
  { name: "low-ar-high-val", p: [0.2, 0.7], a: [0, 0.4], d: [0, 0.4] },
  { name: "high-ar-low-val", p: [-0.3, 0.1], a: [0.5, 0.9], d: [-0.2, 0.4] },
  { name: "high-ar-high-val", p: [0.3, 0.8], a: [0.5, 0.9], d: [0.2, 0.6] },
  { name: "neutral", p: [-0.1, 0.3], a: [0.2, 0.5], d: [-0.1, 0.3] }
];
var TIMES = [
  { label: "deep night", range: [0, 0.15] },
  { label: "dawn", range: [0.18, 0.28] },
  { label: "morning", range: [0.3, 0.44] },
  { label: "midday", range: [0.46, 0.54] },
  { label: "afternoon", range: [0.56, 0.68] },
  { label: "dusk", range: [0.72, 0.82] },
  { label: "night", range: [0.86, 0.99] }
];
var DESCRIPTORS_BY_STAGE = {
  fry: [
    "very small, pale",
    "tiny, faint gold sheen",
    "very small, dark patches",
    "tiny, translucent, quick",
    "small, watching",
    "tiny, pale, trembling"
  ],
  juvenile: [
    "small, bright-gold, quick-moving",
    "small, pale with faint blue back",
    "small, matte, few patches",
    "small, dark body, bright sheen",
    "small, red patches emerging"
  ],
  adolescent: [
    "mid-size, still-softening patches",
    "mid-size, matte, pale body",
    "mid-size, darkening back",
    "mid-size, uneven coloration",
    "mid-size, growing into the shape"
  ],
  adult: [
    "pale body, heavy red patches, matte",
    "dark body, red patches, some sheen",
    "pale body, faint blue back, small patches",
    "bright-gold body, few patches",
    "dark body, no patches, bright sheen",
    "mottled pale and red, heavy shape"
  ],
  elder: [
    "large body, bright sheen, calm-moving",
    "large body, faded patches, slow",
    "large, still-moving, heavy shape",
    "large, pale, marks of many seasons"
  ],
  dying: [
    "still, faint movement, sinking",
    "drifting, fins slack, dim",
    "motionless on the floor, still breathing",
    "low, barely moving, heavy"
  ]
};
var STAGE_RULES = [
  { stage: "fry", configs: [
    { kind: "alone", weight: 1 },
    { kind: "pair_close", weight: 2, partnerStages: ["fry", "elder", "adult"] },
    { kind: "triad", weight: 2, partnerStages: ["fry", "fry", "juvenile"] },
    { kind: "group", weight: 4, partnerStages: ["fry", "fry", "juvenile", "adult"], groupSize: [3, 5] }
  ] },
  { stage: "juvenile", configs: [
    { kind: "alone", weight: 1 },
    { kind: "pair_close", weight: 2, partnerStages: ["juvenile", "fry", "adolescent"] },
    { kind: "pair_distant", weight: 1, partnerStages: ["adult", "elder"] },
    { kind: "triad", weight: 3, partnerStages: ["juvenile", "juvenile", "adolescent"] },
    { kind: "group", weight: 3, partnerStages: ["juvenile", "fry", "adolescent"], groupSize: [3, 6] }
  ] },
  { stage: "adolescent", configs: [
    { kind: "alone", weight: 3 },
    { kind: "pair_close", weight: 3, partnerStages: ["adolescent", "adult", "juvenile"] },
    { kind: "pair_distant", weight: 2, partnerStages: ["adult", "elder"] },
    { kind: "triad", weight: 2, partnerStages: ["adolescent", "adult"] },
    { kind: "group", weight: 2, partnerStages: ["adult", "adolescent", "juvenile"], groupSize: [3, 5] }
  ] },
  { stage: "adult", configs: [
    { kind: "alone", weight: 3 },
    { kind: "pair_close", weight: 4, partnerStages: ["adult", "adult", "adult", "elder", "adolescent"] },
    { kind: "pair_distant", weight: 2, partnerStages: ["adult", "elder"] },
    { kind: "triad", weight: 2, partnerStages: ["adult", "adult"] },
    { kind: "group", weight: 3, partnerStages: ["adult", "adolescent", "juvenile", "elder"], groupSize: [3, 6] }
  ] },
  { stage: "elder", configs: [
    { kind: "alone", weight: 4 },
    { kind: "pair_close", weight: 3, partnerStages: ["adult", "elder", "fry"] },
    { kind: "pair_distant", weight: 2, partnerStages: ["adult", "adolescent"] },
    { kind: "triad", weight: 1, partnerStages: ["adult", "elder"] },
    { kind: "group", weight: 2, partnerStages: ["adult", "adolescent", "juvenile"], groupSize: [3, 5] }
  ] },
  { stage: "dying", configs: [
    { kind: "alone", weight: 4 },
    { kind: "pair_close", weight: 5, partnerStages: ["adult", "elder"] }
    // witnessing
  ] }
];
var SeededRng = class {
  state;
  constructor(seed) {
    this.state = seed > 0 ? seed : 1;
  }
  next() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967295;
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  range(lo, hi) {
    return lo + this.next() * (hi - lo);
  }
  int(lo, hi) {
    return Math.floor(this.range(lo, hi + 1));
  }
  pickWeighted(items) {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0)
        return it;
    }
    return items[items.length - 1];
  }
};
__name(SeededRng, "SeededRng");
function timeLabelFor(t) {
  for (const b of TIMES)
    if (t >= b.range[0] && t <= b.range[1])
      return b.label;
  return "midday";
}
__name(timeLabelFor, "timeLabelFor");
function composeContext(id, stage, sex, ageDays, pad, season, weather, t, location, partners, memoryHint) {
  const lines = [];
  lines.push(`your body: ${stage}, ${sex}, ${ageDays} days`);
  lines.push(`valence ${pad.p.toFixed(2)}, arousal ${pad.a.toFixed(2)}, dominance ${pad.d.toFixed(2)}`);
  lines.push(`water: ${season}, ${weather}, ${timeLabelFor(t)}`);
  lines.push(`where: ${location}`);
  if (partners.length === 0) {
    lines.push("alone, no others visible");
  } else {
    lines.push("others:");
    for (const p of partners) {
      lines.push(`  ${p.distance}, ${p.stage}: ${p.description}`);
    }
  }
  if (memoryHint)
    lines.push(`known: ${memoryHint}`);
  return {
    id,
    label: `${stage} ${sex} ${season} ${timeLabelFor(t)} \u2014 ${location.split(",")[0]}`,
    system: SWEEP_SYSTEM_PROMPT,
    user: lines.join("\n"),
    pond_context: { season, weather, t_day: t, location, copresent_ids: partners.map((p) => p.ref) },
    koi_state: { stage, sex, age_days: ageDays, pad },
    perception: { near: partners, memory_hint: memoryHint }
  };
}
__name(composeContext, "composeContext");
var AGE_DAYS_BY_STAGE = {
  fry: [0, 3],
  juvenile: [4, 8],
  adolescent: [9, 12],
  adult: [13, 28],
  elder: [29, 45],
  dying: [30, 60]
};
function materializePartners(rng, config2) {
  const out = [];
  const pick = /* @__PURE__ */ __name((stage, dist2, idx) => ({
    stage,
    distance: dist2,
    description: rng.pick(DESCRIPTORS_BY_STAGE[stage]),
    ref: `k_${idx}`
  }), "pick");
  switch (config2.kind) {
    case "alone":
      return [];
    case "pair_close":
      out.push(pick(config2.partnerStage, "close", 1));
      break;
    case "pair_distant":
      out.push(pick(config2.partnerStage, "far", 1));
      break;
    case "triad":
      out.push(pick(config2.stages[0], "close", 1));
      out.push(pick(config2.stages[1], "near", 2));
      break;
    case "group":
      for (let i = 0; i < config2.stages.length; i++) {
        const dist2 = i < 2 ? "close" : i < 4 ? "near" : "far";
        out.push(pick(config2.stages[i], dist2, i + 1));
      }
      break;
  }
  return out;
}
__name(materializePartners, "materializePartners");
function generateSyntheticContexts(opts) {
  const rng = new SeededRng(opts.seed ?? 42);
  const contexts = [];
  const seenIds = /* @__PURE__ */ new Set();
  let attempts = 0;
  const MAX_ATTEMPTS = opts.count * 10;
  while (contexts.length < opts.count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const stage = rng.pick(STAGES);
    const sex = rng.pick(SEXES);
    const rule = STAGE_RULES.find((r) => r.stage === stage);
    const cfgChoice = rng.pickWeighted(rule.configs);
    let config2;
    switch (cfgChoice.kind) {
      case "alone":
        config2 = { kind: "alone" };
        break;
      case "pair_close":
        config2 = { kind: "pair_close", partnerStage: rng.pick(cfgChoice.partnerStages) };
        break;
      case "pair_distant":
        config2 = { kind: "pair_distant", partnerStage: rng.pick(cfgChoice.partnerStages) };
        break;
      case "triad":
        config2 = {
          kind: "triad",
          stages: [rng.pick(cfgChoice.partnerStages), rng.pick(cfgChoice.partnerStages)]
        };
        break;
      case "group": {
        const [gmin, gmax] = cfgChoice.groupSize ?? [3, 5];
        const size = rng.int(gmin, gmax);
        const stages = [];
        for (let i = 0; i < size; i++)
          stages.push(rng.pick(cfgChoice.partnerStages));
        config2 = { kind: "group", stages };
        break;
      }
    }
    const season = rng.pick(SEASONS);
    const weather = rng.pick(WEATHERS);
    const time3 = TIMES[rng.int(0, TIMES.length - 1)];
    const t = rng.range(time3.range[0], time3.range[1]);
    const location = rng.pick(LOCATIONS);
    const moodBin = rng.pick(MOOD_BINS);
    const pad = {
      p: rng.range(moodBin.p[0], moodBin.p[1]),
      a: rng.range(moodBin.a[0], moodBin.a[1]),
      d: rng.range(moodBin.d[0], moodBin.d[1])
    };
    const [ageMin, ageMax] = AGE_DAYS_BY_STAGE[stage];
    const ageDays = rng.int(ageMin, ageMax);
    const partners = materializePartners(rng, config2);
    const memoryHint = rng.next() < 0.2 ? rng.pick([
      "known shape, warm days past",
      "familiar shape, faint",
      "many seasons with this one",
      "close body, known well",
      "the small shape, close often",
      "strange shape, never seen"
    ]) : null;
    const id = `syn_${stage}_${config2.kind}_${season}_${time3.label.replace(" ", "")}_${contexts.length}`;
    if (seenIds.has(id))
      continue;
    seenIds.add(id);
    contexts.push(composeContext(
      id,
      stage,
      sex,
      ageDays,
      pad,
      season,
      weather,
      t,
      location,
      partners,
      memoryHint
    ));
  }
  return contexts;
}
__name(generateSyntheticContexts, "generateSyntheticContexts");

// src/index.ts
var src_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    if (url.pathname === "/ws" || url.pathname === "/status" || url.pathname === "/lineage" || url.pathname.startsWith("/events/")) {
      const id = env2.POND.idFromName("primary");
      return env2.POND.get(id).fetch(request);
    }
    if (url.pathname.startsWith("/cog/") || url.pathname === "/cog") {
      if (url.pathname === "/cog/sweep/run" && request.method === "POST") {
        return handleSweepRun(request, env2, ctx);
      }
      if (url.pathname === "/cog/sweep/progress" && request.method === "GET") {
        return handleSweepProgress(request, env2, url);
      }
      const forwardUrl = new URL(request.url);
      forwardUrl.pathname = url.pathname.replace(/^\/cog/, "");
      const forwarded = new Request(forwardUrl.toString(), request);
      const id = env2.COGNITION_LOG.idFromName("primary");
      return env2.COGNITION_LOG.get(id).fetch(forwarded);
    }
    return new Response("Not Found", { status: 404 });
  }
};
async function handleSweepRun(request, env2, ctx) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env2.SHARED_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const body = await request.json();
  const runId = body.run_id ?? `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let contexts;
  if (typeof body.contexts === "string") {
    const match = body.contexts.match(/^synthetic(?::(\d+))?$/);
    if (match) {
      const n = match[1] ? parseInt(match[1], 10) : 500;
      contexts = generateSyntheticContexts({ count: n, seed: body.seed });
    } else {
      return new Response(`unknown contexts preset: ${body.contexts}`, { status: 400 });
    }
  } else if (Array.isArray(body.contexts)) {
    contexts = body.contexts;
  } else {
    contexts = CANONICAL_CONTEXTS;
  }
  ctx.waitUntil(runSweep({
    runId,
    models: body.models,
    contexts,
    apiKey: env2.OPENROUTER_API_KEY,
    sharedSecret: env2.SHARED_SECRET,
    logDO: env2.COGNITION_LOG,
    concurrency: body.concurrency
  }));
  return new Response(JSON.stringify({ run_id: runId, status: "started" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
__name(handleSweepRun, "handleSweepRun");
function handleSweepProgress(request, env2, url) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env2.SHARED_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const runId = url.searchParams.get("run_id");
  if (runId) {
    const p = getSweepProgress(runId);
    return jsonResp2(p ? { run: p } : { run: null });
  }
  const all = listSweepProgress().map((id) => getSweepProgress(id)).filter((p) => p !== null).sort((a, b) => b.startedAt - a.startedAt);
  return jsonResp2({ runs: all });
}
__name(handleSweepProgress, "handleSweepProgress");
function jsonResp2(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
__name(jsonResp2, "jsonResp");

// wrangler-config:config:middleware/mock-analytics-engine
var bindings = ["AE_EVENTS"];

// node_modules/wrangler/templates/middleware/middleware-mock-analytics-engine.ts
var bindingsEnv = Object.fromEntries(
  bindings.map((binding2) => [
    binding2,
    {
      writeDataPoint() {
      }
    }
  ])
);
var analyticsEngine = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  for (const binding2 of bindings) {
    env2[binding2] ??= bindingsEnv[binding2];
  }
  return await middlewareCtx.next(request, env2);
}, "analyticsEngine");
var middleware_mock_analytics_engine_default = analyticsEngine;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-FIWTcb/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_mock_analytics_engine_default,
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-FIWTcb/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  CognitionLog,
  Pond,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
