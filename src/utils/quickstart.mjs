// One quick start for every page, Markdown route and llms.txt. Both paths read the
// documentation contract (src/data/docs-contract.snapshot.json), so the commands
// cannot drift between surfaces. Plain JavaScript so Astro and Node scripts share it.

/**
 * @typedef {{
 *   cli: { installCommand: string, homebrewCommand: string, quickStart: string[] },
 *   operator: { gatewayPort: number, endpoints: { readiness: string, environment: string }, manualDockerCommand: string },
 * }} QuickStartContract
 */

const gateway = (contract) => `http://localhost:${contract.operator.gatewayPort}`;

/** @param {QuickStartContract} contract */
export const readinessCheck = (contract) =>
	`curl -fsS ${gateway(contract)}${contract.operator.endpoints.readiness}`;

/**
 * Install the CLI, then run the contract's quick start with a readiness check
 * right after `localcloud start`.
 * @param {QuickStartContract} contract
 */
export function cliQuickStart(contract) {
	const install = contract.cli.installCommand;
	const homebrew = contract.cli.homebrewCommand;
	const readiness = readinessCheck(contract);
	const startIndex = contract.cli.quickStart.findIndex((line) => line.startsWith("localcloud start"));
	if (startIndex === -1) throw new Error("cli.quickStart has no `localcloud start` step for the readiness check");
	// Every step after the install line, in the order a person or agent runs them.
	const steps = [
		...contract.cli.quickStart.slice(0, startIndex + 1),
		readiness,
		...contract.cli.quickStart.slice(startIndex + 1),
	];
	const lines = [install, ...steps];
	return { install, homebrew, readiness, steps, lines, script: lines.join("\n") };
}

/** @param {QuickStartContract} contract */
export function consoleQuickStart(contract) {
	return [contract.cli.homebrewCommand, 'lc start --debug'].join('\n');
}

/**
 * Docker-only fallback: run the image, wait for readiness, then export the
 * environment from the runtime itself (no CLI on this path).
 * @param {QuickStartContract} contract
 */
export function dockerQuickStart(contract) {
	const run = contract.operator.manualDockerCommand;
	const readiness = readinessCheck(contract);
	const waitForReadiness = `for attempt in $(seq 1 60); do ${readiness} && break; sleep 2; done`;
	const environment = `eval "$(curl -fsS '${gateway(contract)}${contract.operator.endpoints.environment}?format=shell')"`;
	return {
		run,
		readiness,
		waitForReadiness,
		environment,
		script: [run, "", waitForReadiness, environment].join("\n"),
	};
}
