const execa = require('execa');
const chalk = require('chalk');
const Table = require('cli-table2');

const betaVersion = process.argv[2] || 'beta5';
const filter = process.argv[3] || '@dojo';

const searchResults = JSON.parse(execa.shellSync(`npms search -s 100 -o json "${filter}"`).stdout);
const packageNames = searchResults.filter((result) => result.package.scope === 'dojo').map((result) => result.package.name);

const results = packageNames.map((name, index) => {
	const packageInfo = JSON.parse(execa.shellSync(`npm view --json ${name}`).stdout);
	const dists = packageInfo['dist-tags'];
	const releases = packageInfo.time;
	const { version: latestVersion } = Object.keys(releases).reduce((latestRelease, version) => {
		if (version === 'modified' || version === 'created') {
			return latestRelease;
		}
		const releaseDate = new Date(releases[version]).getTime();
		if (releaseDate > latestRelease.date) {
			return { date: releaseDate, version };
		}
		return latestRelease;

	}, { date: new Date('1970-01-01').getTime(), version: '' });
	let latest = 'unknown';
	let beta5 = 'unknown';
	Object.keys(dists).forEach((dist) => {
		if (dist === 'latest') {
			latest = dists[dist];
		}
		if (dist === betaVersion) {
			beta5 = dists[dist];
		}
	});
	return { name, latest, beta5, latestVersion, upToDate: latest === beta5 };
});

const query = results.reduce((q, result) => {
	return `${q} repo:${result.name.replace('@', '')} `;
}, '');

const table = new Table({
    head: ['Name', 'Latest Tag', 'Beta5 Tag', 'Latest version']
});

results.sort().forEach((result) => {
	let colour = chalk.green;
	if (result.beta5 === 'unknown') {
		colour = chalk.yellow;
	}
	else if (!result.upToDate) {
		colour = chalk.red.bold
	}
	table.push([result.name, result.latest, result.beta5, result.latestVersion]);
	/*console.log(colour(`name: ${result.name} | latest: ${result.latest} | beta5: ${result.beta5} | up to date: ${result.upToDate}`));*/
});

console.log(table.toString());
