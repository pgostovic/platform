import fs from 'fs';
import path from 'path';
import shell from 'shelljs';

const {
  author,
  browser,
  dependencies,
  devDependencies,
  description,
  engines,
  keywords,
  license,
  main,
  name: packageName,
  repository,
  version,
} = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')).toString());

const distPkgJSON = {
  author,
  browser,
  dependencies,
  devDependencies,
  description,
  engines,
  keywords,
  license,
  main,
  name: packageName,
  repository,
  version,
};

fs.writeFileSync(path.resolve(__dirname, '../dist/package.json'), JSON.stringify(distPkgJSON, null, 2));

shell.cp(path.resolve(__dirname, '../package-lock.json'), path.resolve(__dirname, '../dist'));
