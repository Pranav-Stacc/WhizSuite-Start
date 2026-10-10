// Jest (CommonJS) cannot require archiver@8 (ESM-only); media export is not exercised in e2e.
module.exports = function createArchive() {
  throw new Error('archiver is stubbed in e2e tests');
};
