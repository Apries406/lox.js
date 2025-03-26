import { Environment } from './Environment';
import { Interpreter, Value } from './Interpreter';
import { LoxCallable } from './LoxCallable';
import { Stmt } from './Stmt';

export class LoxFunction implements LoxCallable {
	readonly declaration: Stmt.Function;

	constructor(declaration: Stmt.Function) {
		this.declaration = declaration;
	}
	arity(): number {
		return this.declaration.params.length;
	}

	call(interpreter: Interpreter, args: Array<Value>): Value {
		const environment = new Environment(interpreter.globals);

		for (let i = 0; i < this.declaration.params.length; i++) {
			environment.define(this.declaration.params[i].lexeme, args[i]);
		}

		interpreter.executeBlock(this.declaration.body, environment);

		return null as Value;
	}

	toString(): string {
		return `<Function ${this.declaration.name?.lexeme}>`;
	}
}

export class ClockFunction extends LoxFunction {
	arity() {
		return 0;
	}

	call(interpreter: Interpreter, args: Array<Value>): Value {
		return new Date().getTime() / 1000;
	}

	toString(): string {
		return '<Native Func Clock>';
	}
}
