const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'tiktok_live_autoliker.user.js');
const sourceDir = path.join(root, 'src');
const versionFile = path.join(root, 'VERSION');
const versionToken = '__AUTO_LIKER_VERSION__';

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
    if (!fs.existsSync(versionFile)) {
        throw new Error('Missing version file: VERSION');
    }

    const version = fs.readFileSync(versionFile, 'utf8').trim();
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error(`Invalid version in VERSION: ${JSON.stringify(version)}`);
    }

    const header = fs.readFileSync(path.join(sourceDir, 'header.js'), 'utf8').trimEnd();
    const body = modules.map((name) => {
        const file = path.join(sourceDir, name);
        if (!fs.existsSync(file)) {
            throw new Error(`Missing source module: ${path.relative(root, file)}`);
        }
        return fs.readFileSync(file, 'utf8').trimEnd();
    }).join('\n\n');

    const source = `${header}\n\n(function() {\n    'use strict';\n\n${body}\n\n})();\n`;
    const result = source.replaceAll(versionToken, version);
    if (result.includes(versionToken)) {
        throw new Error(`Unresolved version token: ${versionToken}`);
    }
    fs.writeFileSync(output, result);
}

build();
