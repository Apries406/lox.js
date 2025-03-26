import { Value } from './Interpreter';

export class ReturnException extends Error {
	value: Value;

	constructor(value: Value) {
		super();
		this.value = value;
	}
}
