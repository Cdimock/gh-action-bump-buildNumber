# gh-action-bump-buildNumber
A Github Action used to bump buildNumber in the package.json file

Note: you may need to add buildNumber to your package.json file before you can run this action

This Action bumps the buildNumber in package.json and pushes it back to the repo.
It is meant to be used on every successful merge to main but
you'll need to configured that workflow yourself. You can look to the
[`.github/workflows/push.yml`](./.github/workflows/push.yml) file in this project as an example.

This action was modified from https://github.com/phips28/gh-action-bump-version

**Attention**

Make sure you use the `actions/checkout@v2` action!

### Workflow

* Increment the buildNumber on successful pushes.
* Push the bumped buildNumber in package.json back into the repo.
* Push a tag for the new version back into the repo.

### Usage:


#### **wording:** 

#### **tag-prefix:**
Prefix that is used for the git tag  (optional). Example:
```yaml
- name:  'Automated Build Number Bump'
  uses:  'Cdimock/gh-action-bump-buildNumber@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag-prefix:  'v'
```

#### **skip-tag:**
The tag is not added to the git repository  (optional). Example:
```yaml
- name:  'Automated Build Number Bump'
  uses:  'Cdimock/gh-action-bump-buildNumber@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    skip-tag:  'true'
```

#### **skip-push:**
If true, skip pushing any commits or tags created after the version bump (optional). Example:
```yaml
- name:  'Automated Build Number Bump'
  uses:  'Cdimock/gh-action-bump-buildNumber@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    skip-push:  'true'
```

#### **PACKAGEJSON_DIR:**
Param to parse the location of the desired package.json (optional). Example:
```yaml
- name:  'Automated Build Number Bump'
  uses:  'Cdimock/gh-action-bump-buildNumber@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    PACKAGEJSON_DIR:  'frontend'
```

#### **TARGET-BRANCH:**
Set a custom target branch to use when bumping the version. Useful in cases such as updating the version on main after a tag has been set (optional). Example:
```yaml
- name:  'Automated Build Number Bump'
  uses:  'Cdimock/gh-action-bump-buildNumber@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    target-branch: 'main'
```

#### **commit-message:**
Set a custom commit message for version bump commit. Useful for skipping additional workflows run on push. Example:
```yaml
- name:  'Automated Build Number Bump'
  uses:  'Cdimock/gh-action-bump-buildNumber@main'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    commit-message: 'CI: bumps buildNumber to {{buildNumber}} [skip ci]'
```