import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile as execFileCallback } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const sourceInstaller = new URL('../public/install.sh', import.meta.url);
const renderedInstaller = new URL('../dist/install.sh', import.meta.url);
const assetName = 'localcloud-darwin-arm64.tar.gz';
const versions = ['0.1.0', '0.1.1'];
const requestedPaths = [];
let corruptChecksumsFor = null;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const count = (value, needle) => value.split(needle).length - 1;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const root = await mkdtemp(join(tmpdir(), 'localcloud-installer-test-'));
const fixtures = new Map();
let server;

async function createArchive(version) {
  const stage = join(root, `stage-${version}`);
  const archive = join(root, `${version}-${assetName}`);
  await mkdir(stage, { recursive: true });
  const binary = `#!/bin/sh
case \${1:-} in
  --version)
    printf 'localcloud ${version}\\n'
    ;;
  --help)
    printf 'LocalCloud help\\n'
    ;;
  guide)
    printf 'LocalCloud coding-agent guide\\n'
    ;;
  doctor)
    [ -z "\${LOCALCLOUD_TEST_LOG:-}" ] || printf 'doctor\\n' >> "$LOCALCLOUD_TEST_LOG"
    printf '{"status":"ok","cli_version":"${version}","default_image":"localcloud/localcloud:${version}"}\\n'
    ;;
  start)
    [ -z "\${LOCALCLOUD_TEST_LOG:-}" ] || printf 'start\\n' >> "$LOCALCLOUD_TEST_LOG"
    [ -z "\${LOCALCLOUD_TEST_STATE:-}" ] || : > "$LOCALCLOUD_TEST_STATE"
    printf '{"status":"started","container":{"state":"running","url":"http://localhost:24080"}}\\n'
    ;;
  *)
    printf '{"status":"ok"}\\n'
    ;;
esac
`;
  await Promise.all([
    writeFile(join(stage, 'localcloud'), binary, { mode: 0o755 }),
    writeFile(join(stage, 'LICENSE'), 'LocalCloud proprietary test fixture\n'),
    writeFile(join(stage, 'THIRD_PARTY_NOTICES'), 'Fixture notices\n'),
  ]);
  await chmod(join(stage, 'localcloud'), 0o755);
  await execFile('tar', [
    '-C', stage,
    '-czf', archive,
    'localcloud',
    'LICENSE',
    'THIRD_PARTY_NOTICES',
  ]);
  const contents = await readFile(archive);
  fixtures.set(version, { contents, checksum: sha256(contents) });
}

