import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default [
  // UMD build for CDN
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/storytailor-embed.js',
      format: 'umd',
      name: 'StorytalorEmbed',
      sourcemap: true
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      postcss({
        extract: 'storytailor-embed.css',
        minimize: production,
        sourceMap: true
      }),
      production && terser()
    ].filter(Boolean)
  },
  
  // Minified UMD build for CDN
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/storytailor-embed.min.js',
      format: 'umd',
      name: 'StorytalorEmbed',
      sourcemap: true
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      postcss({
        extract: 'storytailor-embed.min.css',
        minimize: true,
        sourceMap: true
      }),
      terser()
    ]
  },
  
  // ES Module build for bundlers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/storytailor-embed.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      }),
      postcss({
        extract: false,
        inject: false,
        minimize: production
      }),
      production && terser()
    ].filter(Boolean),
    external: ['eventemitter3']
  },
  
  // CommonJS build for Node.js
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/storytailor-embed.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      resolve({ browser: false }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      postcss({
        extract: false,
        inject: false,
        minimize: production
      }),
      production && terser()
    ].filter(Boolean),
    external: ['eventemitter3']
  }
];