require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'PreparedHaptics'
  s.version        = package['version']
  s.summary        = 'Prepared haptic feedback for rapid taps'
  s.homepage       = 'https://github.com/kvjanhun/sanakenno'
  s.license        = 'MIT'
  s.author         = 'Sanakenno'
  s.source         = { git: '' }
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.4'
  s.source_files   = '**/*.{swift,h,m}'

  s.dependency 'ExpoModulesCore'
end
