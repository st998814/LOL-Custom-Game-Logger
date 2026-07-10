const fs = require("fs");
const path = require("path");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function commonDirPrefix(paths) {
  if (!paths.length) return "";
  const splitPaths = paths.map((p) => p.split("/"));
  const prefix = [];
  for (let i = 0; ; i += 1) {
    const segment = splitPaths[0][i];
    if (segment === undefined) break;
    if (splitPaths.every((parts) => parts[i] === segment)) {
      prefix.push(segment);
    } else {
      break;
    }
  }
  return prefix.length ? `${prefix.join("/")}/` : "";
}

function getExtensionGroup(filePath) {
  const base = path.basename(filePath);
  if (/(\.test\.|\.spec\.)/.test(base) || /^test_/.test(base) || /(_test\.|Test\.|Tests\.)/.test(base)) {
    return "test";
  }
  if (/\.config\./.test(base) || ["package.json", "tsconfig.json", "pyproject.toml"].includes(base)) {
    return "config";
  }
  const ext = path.extname(base).replace(/^\./, "");
  return ext || "root";
}

function groupNameForPath(filePath, prefix, flatMode) {
  if (flatMode) return getExtensionGroup(filePath);
  const remaining = prefix && filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
  const parts = remaining.split("/").filter(Boolean);
  if (parts.length <= 1) return "root";
  return parts[0];
}

function classifyDirectory(groupName) {
  const patterns = [
    { label: "api", values: ["routes", "api", "controllers", "endpoints", "handlers", "serializers", "controller", "routers", "blueprints"] },
    { label: "service", values: ["services", "core", "lib", "domain", "logic", "signals", "internal", "composables", "mailers", "jobs", "channels", "lcu"] },
    { label: "data", values: ["models", "db", "data", "persistence", "repository", "entities", "migrations", "entity", "sql", "database", "schema"] },
    { label: "ui", values: ["components", "views", "pages", "ui", "layouts", "screens"] },
    { label: "middleware", values: ["middleware", "plugins", "interceptors", "guards"] },
    { label: "utility", values: ["utils", "helpers", "common", "shared", "tools", "templatetags", "pkg"] },
    { label: "config", values: ["config", "constants", "env", "settings", "management", "commands"] },
    { label: "test", values: ["__tests__", "test", "tests", "spec", "specs"] },
    { label: "types", values: ["types", "interfaces", "schemas", "contracts", "dtos", "dto", "request", "response"] },
    { label: "hooks", values: ["hooks"] },
    { label: "state", values: ["store", "state", "reducers", "actions", "slices"] },
    { label: "assets", values: ["assets", "static", "public"] },
    { label: "entry", values: ["cmd", "bin"] },
    { label: "documentation", values: ["docs", "documentation", "wiki"] },
    { label: "infrastructure", values: ["deploy", "deployment", "infra", "infrastructure", "k8s", "kubernetes", "helm", "charts", "terraform", "tf", "docker"] },
    { label: "ci-cd", values: [".github", ".gitlab", ".circleci"] },
  ];

  const lower = groupName.toLowerCase();
  for (const pattern of patterns) {
    if (pattern.values.includes(lower)) return pattern.label;
  }
  return "unclassified";
}

function classifyFile(filePath) {
  const base = path.basename(filePath);
  if (/(\.test\.|\.spec\.)/.test(base) || /^test_/.test(base) || /(_test\.go|Test\.java|_spec\.rb|Test\.php|Tests\.cs)$/.test(base)) return "test";
  if (base.endsWith(".d.ts")) return "types";
  if (["index.ts", "index.js", "__init__.py"].includes(base)) return "entry";
  if (base === "manage.py") return "entry";
  if (["wsgi.py", "asgi.py"].includes(base)) return "config";
  if (base === "config.ru") return "entry";
  if (["Application.java", "Program.cs"].includes(base)) return "entry";
  if (["Cargo.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle", "composer.json"].includes(base)) return "config";
  if (base === "Dockerfile" || /^docker-compose\./.test(base)) return "infrastructure";
  if (base === "Makefile") return "infrastructure";
  if (filePath.startsWith(".github/workflows/") || base === ".gitlab-ci.yml" || base === "Jenkinsfile") return "ci-cd";
  if (/\.(tf|tfvars)$/.test(base)) return "infrastructure";
  if (base.endsWith(".sql")) return "data";
  if (/\.(graphql|gql|proto)$/.test(base)) return "types";
  if (/\.(md|rst)$/.test(base)) return "documentation";
  return null;
}

