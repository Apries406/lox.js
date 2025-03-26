import { Interpreter, Value } from './Interpreter';
import { Stmt } from './Stmt';

export abstract class LoxCallable {
	abstract readonly declaration: Stmt.Function;

	abstract arity(): number; // 期望参数长度
	abstract call(interpreter: Interpreter, args: Array<Value>): Value;
}
