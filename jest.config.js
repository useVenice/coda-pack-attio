/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  transform: {
    '^.+\\.(js|ts|tsx)$': [
      'esbuild-jest',
      {
        sourcemap: true,
        target: 'node14',
        format: 'cjs',
      },
    ],
  },
}
