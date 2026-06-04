if (process.env.VERBOSE !== 'true') {
  process.env.LOG_LEVEL = 'silent';
}

const isVerbose = process.env.VERBOSE === 'true';

export default {
  paths: ['features/'],
  import: ['features/step-definitions/**/*.ts', 'features/support/**/*.ts'],
  requireModule: ['tsx'],
  format: [
    isVerbose ? 'progress-bar' : 'summary',
    'html:reports/cucumber-report.html',
  ],
  tags: 'not @e2e and not @docker and not @build and not @ios',
  forceExit: true,
};
