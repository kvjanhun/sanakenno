export default {
  paths: ['features/'],
  import: ['features/step-definitions/**/*.ts', 'features/support/**/*.ts'],
  requireModule: ['tsx'],
  format: ['progress-bar', 'html:reports/cucumber-report.html'],
  tags: 'not @e2e and not @docker and not @build',
  forceExit: true,
};
