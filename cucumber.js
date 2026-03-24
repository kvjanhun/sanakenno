export default {
  paths: ['features/'],
  require: ['features/step-definitions/**/*.js', 'features/support/**/*.js'],
  format: ['progress-bar', 'html:reports/cucumber-report.html'],
  publishQuiet: true,
};
