import assert from "node:assert/strict";
import test from "node:test";
import { createSourceRouter } from "../src/source-router.js";
import { SourceAccessError } from "../src/sources.js";

function record(source, id) {
  return Object.freeze({
    source,
    id,
    type: "document",
    title: id,
    url: `https://example.com/${id}`,
    text: id,
    author: null,
    publishedAt: null,
    contentHash: `sha256:${"0".repeat(64)}`,
    adapterVersion: "test",
    warnings: Object.freeze([]),
    metadata: Object.freeze({}),
    provenance: Object.freeze({
      retrievedAt: "2026-07-20T00:00:00.000Z",
      method: "fixture",
      authenticated: false,
      credentialed: false
    })
  });
}

function registry({ statuses, read = {}, search = {} }) {
  return {
    list: () => statuses.map((item) => item.id),
    doctor: () => statuses,
    async read(id, input) {
      if (!read[id]) throw new Error(`Unexpected read from ${id}`);
      return read[id](input);
    },
    async search(id, input) {
      if (!search[id]) throw new Error(`Unexpected search from ${id}`);
      return search[id](input);
    }
  };
}

function status(id, state, capabilities) {
  return Object.freeze({
    id,
    status: state,
    capabilities: Object.freeze(capabilities),
    authentication: "none",
    message: `${id} ${state}`
  });
}

test("doctor selects the first provider with the requested capability", () => {
  const router = createSourceRouter({
    registry: registry({
      statuses: [
        status("primary", "partial", { read: false, search: true }),
        status("fallback", "ready", { read: true, search: false })
      ]
    }),
    routes: {
      article: { operation: "read", providers: [{ id: "primary" }, { id: "fallback" }] }
    }
  });
  assert.deepEqual(router.list(), ["article"]);
  assert.deepEqual(router.doctor(), [{
    id: "article",
    operation: "read",
    status: "ready",
    selectedProvider: "fallback",
    providers: [
      {
        id: "primary",
        status: "partial",
        available: false,
        reason: "missing_capability",
        authentication: "none",
        message: "primary partial"
      },
      {
        id: "fallback",
        status: "ready",
        available: true,
        reason: null,
        authentication: "none",
        message: "fallback ready"
      }
    ]
  }]);
});

test("route skips unavailable providers before dispatch", async () => {
  const calls = [];
  const router = createSourceRouter({
    registry: registry({
      statuses: [
        status("primary", "missing_credentials", { read: false }),
        status("public", "ready", { read: true })
      ],
      read: {
        public(input) {
          calls.push(input);
          return [record("public", "ok")];
        }
      }
    }),
    routes: {
      article: { operation: "read", providers: [{ id: "primary" }, { id: "public" }] }
    }
  });
  const result = await router.route("article", "https://example.com");
  assert.equal(result.provider, "public");
  assert.equal(result.records[0].id, "ok");
  assert.deepEqual(result.attempts, [
    { provider: "primary", state: "missing_credentials", errorCode: null },
    { provider: "public", state: "succeeded", errorCode: null }
  ]);
  assert.deepEqual(calls, ["https://example.com"]);
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.records));
});

test("runtime fallback happens only for an explicitly allowed error code", async () => {
  const router = createSourceRouter({
    registry: registry({
      statuses: [status("primary", "ready", { search: true }), status("secondary", "ready", { search: true })],
      search: {
        primary() {
          throw new SourceAccessError("SOURCE_QUOTA_EXCEEDED", "quota");
        },
        secondary() {
          return [record("secondary", "result")];
        }
      }
    }),
    routes: {
      research: {
        operation: "search",
        providers: [
          { id: "primary", fallbackOn: ["SOURCE_QUOTA_EXCEEDED"] },
          { id: "secondary" }
        ]
      }
    }
  });
  const result = await router.route("research", { query: "bounded crawling" });
  assert.equal(result.provider, "secondary");
  assert.deepEqual(result.attempts, [
    { provider: "primary", state: "fallback", errorCode: "SOURCE_QUOTA_EXCEEDED" },
    { provider: "secondary", state: "succeeded", errorCode: null }
  ]);
});

test("authentication and unexpected errors do not silently change providers", async () => {
  let secondaryCalls = 0;
  const router = createSourceRouter({
    registry: registry({
      statuses: [status("primary", "ready", { read: true }), status("secondary", "ready", { read: true })],
      read: {
        primary() {
          throw new SourceAccessError("SOURCE_AUTH_FAILED", "credential rejected");
        },
        secondary() {
          secondaryCalls += 1;
          return [record("secondary", "unexpected")];
        }
      }
    }),
    routes: {
      social: { operation: "read", providers: [{ id: "primary" }, { id: "secondary" }] }
    }
  });
  await assert.rejects(() => router.route("social", "post-1"), { code: "SOURCE_AUTH_FAILED" });
  assert.equal(secondaryCalls, 0);
});

test("unavailable routes return bounded attempt diagnostics", async () => {
  const router = createSourceRouter({
    registry: registry({ statuses: [status("only", "unavailable", { read: false })] }),
    routes: { article: { operation: "read", providers: [{ id: "only" }, { id: "absent" }] } }
  });
  await assert.rejects(
    () => router.route("article", "https://example.com"),
    (error) => {
      assert.equal(error.code, "SOURCE_ROUTE_UNAVAILABLE");
      assert.deepEqual(error.details.attempts, [
        { provider: "only", state: "unavailable", errorCode: null },
        { provider: "absent", state: "unknown_provider", errorCode: null }
      ]);
      return true;
    }
  );
});

test("route definitions reject accessors, duplicates, and unknown keys", () => {
  const sourceRegistry = registry({ statuses: [] });
  assert.throws(() => createSourceRouter({
    registry: sourceRegistry,
    routes: { bad: { operation: "read", providers: [{ id: "a" }, { id: "a" }] } }
  }), /duplicate provider/);
  assert.throws(() => createSourceRouter({
    registry: sourceRegistry,
    routes: { bad: { operation: "write", providers: [{ id: "a" }] } }
  }), /operation must be/);
  assert.throws(() => createSourceRouter({
    registry: sourceRegistry,
    routes: { bad: { operation: "read", providers: [{ id: "a", implicitCookies: true }] } }
  }), /Unknown route 'bad' provider 0 option/);
  assert.throws(() => createSourceRouter({
    registry: sourceRegistry,
    routes: { bad: { operation: "read", providers: [{ id: "a", fallbackOn: ["SOURCE_AUTH_FAILED"] }] } }
  }), /non-fallbackable code/);
  const route = {};
  Object.defineProperty(route, "operation", { enumerable: true, get() { return "read"; } });
  Object.defineProperty(route, "providers", { enumerable: true, value: [{ id: "a" }] });
  assert.throws(() => createSourceRouter({ registry: sourceRegistry, routes: { bad: route } }), /data property/);
  const providers = [];
  Object.defineProperty(providers, "0", { enumerable: true, get() { throw new Error("must not execute"); } });
  providers.length = 1;
  assert.throws(
    () => createSourceRouter({ registry: sourceRegistry, routes: { bad: { operation: "read", providers } } }),
    /data property/
  );
});
