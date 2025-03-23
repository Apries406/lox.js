#!/usr/bin/env node
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import { Scanner } from './Scanner';

export class Lox {
	static hadError: boolean = false;

	static main() {
		const args = process.argv.slice(2); // 真正的命令行参数是从第三个元素开始的。
		if (args.length > 1) {
			console.log('user: node lox.js [script]');
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
				console.log(`无法读取文件: ${error.message}`);
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
				this.run(line);
				Lox.hadError = false; // 避免发生错误后退出
				rl.prompt();
			}
		});

		rl.on('close', () => {
			console.log('退出');
			process.exit(0);
		});
	}

	run(source: string) {
		if (Lox.hadError) {
			process.exit(65);
		}
		const scanner = new Scanner(source);
		const tokens = scanner.scanTokens();

		for (const token of tokens) {
			console.log(token);
		}
	}

	static error(line: number, message: string): void {
		Lox.report(line, '', message);
	}

	static report(line: number, where: string, message: string) {
		console.log(`[ line: ${line} Error ${where} : ${message} ]`);
		Lox.hadError = true;
	}
}

Lox.main();
