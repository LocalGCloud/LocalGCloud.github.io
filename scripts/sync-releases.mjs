// Writes src/data/releases.json from the public LocalCloud CLI releases on GitHub.
//
// Run it by hand after a CLI release (node scripts/sync-releases.mjs) and commit the JSON.
// The build reads only the committed file, so it never needs the network.
//
// Release notes are upstream text. Only facts a reader can use are kept: the supported
// hosts line, the runtime image when it is the official repository, and what the release
// ships (read from its asset names). Source revisions, internal dates and any other
// line are dropped, and the result goes through the same presentation sanitizer as the
// documentation contract, so the changelog clears the site's vocabulary gate.
import { writeFile } from "node:fs/promises";
import { presentContractText } from "../src/utils/contract-presentation.mjs";

const repository = "LocalGCloud/localcloud-cli";
const officialImage = "agentcloud/localcloud";
const output = new URL("../src/data/releases.json", import.meta.url);

const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (token) headers.Authorization = `Bearer ${token}`;
const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100`, { headers });
if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status} ${response.statusText}`);
const releases = await response.json();

const platformNames = { darwin: "macOS", linux: "Linux" };
const sentence = (text) => (/[.!?]$/.test(text) ? text : `${text}.`);

function summarize(body) {
	const kept = [];
	for (const raw of (body ?? "").split(/\r?\n/)) {
		const line = raw.trim();
		const hosts = line.match(/^Supported hosts:\s*(.+)$/i);
		if (hosts) kept.push(sentence(`Supported hosts: ${hosts[1]}`));
		const image = line.match(/^Runtime Docker image:\s*(\S+)$/i);
		if (image && image[1].startsWith(`${officialImage}:`)) kept.push(sentence(`Default runtime image: ${image[1]}`));
	}
	return presentContractText(kept.join(" "));
}

function shipped(assets) {
	const names = assets.map((asset) => asset.name);
	const platforms = [...new Set(names
		.map((name) => name.match(/^localcloud-(darwin|linux)-(amd64|arm64)\.tar\.gz$/))
		.filter(Boolean)
		.map(([, os, arch]) => `${platformNames[os]} ${arch}`))].sort();
	return {
		platforms,
		checksums: names.includes("SHA256SUMS"),
		sigstore: names.includes("SHA256SUMS.sigstore.json") && platforms.length > 0
			&& names.filter((name) => /^localcloud-.*\.tar\.gz\.sigstore\.json$/.test(name)).length === platforms.length,
		homebrewFormula: names.includes("localcloud.rb"),
	};
}

const data = releases
	.filter((release) => !release.draft)
	.map((release) => ({
		version: release.tag_name.replace(/^v/, ""),
		tag: release.tag_name,
		title: release.name || `LocalCloud CLI ${release.tag_name.replace(/^v/, "")}`,
		publishedAt: release.published_at.slice(0, 10),
		prerelease: release.prerelease,
		url: release.html_url,
		summary: summarize(release.body),
		...shipped(release.assets ?? []),
	}))
	.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || right.version.localeCompare(left.version, undefined, { numeric: true }));

if (!data.length) throw new Error("No published CLI releases found");
for (const release of data) {
	if (!/^v\d+\.\d+\.\d+/.test(release.tag)) throw new Error(`Unexpected release tag ${release.tag}`);
	if (!release.url.startsWith(`https://github.com/${repository}/releases/tag/`)) throw new Error(`Unexpected release URL ${release.url}`);
}

await writeFile(output, `${JSON.stringify({ repository: `https://github.com/${repository}`, releases: data }, null, 2)}\n`);
console.log(`Wrote ${data.length} CLI releases (${data.at(-1).tag} to ${data[0].tag}) to src/data/releases.json.`);
