import { Environment } from './Environment';
import { Interpreter, Value } from './Interpreter';
import { LoxBaseCallable, LoxCallable } from './LoxCallable';
import { ReturnException } from './ReturnException';
import { Stmt } from './Stmt';

export class LoxFunction extends LoxBaseCallable implements LoxCallable {
	readonly declaration: Stmt.Function;
	readonly closure: Environment;

	constructor(declaration: Stmt.Function, closure: Environment) {
		super();
		this.declaration = declaration;
		this.closure = closure;
	}
	arity(): number {
		return this.declaration.params.length;
	}

	call(interpreter: Interpreter, args: Array<Value>): Value {
		const environment = new Environment(this.closure);

		for (let i = 0; i < this.declaration.params.length; i++) {
			environment.define(this.declaration.params[i].lexeme, args[i]);
		}
		try {
			interpreter.executeBlock(this.declaration.body, environment);
		} catch (returnValue) {
			if (returnValue instanceof ReturnException) {
				return returnValue.value;
			}
		}

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
