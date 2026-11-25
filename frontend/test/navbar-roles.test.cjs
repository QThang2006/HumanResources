const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Navbar exposes /employee/workspace ("Giám sát Đội ngũ & Mood") for HR and SUPERADMIN with Enterprise ATS Blue tokens', () => {
  const navbarPath = path.join(__dirname, '../src/components/Navbar.tsx');
  const source = fs.readFileSync(navbarPath, 'utf8');

  const hrSectionMatch = source.match(/user\?\.role === 'HR'[\s\S]*?user\?\.role === 'SUPERADMIN'/);
  const superAdminSectionMatch = source.match(/user\?\.role === 'SUPERADMIN'[\s\S]*?user\?\.role === 'MANAGER'/);

  assert.ok(hrSectionMatch, 'HR navigation section must exist');
  assert.ok(superAdminSectionMatch, 'SUPERADMIN navigation section must exist');

  assert.match(hrSectionMatch[0], /to="\/employee\/workspace"/);
  assert.match(hrSectionMatch[0], /Giám sát Đội ngũ & Mood/);

  assert.match(superAdminSectionMatch[0], /to="\/employee\/workspace"/);
  assert.match(superAdminSectionMatch[0], /Giám sát Đội ngũ & Mood/);

  // Design token guard: Enterprise ATS Blue (blue-600 / slate-600), no purple/indigo or glassmorphism
  assert.match(source, /text-blue-600/);
  assert.match(source, /text-slate-600/);
  assert.doesNotMatch(source, /\b(?:indigo|purple)-/);
  assert.doesNotMatch(source, /backdrop-blur/);
});
