import { Interpreter, Value } from './Interpreter';
import { Stmt } from './Stmt';

export interface LoxCallable {
	readonly declaration: Stmt.Function;

	arity(): number; // 期望参数长度
	call(interpreter: Interpreter, args: Array<Value>): Value;
}

export abstract class LoxBaseCallable {
	abstract arity(): number;
	abstract call(interpreter: Interpreter, args: Array<Value>): Value;
}
