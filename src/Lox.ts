#!/usr/bin/env node
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import { Scanner } from './Scanner';
import chalk from 'chalk';
import { Token } from './Token';
import { TokenType } from './TokenType';
import { Parser } from './Parser';
import { RuntimeError } from './RuntimeError';
import { Interpreter } from './Interpreter';
import { Stmt } from './Stmt';
export class Lox {
	static hadError: boolean = false;
	static hadRuntimeError: boolean = false;

	static readonly interpreter = new Interpreter();

	static main() {
		const args = process.argv.slice(2); // 真正的命令行参数是从第三个元素开始的。
		if (args.length > 1) {
			console.error(chalk.red('usage: node lox.js [script]'));
			process.exit(1);
		} else if (args.length === 1) {
			const lox = new Lox();
			lox.runFile(args[0]);
		} else {
			const lox = new Lox();
			lox.runPrompt();
		}
	}

	runFile(filePath: string) {
		fs.readFile(filePath, 'utf8', (error, data) => {
			if (error) {
				process.exit(-1);
			}
			this.run(data);
		});
	}
	runPrompt() {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.setPrompt('lox> ');
		rl.prompt();

		rl.on('line', (line) => {
			if (line === 'exit') {
				rl.close();
			} else {
				this.run(line, true);
				Lox.hadError = false; // 避免发生错误后退出
				rl.prompt();
			}
		});

		rl.on('close', () => {
			process.exit(0);
		});
	}

	run(source: string, isREPL: boolean = false) {
		if (Lox.hadError) {
			process.exit(65);
		}

		if (Lox.hadRuntimeError) {
			process.exit(70);
		}

		const scanner = new Scanner(source);
		const tokens = scanner.scanTokens();
		const parser = new Parser(tokens);
		const statements = parser.parse();

		if (Lox.hadError) return;

		if (isREPL && statements.length === 1 && statements[0] instanceof Stmt) {
			try {
				const res = Lox.interpreter.execute(statements[0]);
				console.log(res);
			} catch (error) {
				Lox.runtimeError(error);
			}
		} else {
			Lox.interpreter.interpret(statements);
		}
	}

	static error(line: number, message: string) {
		Lox.report(line, '', message);
	}

	static runtimeError(error: RuntimeError) {
		console.log(error.message + '\n[line:' + error.token.line + ']');
		Lox.hadRuntimeError = true;
	}

	static parseError(token: Token, message: string): void {
		if (token.type === TokenType.EOF) {
			Lox.report(token.line, 'at end', message);
		}

		Lox.report(token.line, 'at' + token.lexeme + ' ', message);
	}

	static report(line: number, where: string, message: string) {
		console.error(
			chalk.red(`[Error]: + line: ${line} Error ${where} : ${message} `)
		);
		Lox.hadError = true;
	}
}

Lox.main();
