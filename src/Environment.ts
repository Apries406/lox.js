import { Value } from './Interpreter';
import { RuntimeError } from './RuntimeError';
import { Token } from './Token';

export class Environment {
	readonly enclosing: Environment;
	private readonly values: Map<string, Value> = new Map();

	constructor(enclosing: Environment = null as unknown as Environment) {
		this.enclosing = enclosing as unknown as Environment;
	}

	define(name: string, value: Value) {
		this.values.set(name, value);
	}

	get(name: Token) {
		if (this.values.has(name.lexeme)) {
			return this.values.get(name.lexeme)!;
		}

		if (this.enclosing !== null) return this.enclosing.get(name);

		throw new RuntimeError(name, `Undefined variable '${name.lexeme}' .`);
	}

	assign(name: Token, value: Value) {
		// 赋值，不创建新变量
		if (this.values.has(name.lexeme)) {
			this.values.set(name.lexeme, value)!;
			return;
		}

		if (this.enclosing !== null) {
			this.enclosing.assign(name, value);
			return;
		}
		throw new RuntimeError(name, `Undefined variable '${name.lexeme}' .`);
	}
}