try {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) fail("Usage: node ua-arch-analyze.js <input.json> <output.json>");

  const input = readJson(inputPath);
  const fileNodes = input.fileNodes || [];
  const importEdges = input.importEdges || [];
  const allEdges = input.allEdges || [];

  const filePathById = new Map(fileNodes.map((node) => [node.id, node.filePath]));
  const typeById = new Map(fileNodes.map((node) => [node.id, node.type]));
  const allPaths = fileNodes.map((node) => node.filePath).filter(Boolean);
  const prefix = commonDirPrefix(allPaths);
  const hasAnySubdir = allPaths.some((p) => p.includes("/"));
  const flatMode = hasAnySubdir && allPaths.every((p) => {
    const remaining = prefix && p.startsWith(prefix) ? p.slice(prefix.length) : p;
    return !remaining.includes("/");
  });

  const directoryGroups = {};
  const groupById = {};
  for (const node of fileNodes) {
    const group = groupNameForPath(node.filePath, prefix, flatMode);
    if (!directoryGroups[group]) directoryGroups[group] = [];
    directoryGroups[group].push(node.id);
    groupById[node.id] = group;
  }

  const nodeTypeGroups = {};
  for (const node of fileNodes) {
    if (!nodeTypeGroups[node.type]) nodeTypeGroups[node.type] = [];
    nodeTypeGroups[node.type].push(node.id);
  }

  const fileFanIn = {};
  const fileFanOut = {};
  for (const node of fileNodes) {
    fileFanIn[node.id] = 0;
    fileFanOut[node.id] = 0;
  }

  const groupImportsFrom = {};
  const groupImportedBy = {};
  const interGroupMap = new Map();
  const groupTotalEdges = {};
  const groupInternalEdges = {};

  for (const edge of importEdges) {
    if (!filePathById.has(edge.source) || !filePathById.has(edge.target)) continue;
    fileFanOut[edge.source] += 1;
    fileFanIn[edge.target] += 1;

    const fromGroup = groupById[edge.source];
    const toGroup = groupById[edge.target];
    if (!groupImportsFrom[fromGroup]) groupImportsFrom[fromGroup] = new Set();
    if (!groupImportedBy[toGroup]) groupImportedBy[toGroup] = new Set();
    groupImportsFrom[fromGroup].add(toGroup);
    groupImportedBy[toGroup].add(fromGroup);

    const key = `${fromGroup}=>${toGroup}`;
    interGroupMap.set(key, (interGroupMap.get(key) || 0) + 1);

    groupTotalEdges[fromGroup] = (groupTotalEdges[fromGroup] || 0) + 1;
    groupTotalEdges[toGroup] = (groupTotalEdges[toGroup] || 0) + 1;
    if (fromGroup === toGroup) {
      groupInternalEdges[fromGroup] = (groupInternalEdges[fromGroup] || 0) + 1;
    }
  }

  const directoryAdjacency = {};
  for (const group of Object.keys(directoryGroups)) {
    directoryAdjacency[group] = {
      importsFromGroups: Array.from(groupImportsFrom[group] || []).sort(),
      importedByGroups: Array.from(groupImportedBy[group] || []).sort(),
    };
  }

  const crossCategoryMap = new Map();
  for (const edge of allEdges) {
    if (!typeById.has(edge.source) || !typeById.has(edge.target)) continue;
    const fromType = typeById.get(edge.source);
    const toType = typeById.get(edge.target);
    const key = `${fromType}=>${toType}=>${edge.type}`;
    crossCategoryMap.set(key, (crossCategoryMap.get(key) || 0) + 1);
  }

  const crossCategoryEdges = Array.from(crossCategoryMap.entries()).map(([key, count]) => {
    const [fromType, toType, edgeType] = key.split("=>");
    return { fromType, toType, edgeType, count };
  }).sort((a, b) => a.fromType.localeCompare(b.fromType) || a.toType.localeCompare(b.toType) || a.edgeType.localeCompare(b.edgeType));

  const interGroupImports = Array.from(interGroupMap.entries()).map(([key, count]) => {
    const [from, to] = key.split("=>");
    return { from, to, count };
  }).sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.count - b.count);

  const intraGroupDensity = {};
  for (const group of Object.keys(directoryGroups)) {
    const internalEdges = groupInternalEdges[group] || 0;
    const totalEdges = groupTotalEdges[group] || 0;
    intraGroupDensity[group] = {
      internalEdges,
      totalEdges,
      density: totalEdges ? Number((internalEdges / totalEdges).toFixed(4)) : 0,
    };
  }

  const patternMatches = {};
  for (const group of Object.keys(directoryGroups)) {
    patternMatches[group] = classifyDirectory(group);
  }

  for (const node of fileNodes) {
    const filePattern = classifyFile(node.filePath);
    if (filePattern && patternMatches[groupById[node.id]] === "unclassified") {
      patternMatches[groupById[node.id]] = filePattern;
    }
  }

  const infraFiles = [];
  let hasDockerfile = false;
  let hasCompose = false;
  let hasK8s = false;
  let hasTerraform = false;
  let hasCI = false;
  for (const node of fileNodes) {
    const fp = node.filePath;
    const base = path.basename(fp);
    const lower = fp.toLowerCase();
    const isDockerfile = base === "Dockerfile" || /^dockerfile\./i.test(base);
    const isCompose = /^docker-compose(\..+)?\.(yml|yaml)$/i.test(base);
    const isK8sFile = /(^|\/)(k8s|kubernetes|helm|charts)\//i.test(fp) || /(deployment|service|ingress)\.ya?ml$/i.test(base);
    const isTf = /\.(tf|tfvars)$/.test(base) || /terraform/i.test(fp);
    const isCi = fp.startsWith(".github/workflows/") || base === ".gitlab-ci.yml" || base === "Jenkinsfile";
    if (isDockerfile || isCompose || isK8sFile || isTf || isCi || lower.includes("docker") || lower.includes("infra")) {
      infraFiles.push(fp);
    }
    hasDockerfile ||= isDockerfile;
    hasCompose ||= isCompose;
    hasK8s ||= isK8sFile;
    hasTerraform ||= isTf;
    hasCI ||= isCi;
  }

  const schemaFiles = [];
  const migrationFiles = [];
  const dataModelFiles = [];
  const apiHandlerFiles = [];
  for (const node of fileNodes) {
    const fp = node.filePath;
    const base = path.basename(fp);
    const tags = new Set(node.tags || []);
    if (node.type === "schema" || /\.(graphql|gql|proto|prisma)$/.test(base) || base.endsWith(".sql")) schemaFiles.push(fp);
    if (/migrations?\//i.test(fp) || base.endsWith(".sql")) migrationFiles.push(fp);
    if (tags.has("data-model") || /(^|\/)(models|model|data|db|prisma)\//i.test(fp) || node.type === "table" || node.type === "schema") dataModelFiles.push(fp);
    if (tags.has("api-handler") || /(^|\/)(routes|route|controllers|controller|handlers)\//i.test(fp) || node.type === "endpoint") apiHandlerFiles.push(fp);
  }

  const docGroups = new Set();
  for (const node of fileNodes) {
    const fp = node.filePath.toLowerCase();
    const base = path.basename(fp);
    if (node.type === "document" || base === "readme.md" || fp.endsWith(".md") || fp.endsWith(".rst")) {
      const group = groupById[node.id];
      docGroups.add(group);
    }
  }
  const allGroups = Object.keys(directoryGroups);
  const undocumentedGroups = allGroups.filter((group) => !docGroups.has(group));

  const dependencyDirection = [];
  const pairCounts = new Map();
  for (const { from, to, count } of interGroupImports) {
    if (from === to) continue;
    pairCounts.set(`${from}=>${to}`, count);
  }
  const seenPairs = new Set();
  for (const key of pairCounts.keys()) {
    const [a, b] = key.split("=>");
    const pairKey = [a, b].sort().join("<=>");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    const ab = pairCounts.get(`${a}=>${b}`) || 0;
    const ba = pairCounts.get(`${b}=>${a}`) || 0;
    if (ab === ba) continue;
    if (ab > ba) {
      dependencyDirection.push({ dependent: a, dependsOn: b });
    } else {
      dependencyDirection.push({ dependent: b, dependsOn: a });
    }
  }
  dependencyDirection.sort((x, y) => x.dependent.localeCompare(y.dependent) || x.dependsOn.localeCompare(y.dependsOn));

  const result = {
    scriptCompleted: true,
    commonPrefix: prefix,
    directoryGroups,
    nodeTypeGroups,
    directoryAdjacency,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology: {
      hasDockerfile,
      hasCompose,
      hasK8s,
      hasTerraform,
      hasCI,
      infraFiles: Array.from(new Set(infraFiles)).sort(),
    },
    dataPipeline: {
      schemaFiles: Array.from(new Set(schemaFiles)).sort(),
      migrationFiles: Array.from(new Set(migrationFiles)).sort(),
      dataModelFiles: Array.from(new Set(dataModelFiles)).sort(),
      apiHandlerFiles: Array.from(new Set(apiHandlerFiles)).sort(),
    },
    docCoverage: {
      groupsWithDocs: docGroups.size,
      totalGroups: allGroups.length,
      coverageRatio: allGroups.length ? Number((docGroups.size / allGroups.length).toFixed(4)) : 0,
      undocumentedGroups,
    },
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup: Object.fromEntries(Object.entries(directoryGroups).map(([group, ids]) => [group, ids.length])),
      nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([type, ids]) => [type, ids.length])),
    },
    fileFanIn,
    fileFanOut,
  };

  writeJson(outputPath, result);
  process.exit(0);
} catch (error) {
  fail(error && error.stack ? error.stack : String(error));
}
