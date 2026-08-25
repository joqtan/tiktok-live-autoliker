const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'tiktok_live_autoliker.user.js');
const sourceDir = path.join(root, 'src');

const modules = [
    '01-credits.js',
    '02-config.js',
    '03-notifications.js',
    '04-button-detector.js',
    '05-statistics.js',
    '06-click-engine.js',
    '07-ui.js',
    '08-bootstrap.js'
];

function build() {
    const header = fs.readFileSync(path.join(sourceDir, 'header.js'), 'utf8').trimEnd();
    const body = modules.map((name) => {
        const file = path.join(sourceDir, name);
        if (!fs.existsSync(file)) {
            throw new Error(`Missing source module: ${path.relative(root, file)}`);
        }
        return fs.readFileSync(file, 'utf8').trimEnd();
    }).join('\n\n');

    const result = `${header}\n\n(function() {\n    'use strict';\n\n${body}\n\n})();\n`;
    fs.writeFileSync(output, result);
}

build();
