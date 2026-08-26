import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile as execFileCallback } from 'node:child_process';
import {
  chmod,
  mkdir,
  lstat,
  mkdtemp,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
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

async function assertPathMissing(path, message) {
  await lstat(path).then(
    () => { throw new Error(message); },
    (error) => { if (error.code !== 'ENOENT') throw error; },
  );
}

const count = (value, needle) => value.split(needle).length - 1;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const root = await mkdtemp(join(tmpdir(), 'localcloud-installer-test-'));
const fixtures = new Map();
let server;

async function createArchive(version) {
  const stage = join(root, `stage-${version}`);
  const runtime = join(stage, 'localcloud-runtime');
  const internal = join(runtime, '_internal');
  const archive = join(root, `${version}-${assetName}`);
  await mkdir(stage, { recursive: true });
  const launcher = `#!/bin/sh
set -eu
launcher_dir=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
exec "$launcher_dir/localcloud-runtime/localcloud" "$@"
`;
  const binary = `#!/bin/sh
case \${1:-} in
  --version)
    if [ "\${LOCALCLOUD_TEST_MARKER_CONFLICT:-0}" = "1" ]; then
      mkdir -p "$LOCALCLOUD_INSTALL_DIR/.localcloud-script-install"
    fi
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
  const archiveEntries = ['localcloud', 'LICENSE', 'THIRD_PARTY_NOTICES'];
  await Promise.all([
    writeFile(join(stage, 'LICENSE'), 'LocalCloud proprietary test fixture\n'),
    writeFile(join(stage, 'THIRD_PARTY_NOTICES'), 'Fixture notices\n'),
  ]);
  if (version === '0.1.0') {
    await writeFile(join(stage, 'localcloud'), binary, { mode: 0o755 });
    await chmod(join(stage, 'localcloud'), 0o755);
  } else {
    await mkdir(internal, { recursive: true });
    await Promise.all([
      writeFile(join(stage, 'localcloud'), launcher, { mode: 0o755 }),
      writeFile(join(runtime, 'localcloud'), binary, { mode: 0o755 }),
      writeFile(join(internal, 'fixture.txt'), 'pre-extracted runtime fixture\n'),
    ]);
    await Promise.all([
      chmod(join(stage, 'localcloud'), 0o755),
      chmod(join(runtime, 'localcloud'), 0o755),
    ]);
    archiveEntries.splice(1, 0, 'localcloud-runtime');
  }
  await execFile('tar', ['-C', stage, '-czf', archive, ...archiveEntries]);
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

async function runInstallerInPseudoTty(args, environment, answer) {
  const helper = String.raw`
import errno, os, pty, select, sys, time
pid, master = pty.fork()
if pid == 0:
    os.execvpe(sys.argv[2], sys.argv[2:], os.environ.copy())
output = bytearray()
prompt = b"Run LocalCloud doctor and start now?"
answered = False
deadline = time.monotonic() + 60
status = None
while time.monotonic() < deadline:
    readable, _, _ = select.select([master], [], [], 0.25)
    if readable:
        try:
            chunk = os.read(master, 4096)
            if not chunk:
                break
            output.extend(chunk)
            if not answered and prompt in output:
                os.write(master, (sys.argv[1] + "\n").encode())
                answered = True
        except OSError as error:
            if error.errno == errno.EIO:
                break
            raise
    done, wait_status = os.waitpid(pid, os.WNOHANG)
    if done:
        status = wait_status
        break
if status is None:
    done, status = os.waitpid(pid, os.WNOHANG)
    if not done:
        os.kill(pid, 9)
        os.waitpid(pid, 0)
        sys.stdout.buffer.write(output)
        raise SystemExit("pseudo-TTY child timed out")
sys.stdout.buffer.write(output)
sys.exit(os.waitstatus_to_exitcode(status))
`;
  const result = await execFile('python3', ['-c', helper, answer, 'sh', sourceInstaller.pathname, ...args], {
    env: environment,
    maxBuffer: 4 * 1024 * 1024,
  });
  return { ...result, code: 0 };
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
  assert(clean.stdout.includes('lc is an alias for localcloud; both commands behave identically.'), 'clean install omitted the alias contract');
  assert(requestedPaths.includes(`/releases/latest/download/${assetName}`), 'clean install did not select latest archive URL');
  assert(requestedPaths.includes('/releases/latest/download/SHA256SUMS'), 'clean install did not select latest checksum URL');

  const installedBinary = join(installDir, 'localcloud');
  const installedRuntime010 = join(installDir, '.localcloud-runtime-0.1.0');
  assert(
    (await stat(join(installedRuntime010, 'localcloud'))).isFile(),
    'clean install did not migrate the legacy one-file archive',
  );
  const installedMarker = await readFile(
    join(installDir, '.localcloud-script-install'),
    'utf8',
  );
  assert(
    installedMarker.includes('runtime=.localcloud-runtime-0.1.0\n'),
    'managed marker omitted the owned runtime directory',
  );
  const installedVersion = await execFile(installedBinary, ['--version'], { env: baseEnvironment });
  assert(installedVersion.stdout === 'localcloud 0.1.0\n', 'installed binary has the wrong version');
  const installedAlias = join(installDir, 'lc');
  assert((await readlink(installedAlias)) === 'localcloud', 'clean install did not create a relative lc alias');
  const aliasVersion = await execFile(installedAlias, ['--version'], { env: baseEnvironment });
  assert(aliasVersion.stdout === installedVersion.stdout, 'lc and localcloud returned different versions');
  const zshrcPath = join(home, '.zshrc');
  const zshrc = await readFile(zshrcPath, 'utf8');
  assert(count(zshrc, '# >>> LocalCloud installer >>>') === 1, 'PATH block was not written exactly once');
  assert(zshrc.includes(`bin with quote'`), 'PATH block does not contain the selected install directory');
  await execFile('sh', ['-n', zshrcPath]);
  assert((await readFile(commandLog, 'utf8')) === '', 'non-interactive --no-start invoked Docker lifecycle commands');

  const beforeNoop = await stat(installedBinary);
  const beforeRuntimeNoop = await stat(installedRuntime010);
  const beforeAliasNoop = await lstat(installedAlias);
  const noop = await runInstaller(['--no-start'], baseEnvironment);
  const afterNoop = await stat(installedBinary);
  assert(noop.stdout.includes('already installed'), 'same-version reinstall was not a successful no-op');
  assert(beforeNoop.ino === afterNoop.ino && beforeNoop.mtimeMs === afterNoop.mtimeMs, 'same-version reinstall replaced the binary');
  const afterRuntimeNoop = await stat(installedRuntime010);
  assert(
    beforeRuntimeNoop.ino === afterRuntimeNoop.ino &&
      beforeRuntimeNoop.mtimeMs === afterRuntimeNoop.mtimeMs,
    'same-version reinstall replaced the runtime directory',
  );
  const afterAliasNoop = await lstat(installedAlias);
  assert(beforeAliasNoop.ino === afterAliasNoop.ino, 'same-version reinstall replaced the managed alias');
  const zshrcAfterNoop = await readFile(zshrcPath, 'utf8');
  assert(count(zshrcAfterNoop, '# >>> LocalCloud installer >>>') === 1, 'same-version reinstall duplicated the PATH block');

  await rm(installedAlias);
  const repairedUpgrade = await runInstaller(['--version', '0.1.1', '--no-start'], baseEnvironment);
  assert(repairedUpgrade.stdout.includes('Repaired LocalCloud alias lc -> localcloud'), 'upgrade did not repair the missing managed alias');
  assert((await readlink(installedAlias)) === 'localcloud', 'upgrade repaired lc with the wrong target');
  const upgradedVersion = await execFile(installedAlias, ['--version'], { env: baseEnvironment });
  assert(upgradedVersion.stdout === 'localcloud 0.1.1\n', 'repaired alias did not run the upgraded CLI');
  await assertPathMissing(
    installedRuntime010,
    'upgrade left the previous managed runtime directory',
  );
  const installedRuntime011 = join(installDir, '.localcloud-runtime-0.1.1');
  assert(
    (await readFile(join(installedRuntime011, '_internal', 'fixture.txt'), 'utf8')) ===
      'pre-extracted runtime fixture\n',
    'upgrade omitted the new pre-extracted runtime',
  );

  await writeFile(commandLog, '');
  const declinedPrompt = await runInstallerInPseudoTty([], baseEnvironment, 'n');
  assert(declinedPrompt.stdout.includes('Run LocalCloud doctor and start now?'), 'interactive decline did not display the startup prompt');
  assert(declinedPrompt.stdout.includes('Next steps:'), 'interactive decline did not print recovery commands');
  assert((await readFile(commandLog, 'utf8')) === '', 'interactive decline invoked lifecycle commands');

  await writeFile(commandLog, '');
  const acceptedPrompt = await runInstallerInPseudoTty([], baseEnvironment, 'y');
  assert(acceptedPrompt.stdout.includes('Run LocalCloud doctor and start now?'), 'interactive acceptance did not display the startup prompt');
  assert(acceptedPrompt.stdout.includes('LocalCloud is running at http://localhost:24080'), 'interactive acceptance did not report the selected console URL');
  assert(acceptedPrompt.stdout.includes('lc console') && acceptedPrompt.stdout.includes('lc env'), 'interactive acceptance omitted lc post-start next steps');
  assert((await readFile(commandLog, 'utf8')) === 'doctor\nstart\n', 'interactive acceptance did not invoke doctor then start exactly once');

  await writeFile(commandLog, '');
  const nonTty = await runInstaller([], baseEnvironment);
  assert(nonTty.stdout.includes('Next steps:'), 'genuine non-TTY install did not print next steps');
  assert(!nonTty.stdout.includes('Run LocalCloud doctor and start now?'), 'genuine non-TTY install unexpectedly prompted');
  assert(nonTty.stdout.includes('lc doctor') && nonTty.stdout.includes('lc start'), 'non-TTY recovery did not prefer lc');
  assert((await readFile(commandLog, 'utf8')) === '', 'genuine non-TTY install invoked lifecycle commands');

  requestedPaths.length = 0;
  await runInstaller(['--version', '0.1.0', '--no-start'], baseEnvironment);
  assert(requestedPaths.includes(`/releases/download/v0.1.0/${assetName}`), 'pinned install did not select the versioned archive URL');
  assert(!requestedPaths.some((value) => value.includes('/latest/')), 'pinned install requested the latest release URL');
  await assertPathMissing(
    installedRuntime011,
    'pinned downgrade left the newer managed runtime directory',
  );
  assert(
    (await stat(installedRuntime010)).isDirectory(),
    'pinned downgrade did not install its managed runtime directory',
  );

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
  assert(
    (await stat(installedRuntime010)).isDirectory(),
    'failed upgrade removed the current managed runtime directory',
  );
  await assertPathMissing(
    installedRuntime011,
    'failed upgrade left a new runtime directory behind',
  );
  const markerRollbackInstallDir = join(home, 'marker-rollback-bin');
  const markerRollbackEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: markerRollbackInstallDir,
    LOCALCLOUD_TEST_MARKER_CONFLICT: '1',
  };
  const markerRollbackFailure = await runInstaller(
    ['--no-start', '--no-modify-path'],
    markerRollbackEnvironment,
    { expectFailure: true },
  );
  assert(
    markerRollbackFailure.stderr.includes(
      'existing managed-install marker changed during installation',
    ),
    'post-staging marker conflict was not reported',
  );
  await assertPathMissing(
    join(markerRollbackInstallDir, 'localcloud'),
    'marker failure left the staged launcher installed',
  );
  await assertPathMissing(
    join(markerRollbackInstallDir, 'lc'),
    'marker failure left the staged alias installed',
  );
  await assertPathMissing(
    join(markerRollbackInstallDir, '.localcloud-runtime-0.1.0'),
    'marker failure left the staged runtime installed',
  );
  assert(
    (
      await stat(
        join(markerRollbackInstallDir, '.localcloud-script-install'),
      )
    ).isDirectory(),
    'marker failure replaced the conflicting marker directory',
  );


  const markerDirectoryInstallDir = join(home, 'marker-directory-bin');
  const markerDirectory = join(
    markerDirectoryInstallDir,
    '.localcloud-script-install',
  );
  const markerDirectoryEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: markerDirectoryInstallDir,
  };
  await mkdir(markerDirectory, { recursive: true });
  const markerDirectoryFailure = await runInstaller(
    ['--no-start', '--no-modify-path'],
    markerDirectoryEnvironment,
    { expectFailure: true },
  );
  assert(markerDirectoryFailure.stderr.includes('not a valid script-managed marker'), 'directory marker target was not rejected');
  assert((await stat(markerDirectory)).isDirectory(), 'directory marker target was replaced');
  await assertPathMissing(join(markerDirectoryInstallDir, 'localcloud'), 'directory marker failure installed the canonical binary');
  await assertPathMissing(join(markerDirectoryInstallDir, 'lc'), 'directory marker failure installed the alias');

  const invalidMarkerInstallDir = join(home, 'invalid-marker-bin');
  const invalidMarker = join(
    invalidMarkerInstallDir,
    '.localcloud-script-install',
  );
  const invalidMarkerAlias = join(invalidMarkerInstallDir, 'lc');
  const invalidMarkerEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: invalidMarkerInstallDir,
  };
  await mkdir(invalidMarkerInstallDir, { recursive: true });
  await writeFile(invalidMarker, 'not-managed-by-localcloud\nalias=lc\n');
  await symlink('localcloud', invalidMarkerAlias);
  const invalidMarkerFailure = await runInstaller(
    ['--no-start', '--no-modify-path'],
    invalidMarkerEnvironment,
    { expectFailure: true },
  );
  assert(invalidMarkerFailure.stderr.includes('not a valid script-managed marker'), 'invalid marker header was trusted');
  assert((await readFile(invalidMarker, 'utf8')) === 'not-managed-by-localcloud\nalias=lc\n', 'invalid marker was replaced');
  assert((await readlink(invalidMarkerAlias)) === 'localcloud', 'invalid marker claimed the unowned exact-target alias');
  await assertPathMissing(join(invalidMarkerInstallDir, 'localcloud'), 'invalid marker failure installed the canonical binary');

  const fileConflictDir = join(home, 'file-conflict-bin');
  const fileConflictAlias = join(fileConflictDir, 'lc');
  const fileConflictEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: fileConflictDir,
  };
  await mkdir(fileConflictDir, { recursive: true });
  await writeFile(fileConflictAlias, 'foreign lc command\n', { mode: 0o755 });
  const fileConflict = await runInstaller(
    ['--no-start', '--no-modify-path'],
    fileConflictEnvironment,
  );
  assert(fileConflict.stderr.includes('not the managed LocalCloud alias'), 'regular-file alias collision did not warn');
  assert((await readFile(fileConflictAlias, 'utf8')) === 'foreign lc command\n', 'regular-file alias collision was modified');
  assert(fileConflict.stdout.includes('localcloud doctor'), 'regular-file collision did not fall back to localcloud');
  const fileConflictVersion = await execFile(join(fileConflictDir, 'localcloud'), ['--version'], {
    env: fileConflictEnvironment,
  });
  assert(fileConflictVersion.stdout === 'localcloud 0.1.0\n', 'regular-file collision prevented canonical installation');
  const fileConflictUninstall = await runInstaller(['--uninstall'], fileConflictEnvironment);
  assert(fileConflictUninstall.stderr.includes('not managed by LocalCloud'), 'uninstall did not report the preserved unowned alias');
  assert((await readFile(fileConflictAlias, 'utf8')) === 'foreign lc command\n', 'uninstall removed an unowned alias');
  await assertPathMissing(join(fileConflictDir, 'localcloud'), 'uninstall left the canonical collision-fixture binary');
  await assertPathMissing(
    join(fileConflictDir, '.localcloud-runtime-0.1.0'),
    'uninstall left the collision-fixture runtime directory',
  );

  const foreignAliasTarget = join(home, 'foreign-lc-target');
  await writeFile(foreignAliasTarget, '#!/bin/sh\nprintf foreign\\n\n', { mode: 0o755 });
  const symlinkConflictDir = join(home, 'symlink-conflict-bin');
  const symlinkConflictAlias = join(symlinkConflictDir, 'lc');
  const symlinkConflictEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: symlinkConflictDir,
  };
  await mkdir(symlinkConflictDir, { recursive: true });
  await symlink(foreignAliasTarget, symlinkConflictAlias);
  const symlinkConflict = await runInstaller(
    ['--no-start', '--no-modify-path'],
    symlinkConflictEnvironment,
  );
  assert(symlinkConflict.stderr.includes('not the managed LocalCloud alias'), 'symlink alias collision did not warn');
  assert((await readlink(symlinkConflictAlias)) === foreignAliasTarget, 'symlink alias collision was replaced');
  const symlinkConflictVersion = await execFile(join(symlinkConflictDir, 'localcloud'), ['--version'], {
    env: symlinkConflictEnvironment,
  });
  assert(symlinkConflictVersion.stdout === 'localcloud 0.1.0\n', 'symlink collision prevented canonical installation');

  const pathConflictCommand = join(mockBin, 'lc');
  await writeFile(pathConflictCommand, '#!/bin/sh\nprintf foreign-path-lc\\n\n', { mode: 0o755 });
  const pathConflictDir = join(home, 'path-conflict-bin');
  const pathConflictEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: pathConflictDir,
  };
  const pathConflict = await runInstaller(
    ['--no-start', '--no-modify-path'],
    pathConflictEnvironment,
  );
  assert(pathConflict.stderr.includes(`lc already resolves to ${pathConflictCommand}`), 'PATH alias collision did not identify the existing command');
  await assertPathMissing(join(pathConflictDir, 'lc'), 'PATH alias collision created a shadowing alias');
  assert((await readFile(pathConflictCommand, 'utf8')).includes('foreign-path-lc'), 'PATH alias collision changed the existing command');
  const pathConflictVersion = await execFile(join(pathConflictDir, 'localcloud'), ['--version'], {
    env: pathConflictEnvironment,
  });
  assert(pathConflictVersion.stdout === 'localcloud 0.1.0\n', 'PATH collision prevented canonical installation');
  await rm(pathConflictCommand);

  const changedAliasDir = join(home, 'changed-alias-bin');
  const changedAliasEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: changedAliasDir,
  };
  await runInstaller(['--no-start', '--no-modify-path'], changedAliasEnvironment);
  const changedAlias = join(changedAliasDir, 'lc');
  await rm(changedAlias);
  await symlink(foreignAliasTarget, changedAlias);
  const changedAliasUninstall = await runInstaller(['--uninstall'], changedAliasEnvironment);
  assert(changedAliasUninstall.stderr.includes('no longer matches the managed lc -> localcloud symlink'), 'uninstall did not report the changed managed alias');
  assert((await readlink(changedAlias)) === foreignAliasTarget, 'uninstall removed the changed managed alias');
  await assertPathMissing(join(changedAliasDir, 'localcloud'), 'uninstall left the changed-alias canonical binary');
  await assertPathMissing(
    join(changedAliasDir, '.localcloud-runtime-0.1.0'),
    'uninstall left the changed-alias runtime directory',
  );

  const missingAliasDir = join(home, 'missing-alias-bin');
  const missingAliasEnvironment = {
    ...baseEnvironment,
    LOCALCLOUD_INSTALL_DIR: missingAliasDir,
  };
  await runInstaller(['--no-start', '--no-modify-path'], missingAliasEnvironment);
  const missingAlias = join(missingAliasDir, 'lc');
  await rm(missingAlias);
  const missingAliasUninstall = await runInstaller(['--uninstall'], missingAliasEnvironment);
  assert(missingAliasUninstall.stdout.includes('is already absent'), 'uninstall did not report the missing managed alias');
  await assertPathMissing(join(missingAliasDir, 'localcloud'), 'uninstall left the missing-alias canonical binary');
  await assertPathMissing(missingAlias, 'uninstall recreated the missing managed alias');
  await assertPathMissing(
    join(missingAliasDir, '.localcloud-runtime-0.1.0'),
    'uninstall left the missing-alias runtime directory',
  );

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
  assert(uninstall.stdout.includes('Removed LocalCloud alias lc -> localcloud.'), 'uninstall did not report managed alias removal');
  await stat(installedBinary).then(
    () => { throw new Error('uninstall left the script-managed binary in place'); },
    (error) => { if (error.code !== 'ENOENT') throw error; },
  );
  await assertPathMissing(installedAlias, 'uninstall left the script-managed lc alias in place');
  await assertPathMissing(
    installedRuntime010,
    'uninstall left the script-managed runtime directory',
  );
  const zshrcAfterUninstall = await readFile(zshrcPath, 'utf8');
  assert(!zshrcAfterUninstall.includes('# >>> LocalCloud installer >>>'), 'uninstall left the PATH block in place');
  assert((await readFile(join(runtimeData, 'preserved.txt'), 'utf8')) === 'persistent data\n', 'uninstall changed runtime data');

  console.log('Installer verification passed: aliases, collisions, repair, install, pinning, prompts, preservation, platform rejection, and uninstall.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
