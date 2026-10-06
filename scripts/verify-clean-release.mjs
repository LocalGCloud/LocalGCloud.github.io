import { execFileSync } from 'node:child_process';

// Local deploys must ship exactly what CI would build from origin/main.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

git('fetch', '--quiet', 'origin', 'main');
const changes = git('status', '--porcelain');
if (changes) {
  console.error(`Refusing to deploy: the working tree has uncommitted or untracked files.\n${changes}`);
  process.exit(1);
}
const head = git('rev-parse', 'HEAD');
const remote = git('rev-parse', 'origin/main');
if (head !== remote) {
  console.error(`Refusing to deploy: HEAD ${head.slice(0, 12)} is not origin/main ${remote.slice(0, 12)}. Push to main and let CI deploy.`);
  process.exit(1);
}
console.log(`Release source verified: clean tree at origin/main ${head.slice(0, 12)}.`);
