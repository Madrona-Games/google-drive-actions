import * as core from '@actions/core';

export function isGhes(): boolean {
  const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] ?? 'https://github.com');

  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}

export function logWarning(message: string): void {
  const warningPrefix = '[warning]';
  core.info(`${warningPrefix}${message}`);
}

export function getInputAsArray(name: string, options?: core.InputOptions): string[] {
  return core
    .getInput(name, options)
    .split('\n')
    .map((s) => s.replace(/^!\s+/, '!').trim())
    .filter((x) => x !== '');
}

export function getInputAsInt(name: string, options?: core.InputOptions): number | undefined {
  const value = Number.parseInt(core.getInput(name, options));
  if (Number.isNaN(value) || value < 0) {
    return undefined;
  }

  return value;
}

export function getInputAsBool(name: string, options?: core.InputOptions): boolean {
  const result = core.getInput(name, options);

  return result.toLowerCase() === 'true';
}

export function getInputAsString(name: string, options?: core.InputOptions): string {
  return core.getInput(name, options) ?? '';
}
