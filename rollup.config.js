import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { fileURLToPath } from 'node:url'
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [{
  // 入口文件
  input: 'src/Lox.ts',
  // 输出配置
  output: [
    {
      // 输出文件路径
      file: 'dist/src/Lox.cjs',
      // 输出格式为 CommonJS
      format: 'commonjs',
      // 生成 sourcemap 文件
      sourcemap: true
    },
    {
      // 输出文件路径
      file: 'dist/src/Lox.esm.js',
      // 输出格式为 ES 模块
      format: 'esm',
      // 生成 sourcemap 文件
      sourcemap: true
    }
  ],
  // 插件配置
  plugins: [
    // 处理 TypeScript 文件
    typescript({
      useTsconfigDeclarationDir: true,
      tsconfig: path.resolve(__dirname, './tsconfig.json'),
    }),
    // 解析第三方模块
    resolve(),
    // 将 CommonJS 模块转换为 ES6 模块
    commonjs()
  ]
},{
  input: 'tools/generateAST.ts',
  output: [
    {
      file: 'dist/tools/generateAST.cjs',
      format: 'commonjs',
      sourcemap: true,
    }
  ],
  // 插件配置
  plugins: [
    // 处理 TypeScript 文件
    typescript({
      useTsconfigDeclarationDir: true,
      tsconfig: path.resolve(__dirname, './tsconfig.json'),
    }),
    // 解析第三方模块
    resolve(),
    // 将 CommonJS 模块转换为 ES6 模块
    commonjs()
  ]
},{
  input: 'src/Expr.ts',
  output: [
    {
      file: 'dist/src/Expr.cjs',
      format: 'commonjs',
      sourcemap: true,
    }
  ],
  // 插件配置
  plugins: [
    // 处理 TypeScript 文件
    typescript({
      useTsconfigDeclarationDir: true,
      tsconfig: path.resolve(__dirname, './tsconfig.json'),
    }),
    // 解析第三方模块
    resolve(),
    // 将 CommonJS 模块转换为 ES6 模块
    commonjs()
  ]
}];    