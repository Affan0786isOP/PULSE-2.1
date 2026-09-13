const fs = require('fs');

function patch(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/export function hasOnlyKeys\(obs: any,/g, 'export function hasOnlyKeys(obs: Record<string, unknown>,');
    content = content.replace(/export function isValidBaseObservation\(obs: any\):/g, 'export function isValidBaseObservation(obs: Record<string, unknown>):');
    content = content.replace(/export function isValidReactionMetrics\(obs: any\):/g, 'export function isValidReactionMetrics(obs: Record<string, unknown>):');
    content = content.replace(/export function isValidVisualReactionObservation\(obs: any\):/g, 'export function isValidVisualReactionObservation(obs: Record<string, unknown>):');
    content = content.replace(/export function isValidDirectionObservation\(obs: any\):/g, 'export function isValidDirectionObservation(obs: Record<string, unknown>):');
    content = content.replace(/export function isValidColorObservation\(obs: any\):/g, 'export function isValidColorObservation(obs: Record<string, unknown>):');
    content = content.replace(/export function isValidMemoryObservation\(obs: any\):/g, 'export function isValidMemoryObservation(obs: Record<string, unknown>):');
    content = content.replace(/\(obs.ageGroup as any\)/g, '(obs.ageGroup as typeof VALID_AGE_GROUPS[number])');

    fs.writeFileSync(filePath, content);
}

patch('src/lib/protocolValidators.ts');
patch('mobile/src/lib/protocolValidators.ts');
console.log('Patched protocolValidators.ts');
