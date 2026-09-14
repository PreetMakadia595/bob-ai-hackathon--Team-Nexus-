const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let failures = 0;

function check(title, fn) {
  try {
    const res = fn();
    if (res === true || res === undefined) {
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title}: ${res}`);
      failures++;
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${title}: ${err.message}`);
    failures++;
  }
}

console.log('================================================================');
console.log('🚀 SIMULATING .github/workflows/validate.yml CHECKS');
console.log('================================================================\n');

// 1. Required files exist
check('1. Required files exist', () => {
  const required = [
    'README.md',
    'submission.yaml',
    'docs/problem-statement.md',
    'docs/solution-overview.md',
    'docs/architecture.md',
    'docs/setup-guide.md',
    'demo/demo-video-link.txt'
  ];
  const missing = required.filter(f => !fs.existsSync(path.join(root, f)));
  if (missing.length > 0) return `Missing: ${missing.join(', ')}`;
});

// 2. submission.yaml is valid YAML
let yamlContent = '';
check('2. submission.yaml exists and is readable', () => {
  yamlContent = fs.readFileSync(path.join(root, 'submission.yaml'), 'utf8');
});

// 3. Required fields in submission.yaml are filled
check('3. submission.yaml required fields check', () => {
  const requiredKeys = [
    'name: "Team Nexus"',
    'track: "AI"',
    'name: "Preet Makadia"',
    'email: "24it044@charusat.edu.in"',
    'title: "SupplyChain Disruption Assistant & Fleet Utilisation Optimizer"',
    'problem_statement:',
    'solution_summary:',
    'key_features:'
  ];
  for (const k of requiredKeys) {
    if (!yamlContent.includes(k)) return `Missing or incorrect key pattern: ${k}`;
  }
});

// 4. src/ contains actual code files (not just README)
check('4. src/ contains source code', () => {
  function getFiles(dir) {
    let results = [];
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) results = results.concat(getFiles(full));
      else results.push(full);
    }
    return results;
  }
  const srcFiles = getFiles(path.join(root, 'src')).filter(f => {
    const base = path.basename(f);
    return base !== 'README.md' && base !== '.env.example';
  });
  if (srcFiles.length === 0) return 'No source files found in src/';
  console.log(`   Found ${srcFiles.length} source code files in src/`);
});

// 5. Demo video link is not the placeholder
check('5. Demo video link placeholder check', () => {
  const linkContent = fs.readFileSync(path.join(root, 'demo', 'demo-video-link.txt'), 'utf8').trim();
  if (linkContent.includes('your-demo-video-link-here')) {
    return 'demo/demo-video-link.txt still contains "your-demo-video-link-here"';
  }
  console.log(`   Video link content: "${linkContent.split('\n')[0]}"`);
});

// 6. README placeholders check
check('6. README placeholders replaced', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  if (readme.includes('[Your Project Title Here]')) return 'Contains [Your Project Title Here]';
  if (readme.includes('[Your Team Name]')) return 'Contains [Your Team Name]';
});

// 7. Additional template guidelines checks (presentation & screenshots)
check('7. presentation/slides.pdf exists', () => {
  if (!fs.existsSync(path.join(root, 'presentation', 'slides.pdf'))) return 'Missing presentation/slides.pdf';
  const size = fs.statSync(path.join(root, 'presentation', 'slides.pdf')).size;
  console.log(`   presentation/slides.pdf size: ${(size / 1024 / 1024).toFixed(2)} MB`);
});

check('8. demo/screenshots/ contains at least 3 required screenshots', () => {
  const reqScreenshots = [
    '01-home-dashboard.png',
    '02-query-input.png',
    '03-result-output.png'
  ];
  const missing = reqScreenshots.filter(s => !fs.existsSync(path.join(root, 'demo', 'screenshots', s)));
  if (missing.length > 0) return `Missing screenshots: ${missing.join(', ')}`;
});

console.log('\n================================================================');
if (failures === 0) {
  console.log('🎉 ALL VALIDATION CHECKS PASSED PERFECTLY!');
} else {
  console.error(`💥 ${failures} CHECKS FAILED`);
  process.exit(1);
}
console.log('================================================================\n');
