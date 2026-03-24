export default {
  paths: ['features/'],
  import: ['features/step-definitions/**/*.js', 'features/support/**/*.js'],
  format: ['progress-bar', 'html:reports/cucumber-report.html'],
};