async function runInstaller(args, environment, { expectFailure = false } = {}) {
  try {
    const result = await execFile('sh', [sourceInstaller.pathname, ...args], {
      env: environment,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (expectFailure) throw new Error(`installer unexpectedly succeeded: ${result.stdout}`);
    return { ...result, code: 0 };
  } catch (error) {
    if (!expectFailure) throw error;
    assert(error.code !== 0, 'installer failure did not return a non-zero status');
    return {
      code: error.code,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
}

try {
  await execFile('sh', ['-n', sourceInstaller.pathname]);
  const [source, rendered] = await Promise.all([
    readFile(sourceInstaller),
    readFile(renderedInstaller),
  ]);
  assert(source.equals(rendered), 'dist/install.sh differs from public/install.sh');

  await Promise.all(versions.map(createArchive));

  server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    requestedPaths.push(pathname);
    const pinned = pathname.match(/^\/releases\/download\/v([0-9]+\.[0-9]+\.[0-9]+)\/(.+)$/);
    const latest = pathname.match(/^\/releases\/latest\/download\/(.+)$/);
    const version = pinned?.[1] ?? (latest ? versions[0] : null);
    const file = pinned?.[2] ?? latest?.[1];
    const fixture = version ? fixtures.get(version) : null;
    if (!fixture || !file) {
      response.writeHead(404).end('not found');
      return;
    }
    if (file === assetName) {
      response.writeHead(200, { 'content-type': 'application/gzip' }).end(fixture.contents);
      return;
    }
    if (file === 'SHA256SUMS') {
      const checksum = corruptChecksumsFor === version ? '0'.repeat(64) : fixture.checksum;
      response.writeHead(200, { 'content-type': 'text/plain' }).end(`${checksum}  ${assetName}\n`);
      return;
    }
    response.writeHead(404).end('not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert(address && typeof address !== 'string', 'fixture server did not bind a TCP port');

  const home = join(root, 'home');
  const installDir = join(home, "bin with quote's");
  const mockBin = join(root, 'mock-bin');
  const runtimeData = join(home, '.local', 'share', 'localcloud', 'localcloud-data');
  const commandLog = join(root, 'commands.log');
  const startedState = join(root, 'started-state');
  await Promise.all([
    mkdir(home, { recursive: true }),
    mkdir(mockBin, { recursive: true }),
    mkdir(runtimeData, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(commandLog, ''),
    writeFile(join(runtimeData, 'preserved.txt'), 'persistent data\n'),
  ]);
  const mockedUname = `#!/bin/sh
case \${1:-} in
  -s) printf '%s\\n' "\${MOCK_UNAME_S:-Darwin}" ;;
  -m) printf '%s\\n' "\${MOCK_UNAME_M:-arm64}" ;;
  *) printf '%s\\n' "\${MOCK_UNAME_S:-Darwin}" ;;
esac
`;
  await writeFile(join(mockBin, 'uname'), mockedUname, { mode: 0o755 });
  await chmod(join(mockBin, 'uname'), 0o755);

  const baseEnvironment = {
    HOME: home,
    LOCALCLOUD_INSTALL_DIR: installDir,
    LOCALCLOUD_RELEASE_BASE_URL: `http://127.0.0.1:${address.port}/releases`,
    LOCALCLOUD_TEST_LOG: commandLog,
    LOCALCLOUD_TEST_STATE: startedState,
    MOCK_UNAME_M: 'arm64',
    MOCK_UNAME_S: 'Darwin',
    PATH: `${mockBin}:/usr/bin:/bin:/usr/sbin:/sbin`,
    SHELL: '/bin/zsh',
    TMPDIR: join(root, 'tmp'),
  };
  await mkdir(baseEnvironment.TMPDIR, { recursive: true });

  requestedPaths.length = 0;
  const clean = await runInstaller(['--no-start'], baseEnvironment);
  assert(clean.stdout.includes('Installed LocalCloud CLI 0.1.0'), 'clean install did not report success');
  assert(requestedPaths.includes(`/releases/latest/download/${assetName}`), 'clean install did not select latest archive URL');
  assert(requestedPaths.includes('/releases/latest/download/SHA256SUMS'), 'clean install did not select latest checksum URL');

  const installedBinary = join(installDir, 'localcloud');
  const installedVersion = await execFile(installedBinary, ['--version'], { env: baseEnvironment });
  assert(installedVersion.stdout === 'localcloud 0.1.0\n', 'installed binary has the wrong version');
  const zshrcPath = join(home, '.zshrc');
  const zshrc = await readFile(zshrcPath, 'utf8');
  assert(count(zshrc, '# >>> LocalCloud installer >>>') === 1, 'PATH block was not written exactly once');
  assert(zshrc.includes(`bin with quote'`), 'PATH block does not contain the selected install directory');
  await execFile('sh', ['-n', zshrcPath]);
  assert((await readFile(commandLog, 'utf8')) === '', 'non-interactive --no-start invoked Docker lifecycle commands');

  const beforeNoop = await stat(installedBinary);
  const noop = await runInstaller(['--no-start'], baseEnvironment);
  const afterNoop = await stat(installedBinary);
  assert(noop.stdout.includes('already installed'), 'same-version reinstall was not a successful no-op');
  assert(beforeNoop.ino === afterNoop.ino && beforeNoop.mtimeMs === afterNoop.mtimeMs, 'same-version reinstall replaced the binary');
  const zshrcAfterNoop = await readFile(zshrcPath, 'utf8');
  assert(count(zshrcAfterNoop, '# >>> LocalCloud installer >>>') === 1, 'same-version reinstall duplicated the PATH block');

  requestedPaths.length = 0;
  await runInstaller(['--version', '0.1.0', '--no-start'], baseEnvironment);
  assert(requestedPaths.includes(`/releases/download/v0.1.0/${assetName}`), 'pinned install did not select the versioned archive URL');
  assert(!requestedPaths.some((value) => value.includes('/latest/')), 'pinned install requested the latest release URL');

  const beforeMismatch = await readFile(installedBinary);
  corruptChecksumsFor = '0.1.1';
  const mismatch = await runInstaller(
    ['--version', '0.1.1', '--no-start'],
    baseEnvironment,
    { expectFailure: true },
  );
  corruptChecksumsFor = null;
  assert(mismatch.stderr.includes('checksum verification failed'), 'checksum mismatch was not reported');
  const afterMismatch = await readFile(installedBinary);
  assert(beforeMismatch.equals(afterMismatch), 'checksum failure changed the installed binary');

  const unsupportedDir = join(home, 'unsupported-bin');
  const unsupported = await runInstaller(
    ['--install-dir', unsupportedDir, '--no-start'],
    { ...baseEnvironment, MOCK_UNAME_S: 'Windows_NT' },
    { expectFailure: true },
  );
  assert(unsupported.stderr.includes('manual Docker instructions'), 'unsupported platform lacks manual Docker recovery');
  await stat(unsupportedDir).then(
    () => { throw new Error('unsupported platform touched the destination'); },
    (error) => { if (error.code !== 'ENOENT') throw error; },
  );

  const uninstall = await runInstaller(['--uninstall'], baseEnvironment);
  assert(uninstall.stdout.includes('persistent volumes remain intact'), 'uninstall did not explain retained runtime state');
  await stat(installedBinary).then(
    () => { throw new Error('uninstall left the script-managed binary in place'); },
    (error) => { if (error.code !== 'ENOENT') throw error; },
  );
  const zshrcAfterUninstall = await readFile(zshrcPath, 'utf8');
  assert(!zshrcAfterUninstall.includes('# >>> LocalCloud installer >>>'), 'uninstall left the PATH block in place');
  assert((await readFile(join(runtimeData, 'preserved.txt'), 'utf8')) === 'persistent data\n', 'uninstall changed runtime data');

  console.log('Installer verification passed: install, pinning, preservation, platform rejection, and uninstall.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
