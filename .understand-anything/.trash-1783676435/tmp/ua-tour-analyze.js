const fs = require('fs');

function fatal(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function basename(filePath = '') {
  const normalized = String(filePath).replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : normalized;
}

function isRootOrOneLevel(filePath = '') {
  const normalized = String(filePath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized) return false;
  const depth = normalized.split('/').length;
  return depth <= 2;
}

function topPercentThreshold(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * percentile) - 1);
  return sorted[index];
}

function bottomPercentThreshold(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * percentile));
  return sorted[index];
}

function isCodeNode(node) {
  return node.type === 'file' && /\.(ts|tsx|js|jsx|py|rs|go|java|cs|php|swift|kt|cpp|c)$/i.test(node.filePath || node.name || '');
}

function edgeKey(a, b) {
  return `${a}=>${b}`;
}

try {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    fatal('Usage: node ua-tour-analyze.js <input.json> <output.json>');
  }

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const nodes = Array.isArray(input.nodes) ? input.nodes : [];
  const edges = Array.isArray(input.edges) ? input.edges : [];
  const layers = Array.isArray(input.layers) ? input.layers : [];

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const fanIn = new Map(nodes.map((node) => [node.id, 0]));
  const fanOut = new Map(nodes.map((node) => [node.id, 0]));
  const importAdj = new Map(nodes.map((node) => [node.id, []]));
  const connectionSets = new Map(nodes.map((node) => [node.id, new Set()]));
  const directedPairs = new Set();

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    fanOut.set(edge.source, (fanOut.get(edge.source) || 0) + 1);
    fanIn.set(edge.target, (fanIn.get(edge.target) || 0) + 1);
    connectionSets.get(edge.source).add(edge.target);
    connectionSets.get(edge.target).add(edge.source);
    if (edge.type === 'imports' || edge.type === 'calls') {
      importAdj.get(edge.source).push(edge.target);
      directedPairs.add(edgeKey(edge.source, edge.target));
    }
  }

  const fanInRanking = nodes
    .map((node) => ({ id: node.id, fanIn: fanIn.get(node.id) || 0, name: node.name }))
    .sort((a, b) => b.fanIn - a.fanIn || a.name.localeCompare(b.name))
    .slice(0, 20);

  const fanOutRanking = nodes
    .map((node) => ({ id: node.id, fanOut: fanOut.get(node.id) || 0, name: node.name }))
    .sort((a, b) => b.fanOut - a.fanOut || a.name.localeCompare(b.name))
    .slice(0, 20);

  const fanOutValues = nodes.map((node) => fanOut.get(node.id) || 0);
  const fanInValues = nodes.map((node) => fanIn.get(node.id) || 0);
  const highFanOutThreshold = topPercentThreshold(fanOutValues, 0.9);
  const lowFanInThreshold = bottomPercentThreshold(fanInValues, 0.25);
  const entryFileNames = new Set([
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js',
    'mod.rs', 'main.go', 'main.py', 'main.rs', 'manage.py', 'app.py', 'wsgi.py', 'asgi.py',
    'run.py', '__main__.py', 'Application.java', 'Main.java', 'Program.cs', 'config.ru',
    'index.php', 'App.swift', 'Application.kt', 'main.cpp', 'main.c'
  ]);

  const entryPointCandidates = nodes
    .map((node) => {
      let score = 0;
      const filePath = node.filePath || node.name || '';
      const base = basename(filePath);
      if (node.type === 'document') {
        if (filePath === 'README.md') score += 5;
        else if (/^[^/]+\.md$/i.test(filePath)) score += 2;
      }
      if (isCodeNode(node)) {
        if (entryFileNames.has(base)) score += 3;
        if (isRootOrOneLevel(filePath)) score += 1;
        if ((fanOut.get(node.id) || 0) >= highFanOutThreshold && highFanOutThreshold > 0) score += 1;
        if ((fanIn.get(node.id) || 0) <= lowFanInThreshold) score += 1;
      }
      return { id: node.id, score, name: node.name, summary: node.summary || '' };
    })
    .filter((node) => node.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);

  const topCodeEntry = entryPointCandidates.find((candidate) => {
    const node = nodeMap.get(candidate.id);
    return node && isCodeNode(node);
  });

  const bfsTraversal = { startNode: null, order: [], depthMap: {}, byDepth: {} };
  if (topCodeEntry) {
    const queue = [topCodeEntry.id];
    const visited = new Set([topCodeEntry.id]);
    bfsTraversal.startNode = topCodeEntry.id;
    bfsTraversal.depthMap[topCodeEntry.id] = 0;

    while (queue.length) {
      const current = queue.shift();
      const depth = bfsTraversal.depthMap[current];
      bfsTraversal.order.push(current);
      if (!bfsTraversal.byDepth[depth]) bfsTraversal.byDepth[depth] = [];
      bfsTraversal.byDepth[depth].push(current);

      for (const neighbor of importAdj.get(current) || []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        bfsTraversal.depthMap[neighbor] = depth + 1;
        queue.push(neighbor);
      }
    }
  }

  function mapNonCode(types) {
    return nodes
      .filter((node) => types.includes(node.type))
      .map((node) => ({ id: node.id, name: node.name, type: node.type, summary: node.summary || '' }));
  }

  const nonCodeFiles = {
    documentation: mapNonCode(['document']),
    infrastructure: mapNonCode(['service', 'pipeline', 'resource']),
    data: mapNonCode(['table', 'schema', 'endpoint']),
    config: mapNonCode(['config'])
  };

  const seedClusters = [];
  const seenPairClusters = new Set();
  for (const edge of edges) {
    if (edge.type !== 'imports' && edge.type !== 'calls') continue;
    const reverseKey = edgeKey(edge.target, edge.source);
    const forwardKey = edgeKey(edge.source, edge.target);
    if (!directedPairs.has(reverseKey)) continue;
    const pair = [edge.source, edge.target].sort();
    const pairKey = pair.join('|');
    if (seenPairClusters.has(pairKey)) continue;
    seenPairClusters.add(pairKey);
    seedClusters.push(new Set(pair));
  }

  const expandedClusters = [];
  for (const seed of seedClusters) {
    let changed = true;
    const cluster = new Set(seed);
    while (changed && cluster.size < 5) {
      changed = false;
      for (const node of nodes) {
        if (cluster.has(node.id)) continue;
        let connections = 0;
        for (const member of cluster) {
          if (connectionSets.get(node.id).has(member)) connections += 1;
          if (connections >= 2) break;
        }
        if (connections >= 2) {
          cluster.add(node.id);
          changed = true;
          if (cluster.size >= 5) break;
        }
      }
    }
    const sortedNodes = [...cluster].sort();
    let edgeCount = 0;
    for (const source of sortedNodes) {
      for (const target of sortedNodes) {
        if (source !== target && connectionSets.get(source).has(target)) edgeCount += 1;
      }
    }
    expandedClusters.push({ nodes: sortedNodes, edgeCount });
  }

  const uniqueClusters = [];
  const seenClusterKeys = new Set();
  for (const cluster of expandedClusters.sort((a, b) => b.edgeCount - a.edgeCount || b.nodes.length - a.nodes.length)) {
    const key = cluster.nodes.join('|');
    if (seenClusterKeys.has(key)) continue;
    seenClusterKeys.add(key);
    uniqueClusters.push(cluster);
    if (uniqueClusters.length >= 10) break;
  }

  const nodeSummaryIndex = {};
  for (const node of nodes) {
    nodeSummaryIndex[node.id] = {
      name: node.name,
      type: node.type,
      summary: node.summary || ''
    };
  }

  const output = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal,
    nonCodeFiles,
    clusters: uniqueClusters,
    layers: {
      count: layers.length,
      list: layers.map((layer) => ({ id: layer.id, name: layer.name, description: layer.description }))
    },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  process.exit(0);
} catch (error) {
  fatal(error && error.stack ? error.stack : String(error));
}
