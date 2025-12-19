/**
 * Simple local database viewer server
 * Usage: npx tsx scripts/db-server.ts
 * Then open: http://localhost:3001
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createServer } from 'http'
import { getDb } from '@/lib/db/pg-client'
import { getDbConnection } from '@/lib/db/client'
import { users, conversations, messages, apiKeys } from '@/lib/db/drizzle-schema'
import { sql } from 'drizzle-orm'

const PORT = 3001

const server = createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`)

  try {
    // Serve HTML interface
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(getHTML())
      return
    }

    // API: Get PostgreSQL table data
    if (url.pathname.startsWith('/api/postgres/')) {
      const table = url.pathname.split('/')[3]
      const limit = parseInt(url.searchParams.get('limit') || '50')

      const db = getDb()
      let data: any[] = []

      switch (table) {
        case 'users':
          data = await db.select().from(users).limit(limit)
          break
        case 'conversations':
          data = await db.select().from(conversations).limit(limit)
          break
        case 'messages':
          data = await db.select().from(messages).limit(limit)
          break
        case 'api_keys':
          data = await db.select().from(apiKeys).limit(limit)
          break
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Table not found' }))
          return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ data, count: data.length }))
      return
    }

    // API: Get PostgreSQL table counts
    if (url.pathname === '/api/postgres/counts') {
      const db = getDb()

      const counts = {
        users: (await db.select({ count: sql<number>`count(*)` }).from(users))[0].count,
        conversations: (await db.select({ count: sql<number>`count(*)` }).from(conversations))[0].count,
        messages: (await db.select({ count: sql<number>`count(*)` }).from(messages))[0].count,
        api_keys: (await db.select({ count: sql<number>`count(*)` }).from(apiKeys))[0].count,
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(counts))
      return
    }

    // API: Get LanceDB table list
    if (url.pathname === '/api/lancedb/tables') {
      const db = await getDbConnection()
      const tables = await db.tableNames()

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ tables }))
      return
    }

    // API: Get LanceDB table data
    if (url.pathname.startsWith('/api/lancedb/')) {
      const table = url.pathname.split('/')[3]
      const limit = parseInt(url.searchParams.get('limit') || '50')

      const db = await getDbConnection()
      const lanceTable = await db.openTable(table)
      const data = await lanceTable.query().limit(limit).toArray()

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ data, count: data.length }))
      return
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')

  } catch (error) {
    console.error('Error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }))
  }
})

server.listen(PORT, () => {
  console.log(`\n🚀 Database Viewer running at: http://localhost:${PORT}`)
  console.log(`\nPress Ctrl+C to stop\n`)
})

function getHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MemoryLoop Database Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 2px solid #ddd;
    }
    .tab {
      padding: 10px 20px;
      background: white;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      transition: all 0.2s;
    }
    .tab:hover { background: #f0f0f0; }
    .tab.active {
      color: #2563eb;
      background: white;
      border-bottom: 2px solid #2563eb;
      margin-bottom: -2px;
    }
    .controls {
      background: white;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    select, button {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    button {
      background: #2563eb;
      color: white;
      border: none;
      cursor: pointer;
      font-weight: 500;
    }
    button:hover { background: #1d4ed8; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #2563eb;
    }
    .stat-label { color: #666; font-size: 12px; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
    .table-container {
      background: white;
      border-radius: 5px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: #333;
    }
    tr:hover { background: #f9fafb; }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 14px;
    }
    .error {
      background: #fee;
      color: #c00;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .null { color: #999; font-style: italic; }
    .truncate {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>MemoryLoop Database Viewer</h1>
    <p class="subtitle">Browse your PostgreSQL and LanceDB data</p>

    <div class="tabs">
      <button class="tab active" data-db="postgres">PostgreSQL</button>
      <button class="tab" data-db="lancedb">LanceDB</button>
    </div>

    <div id="stats" class="stats"></div>

    <div class="controls">
      <label>Table:</label>
      <select id="tableSelect"></select>
      <label>Limit:</label>
      <select id="limitSelect">
        <option value="10">10</option>
        <option value="50" selected>50</option>
        <option value="100">100</option>
        <option value="500">500</option>
      </select>
      <button onclick="loadData()">Refresh</button>
    </div>

    <div id="error" class="error" style="display: none;"></div>
    <div id="content" class="loading">Loading...</div>
  </div>

  <script>
    let currentDB = 'postgres';
    let currentTable = 'messages';

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentDB = tab.dataset.db;
        loadTables();
      });
    });

    // Load table list
    async function loadTables() {
      if (currentDB === 'postgres') {
        const tables = ['users', 'conversations', 'messages', 'api_keys'];
        populateTableSelect(tables);
        loadStats();
      } else {
        const res = await fetch('/api/lancedb/tables');
        const { tables } = await res.json();
        populateTableSelect(tables);
      }
      loadData();
    }

    function populateTableSelect(tables) {
      const select = document.getElementById('tableSelect');
      select.innerHTML = tables.map(t =>
        \`<option value="\${t}" \${t === currentTable ? 'selected' : ''}>\${t}</option>\`
      ).join('');
      currentTable = tables.includes(currentTable) ? currentTable : tables[0];
    }

    // Load PostgreSQL stats
    async function loadStats() {
      if (currentDB !== 'postgres') {
        document.getElementById('stats').innerHTML = '';
        return;
      }

      const res = await fetch('/api/postgres/counts');
      const counts = await res.json();

      document.getElementById('stats').innerHTML = Object.entries(counts)
        .map(([table, count]) => \`
          <div class="stat-card">
            <div class="stat-label">\${table}</div>
            <div class="stat-value">\${count}</div>
          </div>
        \`).join('');
    }

    // Load table data
    async function loadData() {
      const table = document.getElementById('tableSelect').value;
      const limit = document.getElementById('limitSelect').value;
      currentTable = table;

      document.getElementById('content').innerHTML = '<div class="loading">Loading...</div>';
      document.getElementById('error').style.display = 'none';

      try {
        const res = await fetch(\`/api/\${currentDB}/\${table}?limit=\${limit}\`);
        const { data, count } = await res.json();

        if (data.length === 0) {
          document.getElementById('content').innerHTML =
            '<div class="loading">No data found</div>';
          return;
        }

        renderTable(data, count);
      } catch (error) {
        document.getElementById('error').textContent = 'Error: ' + error.message;
        document.getElementById('error').style.display = 'block';
        document.getElementById('content').innerHTML = '';
      }
    }

    function renderTable(data, count) {
      const keys = Object.keys(data[0]);

      const html = \`
        <div class="table-container">
          <table>
            <thead>
              <tr>\${keys.map(k => \`<th>\${k}</th>\`).join('')}</tr>
            </thead>
            <tbody>
              \${data.map(row => \`
                <tr>
                  \${keys.map(k => {
                    let value = row[k];
                    if (value === null || value === undefined) {
                      return '<td class="null">null</td>';
                    }
                    if (typeof value === 'object') {
                      value = JSON.stringify(value);
                    }
                    if (k === 'embedding' && Array.isArray(value)) {
                      value = \`[Vector: \${value.length} dimensions]\`;
                    }
                    const str = String(value);
                    return \`<td><div class="truncate" title="\${str}">\${str}</div></td>\`;
                  }).join('')}
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
        <p style="margin-top: 15px; color: #666; font-size: 14px;">
          Showing \${count} rows
        </p>
      \`;

      document.getElementById('content').innerHTML = html;
    }

    // Initial load
    loadTables();
  </script>
</body>
</html>`
}
