// test
const { execSync, spawn, exec } = require('child_process');
const { existsSync } = require('fs');
const { EOL } = require('os');
const path = require('path');

// Change working directory if user defined PACKAGEJSON_DIR
if (process.env.PACKAGEJSON_DIR) {
  process.env.GITHUB_WORKSPACE = `${process.env.GITHUB_WORKSPACE}/${process.env.PACKAGEJSON_DIR}`;
  process.chdir(process.env.GITHUB_WORKSPACE);
}

const workspace = process.env.GITHUB_WORKSPACE;

(async () => {
  const pkg = getPackageJson();
  const tagPrefix = process.env['INPUT_TAG-PREFIX'] || '';
  let commitMessage = process.env['INPUT_COMMIT-MESSAGE'] || 'CI: Build Number bumped to {{buildNumber}}';

  // GIT logic
  try {
    const currentBuildNumber = pkg.buildNumber.toString();
    
    // set git user
    await runInWorkspace('git', ['config', 'user.name', `"${process.env.GITHUB_USER || 'Auto Build Bump'}"`]);
    await runInWorkspace('git', [
      'config',
      'user.email',
      `"${process.env.GITHUB_EMAIL || 'gh-action-bump-buildNumber@users.noreply.github.com'}"`,
    ]);

    let currentBranch = /refs\/[a-zA-Z]+\/(.*)/.exec(process.env.GITHUB_REF)[1];
    let isPullRequest = false;

    if (process.env.GITHUB_HEAD_REF) {
      // Comes from a pull request
      currentBranch = process.env.GITHUB_HEAD_REF;
      isPullRequest = true;
    }
    if (process.env['INPUT_TARGET-BRANCH']) {
      // We want to override the branch that we are pulling / pushing to
      currentBranch = process.env['INPUT_TARGET-BRANCH'];
    }
    console.log('Current Branch:', currentBranch);
    console.log('Build Number in package.json from current branch:', currentBuildNumber);
    // do it in the current checked out github branch (DETACHED HEAD)
    // important for further usage of the package.json version

    // Fetch all tags
    await runInWorkspace('git', ['fetch', '--all', '--tags']);

    const latestTag = (await execSync(`git tag -l --sort=-version:refname "`+tagPrefix+`[0-9]*"|head -n 1`)).toString();

    let lastBuildNumber = currentBuildNumber;
    if(latestTag === ''){
      console.log(`No tags found matching tag prefix [${tagPrefix}], using build number currently in package.json [${lastBuildNumber}] as lastBuildNumber`);
    } else {
      console.log(`Found latest tag: ${latestTag}`);
      lastBuildNumber = latestTag.split("/")[1].trim();
    }
    
    const nextBuildNumber = parseInt(lastBuildNumber) + 1;
    const buildTag = `${tagPrefix}${nextBuildNumber}`;


    console.log(`Last Build Number ${lastBuildNumber}`);
    console.log(`Next Build Number ${nextBuildNumber}`);

    // now go to the actual branch to perform the same versioning
    if (isPullRequest) {
      // First fetch to get updated local version of branch
      await runInWorkspace('git', ['fetch']);
    }

    if (process.env['INPUT_CREATE-PR']){
      await runInWorkspace('git', ['checkout', '-b', buildTag]);
      await runInWorkspace('git', ['push', '-u', 'origin', buildTag]);
    } else {
      await runInWorkspace('git', ['checkout', currentBranch]);
    }
    
    //update build Number here
    updateBuildNumber(nextBuildNumber);
    
    console.log('buildNumber in package.json', getPackageJson().buildNumber);
    try {
      // to support "actions/checkout@v1"
      if (process.env['INPUT_SKIP-COMMIT'] !== 'true') {
        await runInWorkspace('git', ['commit', '-a', '-m', commitMessage.replace(/{{buildNumber}}/g, nextBuildNumber)]);
      }
    } catch (e) {
      console.warn(
        'git commit failed because you are using "actions/checkout@v2"; ' +
          'but that doesnt matter because you dont need that git commit, thats only for "actions/checkout@v1"',
      );
    }

    const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
    console.log('Remote Repo: ', remoteRepo);
    if (process.env['INPUT_SKIP-TAG'] !== 'true') {
      await runInWorkspace('git', ['tag', buildTag]);
      if (process.env['INPUT_SKIP-PUSH'] !== 'true') {
        await runInWorkspace('git', ['push', remoteRepo, '--follow-tags']);
        await runInWorkspace('git', ['push', remoteRepo, '--tags']);
      }
    } else {
      if (process.env['INPUT_SKIP-PUSH'] !== 'true') {
        await runInWorkspace('git', ['push', remoteRepo]);
      }
    }

    if (process.env['INPUT_CREATE-PR']){
      console.log('Creating PR....')
      // await runInWorkspace('git', ['push', remoteRepo, buildTag]);
      await runInWorkspace('gh', ['pr', 'create', '--fill', '--base', currentBranch, '--head', buildTag], '--label', 'bump build number');
    }
  } catch (e) {
    logError(e);
    exitFailure('Failed to bump version');
    return;
  }
  exitSuccess('Version bumped!');
})();

function updateBuildNumber(buildNumber) {
  const fs = require('fs');
  const fileName = path.join(workspace, 'package.json');
  const file = require(fileName);
      
  file.buildNumber = `${buildNumber}`;
      
  fs.writeFile(fileName, JSON.stringify(file, null, 2), function writeJSON(err) {
    if (err) return exitFailure(err);
  });
}

function getPackageJson() {
  const pathToPackage = path.join(workspace, 'package.json');
  if (!existsSync(pathToPackage)) throw new Error("package.json could not be found in your project's root.");
  return require(pathToPackage);
}

function exitSuccess(message) {
  console.info(`✔  success   ${message}`);
  process.exit(0);
}

function exitFailure(message) {
  logError(message);
  process.exit(1);
}

function logError(error) {
  console.error(`✖  fatal     ${error.stack || error}`);
}

function runInWorkspace(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: workspace });
    let isDone = false;
    const errorMessages = [];
    child.on('error', (error) => {
      if (!isDone) {
        isDone = true;
        reject(error);
      }
    });
    child.stderr.on('data', (chunk) => errorMessages.push(chunk));
    child.on('exit', (code) => {
      if (!isDone) {
        if (code === 0) {
          resolve();
        } else {
          reject(`${errorMessages.join('')}${EOL}${command} exited with code ${code}`);
        }
      }
    });
  });
  //return execa(command, args, { cwd: workspace });
}
